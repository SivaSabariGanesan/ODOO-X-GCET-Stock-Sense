import { Context, Hono } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { config } from "../../app/config";
import { AuthService } from "../auth/service";
import { JWTPayload, SafeUser } from "../auth/types";
import { ConnectionManager } from "./connection-manager";
import { EventBus } from "./event-bus";
import { ClientMessage } from "./types";
import { UnauthorizedError } from "../../lib/errors";

const websocketRouter = new Hono();

/**
 * Helper to authenticate WebSocket connection requests from query param, headers, or cookies.
 */
export async function authenticateWsRequest(c: Context): Promise<SafeUser> {
  let token: string | undefined;

  // 1. Check query parameter ?token=
  const queryToken = c.req.query("token");
  if (queryToken) {
    token = queryToken.trim();
  }

  // 2. Check Authorization header
  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // 3. Check Sec-WebSocket-Protocol header
  if (!token) {
    const protocolHeader = c.req.header("Sec-WebSocket-Protocol");
    if (protocolHeader) {
      const parts = protocolHeader.split(",").map((p) => p.trim());
      const bearerPart = parts.find((p) => p.startsWith("token."));
      if (bearerPart) {
        token = bearerPart.substring(6).trim();
      }
    }
  }

  // 4. Check cookie fallback
  if (!token) {
    token = getCookie(c, config.jwt.cookieName);
  }

  if (!token) {
    throw new UnauthorizedError("WebSocket authentication required");
  }

  try {
    const verified = await verify(token, config.jwt.secret);
    const payload = verified as unknown as JWTPayload;

    if (!payload || !payload.id) {
      throw new UnauthorizedError("Invalid WebSocket authentication payload");
    }

    const user = await AuthService.getCurrentUser(payload.id);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User account inactive or missing");
    }

    return user;
  } catch (err: any) {
    throw new UnauthorizedError(err.message || "WebSocket authentication failed");
  }
}

/**
 * Central connection handler for WebSocket lifecycle events (open, message, close, error).
 */
export function handleWsLifecycle(ws: any, user: SafeUser, connectionId: string) {
  // Register connection in ConnectionManager
  ConnectionManager.addConnection(connectionId, ws, user);

  // Send welcoming notification to client
  try {
    const welcomeEvent = EventBus.publish(
      "system.notification",
      {
        connectionId,
        status: "connected",
        message: "Successfully authenticated and connected to StockSense WebSocket server",
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      },
      { userId: user.id }
    );
  } catch (err) {
    console.error(`[WebSocket] Error sending welcome notification:`, err);
  }

  return {
    onMessage: (messageRaw: any) => {
      try {
        const rawStr = typeof messageRaw === "string" ? messageRaw : messageRaw.toString();

        // Enforce maximum payload size guard (64KB)
        if (rawStr.length > 65536) {
          console.warn(`[WebSocket] Rejected oversized message from '${connectionId}'`);
          return;
        }

        const parsed = JSON.parse(rawStr) as ClientMessage;

        if (parsed.type === "ping") {
          ws.send(
            JSON.stringify({
              type: "system.notification",
              eventId: `evt_pong_${Date.now()}`,
              timestamp: new Date().toISOString(),
              data: { action: "pong", timestamp: new Date().toISOString() },
            })
          );
          return;
        }

        if (parsed.type === "subscribe" && parsed.channel) {
          const success = ConnectionManager.subscribe(connectionId, parsed.channel, user.role);
          ws.send(
            JSON.stringify({
              type: "system.notification",
              eventId: `evt_sub_${Date.now()}`,
              timestamp: new Date().toISOString(),
              data: {
                action: "subscribe",
                channel: parsed.channel,
                success,
                message: success
                  ? `Subscribed to channel '${parsed.channel}'`
                  : `Access denied: insufficient permissions to subscribe to channel '${parsed.channel}'`,
              },
            })
          );
          return;
        }

        if (parsed.type === "unsubscribe" && parsed.channel) {
          ConnectionManager.unsubscribe(connectionId, parsed.channel);
          ws.send(
            JSON.stringify({
              type: "system.notification",
              eventId: `evt_unsub_${Date.now()}`,
              timestamp: new Date().toISOString(),
              data: {
                action: "unsubscribe",
                channel: parsed.channel,
                success: true,
              },
            })
          );
          return;
        }

        // Clients are prohibited from publishing raw inventory events directly
        ws.send(
          JSON.stringify({
            type: "system.notification",
            eventId: `evt_err_${Date.now()}`,
            timestamp: new Date().toISOString(),
            data: {
              error: "Client publishing prohibited",
              message: "Clients cannot broadcast inventory state events directly. Inventory state updates must be triggered via authoritative REST processing endpoints.",
            },
          })
        );
      } catch (err) {
        // Invalid JSON or message structure
        try {
          ws.send(
            JSON.stringify({
              type: "system.notification",
              eventId: `evt_err_${Date.now()}`,
              timestamp: new Date().toISOString(),
              data: { error: "Invalid JSON format or message structure" },
            })
          );
        } catch (_) {}
      }
    },
    onClose: () => {
      ConnectionManager.removeConnection(connectionId);
    },
    onError: (err: any) => {
      console.error(`[WebSocket] Connection error on '${connectionId}':`, err);
      ConnectionManager.removeConnection(connectionId);
    },
  };
}

// ---------------------------------------------------------------------------
// GET /ws - WebSocket Upgrade & Connection Endpoint
// ---------------------------------------------------------------------------
websocketRouter.get("/", async (c) => {
  const user = await authenticateWsRequest(c);
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Attempt Bun native server upgrade if available
  const server = (c.env as any)?.server ?? (globalThis as any).server;
  if (server && typeof server.upgrade === "function") {
    const success = server.upgrade(c.req.raw, {
      data: {
        connectionId,
        user,
      },
    });

    if (success) {
      return undefined as any;
    }
  }

  // Fallback for non-upgrade HTTP handshake response
  return c.json(
    {
      service: "StockSense Real-Time WebSocket API",
      endpoint: "/ws",
      status: "active",
      connectionId,
      authenticatedUser: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      message: "Please upgrade request to WebSocket protocol using 'ws://' or 'wss://'",
    },
    200
  );
});

export default websocketRouter;
