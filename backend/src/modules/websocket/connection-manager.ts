import { SafeUser } from "../auth/types";
import { EventEnvelope, WsConnectionData } from "./types";

interface ConnectionEntry {
  ws: any;
  data: WsConnectionData;
}

export class ConnectionManager {
  private static connections = new Map<string, ConnectionEntry>();

  /**
   * Registers a newly authenticated WebSocket connection.
   * Auto-subscribes client to default channels ('all', 'inventory', 'dashboard', 'user:<id>', 'role:<role>').
   */
  static addConnection(connectionId: string, ws: any, user: SafeUser): WsConnectionData {
    const defaultChannels = new Set<string>([
      "all",
      "inventory",
      "dashboard",
      `user:${user.id}`,
      `role:${user.role}`,
    ]);

    const data: WsConnectionData = {
      connectionId,
      user,
      connectedAt: new Date(),
      channels: defaultChannels,
    };

    ConnectionManager.connections.set(connectionId, { ws, data });
    return data;
  }

  /**
   * Unregisters a disconnected socket and cleans up subscription registries.
   */
  static removeConnection(connectionId: string): void {
    ConnectionManager.connections.delete(connectionId);
  }

  /**
   * Authorizes and subscribes a connection to a specific channel/room.
   * Enforces role checks for restricted channels (e.g. 'admin' channels).
   */
  static subscribe(connectionId: string, channel: string, userRole: string): boolean {
    const entry = ConnectionManager.connections.get(connectionId);
    if (!entry) return false;

    const trimmedChannel = channel.trim().toLowerCase();

    // Role-based subscription authorization checks
    if (trimmedChannel.startsWith("admin") && !["admin", "manager"].includes(userRole)) {
      return false;
    }

    entry.data.channels.add(trimmedChannel);
    return true;
  }

  /**
   * Unsubscribes a connection from a channel/room.
   */
  static unsubscribe(connectionId: string, channel: string): void {
    const entry = ConnectionManager.connections.get(connectionId);
    if (!entry) return;

    const trimmedChannel = channel.trim().toLowerCase();
    entry.data.channels.delete(trimmedChannel);
  }

  /**
   * Broadcasts an event envelope to all connected clients or filtered clients.
   * Safely handles dead sockets without throwing errors.
   */
  static broadcast(
    event: EventEnvelope,
    filterFn?: (connData: WsConnectionData) => boolean
  ): number {
    const payload = JSON.stringify(event);
    let count = 0;

    for (const [connectionId, entry] of ConnectionManager.connections.entries()) {
      if (filterFn && !filterFn(entry.data)) {
        continue;
      }

      try {
        if (entry.ws && typeof entry.ws.send === "function") {
          entry.ws.send(payload);
          count++;
        }
      } catch (err) {
        console.error(`[WebSocket] Failed to send to connection '${connectionId}':`, err);
        // Clean up broken connection
        ConnectionManager.connections.delete(connectionId);
      }
    }

    return count;
  }

  /**
   * Sends event envelope to clients subscribed to a specific channel/room.
   */
  static sendToChannel(channel: string, event: EventEnvelope): number {
    const targetChannel = channel.trim().toLowerCase();
    return ConnectionManager.broadcast(event, (data) =>
      data.channels.has(targetChannel)
    );
  }

  /**
   * Sends event envelope to a specific user by user ID.
   */
  static sendToUser(userId: string, event: EventEnvelope): number {
    return ConnectionManager.sendToChannel(`user:${userId}`, event);
  }

  /**
   * Sends event envelope to users belonging to a specific role.
   */
  static sendToRole(role: string, event: EventEnvelope): number {
    return ConnectionManager.sendToChannel(`role:${role}`, event);
  }

  /**
   * Returns count of currently active WebSocket connections.
   */
  static getActiveConnectionsCount(): number {
    return ConnectionManager.connections.size;
  }

  /**
   * Returns metadata snapshot of all active connections.
   */
  static getConnectionsInfo(): Array<{
    connectionId: string;
    userId: string;
    userRole: string;
    channels: string[];
  }> {
    const list: Array<{
      connectionId: string;
      userId: string;
      userRole: string;
      channels: string[];
    }> = [];

    for (const [connectionId, entry] of ConnectionManager.connections.entries()) {
      list.push({
        connectionId,
        userId: entry.data.user.id,
        userRole: entry.data.user.role,
        channels: Array.from(entry.data.channels),
      });
    }

    return list;
  }

  /**
   * Emergency/testing cleanup helper.
   */
  static removeAll(): void {
    ConnectionManager.connections.clear();
  }
}
