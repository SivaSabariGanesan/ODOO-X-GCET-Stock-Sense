import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { swaggerUI } from "@hono/swagger-ui";
import { config, validateConfig } from "../app/config";
import { openApiSpec } from "../app/config/swagger";
import { queryClient, sql } from "../db/client";
import authRouter from "../modules/auth/route";
import receiptsRouter from "../modules/receipts/route";
import deliveriesRouter from "../modules/deliveries/route";
import transfersRouter from "../modules/transfers/route";
import adjustmentsRouter from "../modules/adjustments/route";
import stockMovementsRouter from "../modules/stock-movements/route";
import productsRouter from "../modules/products/route";
import categoriesRouter from "../modules/categories/route";
import uomsRouter from "../modules/uoms/route";
import warehousesRouter from "../modules/warehouses/route";
import locationsRouter from "../modules/locations/route";
import reorderingRulesRouter from "../modules/reordering-rules/route";
import stockBalancesRouter from "../modules/stock-balances/route";
import dashboardRouter from "../modules/dashboard/route";
import websocketRouter from "../modules/websocket/route";
import { StockLedgerService } from "../modules/stock-movements/service";
import { listStockMovementsQuerySchema } from "../modules/stock-movements/schema";
import { authMiddleware } from "../app/middleware/auth";
import { AppError } from "../lib/errors";
import { aiRouter } from "../modules/ai/route";

// ---------------------------------------------------------------------------
// Startup Configuration Validation
// ---------------------------------------------------------------------------
validateConfig();

const app = new Hono();

// ---------------------------------------------------------------------------
// 1. Request Correlation & Request ID Middleware
// ---------------------------------------------------------------------------
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});

// ---------------------------------------------------------------------------
// 2. Structured Logging Middleware
// ---------------------------------------------------------------------------
app.use("*", logger());

// ---------------------------------------------------------------------------
// 3. Security Headers Middleware
// ---------------------------------------------------------------------------
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-XSS-Protection", "1; mode=block");
  if (config.env === "production") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  await next();
});

import {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  payloadTooLargeTotal,
  authorizationFailuresTotal,
} from "../lib/metrics";

// Helper function to normalize path parameters for low-cardinality route labels
function normalizeRoute(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+/g, "/:id");
}

// ---------------------------------------------------------------------------
// 4. Prometheus HTTP Metrics Middleware
// ---------------------------------------------------------------------------
app.use("*", async (c, next) => {
  if (c.req.path === "/metrics") {
    await next();
    return;
  }
  const start = Date.now();
  await next();
  const duration = (Date.now() - start) / 1000;
  const method = c.req.method;
  const route = normalizeRoute(c.req.path);
  const status = String(c.res.status);

  try {
    httpRequestsTotal.inc({ method, route, status });
    httpRequestDurationSeconds.observe({ method, route, status }, duration);
  } catch {}
});

// ---------------------------------------------------------------------------
// 5. GET /metrics - Expose Prometheus Metrics Endpoint
// ---------------------------------------------------------------------------
app.get("/metrics", async (c) => {
  try {
    const metrics = await register.metrics();
    return c.text(metrics, 200, { "Content-Type": register.contentType });
  } catch (err) {
    return c.text("Error generating metrics", 500);
  }
});

// ---------------------------------------------------------------------------
// 6. Request Body Size Limit Safeguard (Max 10MB)
// ---------------------------------------------------------------------------
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
    payloadTooLargeTotal.inc();
    throw new AppError("Payload Too Large: Request body exceeds maximum limit of 10MB", 413);
  }
  await next();
});

// ---------------------------------------------------------------------------
// 5. CORS Middleware (Production & Development Origins)
// ---------------------------------------------------------------------------
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...config.app.allowedOrigins, config.app.frontendUrl]));

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (allowedOrigins.includes(origin)) return origin;
      if (config.env === "development") return origin;
      return null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
  })
);

// ---------------------------------------------------------------------------
// 4. Production Health & Readiness Endpoints
// ---------------------------------------------------------------------------

/**
 * Liveness Endpoint: Checks if the application process is running.
 */
app.get("/health", (c) => {
  return c.json({ status: "ok" }, 200);
});

/**
 * Readiness Endpoint: Verifies database connectivity before routing traffic.
 */
app.get("/ready", async (c) => {
  try {
    // Fast database ping query
    await queryClient`SELECT 1`;
    return c.json({ status: "ready" }, 200);
  } catch (error) {
    const isProd = config.env === "production";
    console.error("Readiness check failed - DB ping error:", isProd ? "Database unreachable" : error);
    return c.json(
      {
        status: "unhealthy",
        error: "Database service unavailable",
      },
      503
    );
  }
});

// ---------------------------------------------------------------------------
// 5. Swagger OpenAPI Documentation UI Endpoints
// ---------------------------------------------------------------------------
app.get("/swagger.json", (c) => c.json(openApiSpec));
app.get("/docs", swaggerUI({ url: "/swagger.json" }));
app.get("/ui", swaggerUI({ url: "/swagger.json" }));

// ---------------------------------------------------------------------------
// 6. API Route Modules Registration
// ---------------------------------------------------------------------------
app.route("/api/auth", authRouter);
app.route("/api/products", productsRouter);
app.route("/api/receipts", receiptsRouter);
app.route("/api/deliveries", deliveriesRouter);
app.route("/api/transfers", transfersRouter);
app.route("/api/adjustments", adjustmentsRouter);
app.route("/api/stock-movements", stockMovementsRouter);
app.route("/api/categories", categoriesRouter);
app.route("/api/uoms", uomsRouter);
app.route("/api/warehouses", warehousesRouter);
app.route("/api/locations", locationsRouter);
app.route("/api/reordering-rules", reorderingRulesRouter);
app.route("/api/stock-balances", stockBalancesRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/ai", aiRouter);
app.route("/ws", websocketRouter);

// Convenience product-specific and location-specific stock history endpoints
app.get("/api/products/:productId/stock-movements", authMiddleware, async (c) => {
  const productId = c.req.param("productId");
  const query = c.req.query();
  const parseResult = listStockMovementsQuerySchema.safeParse({ ...query, productId });
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }
  const result = await StockLedgerService.listMovements(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

app.get("/api/locations/:locationId/stock-movements", authMiddleware, async (c) => {
  const locationId = c.req.param("locationId");
  const query = c.req.query();
  const parseResult = listStockMovementsQuerySchema.safeParse({ ...query, locationId });
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }
  const result = await StockLedgerService.listMovements(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// 7. Central Error Handler (Production Safe)
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        details: err.details ?? undefined,
        requestId,
      },
      err.statusCode as any
    );
  }

  // Log full error internally
  console.error(`[${requestId}] Unhandled Server Error:`, err);

  const isProd = config.env === "production";
  return c.json(
    {
      error: "Internal Server Error",
      requestId,
      ...(isProd ? {} : { details: err.message }),
    },
    500
  );
});

import { handleWsLifecycle } from "../modules/websocket/route.js";

// ---------------------------------------------------------------------------
// 8. Bun Native Server Configuration with WebSocket Upgrade Support
// ---------------------------------------------------------------------------
const origFetch = app.fetch.bind(app);

(app as any).port = config.port;
(app as any).fetch = (req: Request, server: any) => {
  if (server) {
    (globalThis as any).server = server;
  }
  return origFetch(req, { server });
};
(app as any).websocket = {
  open(ws: any) {
    const { user, connectionId } = ws.data ?? {};
    if (user && connectionId) {
      ws.handlers = handleWsLifecycle(ws, user, connectionId);
    }
  },
  message(ws: any, message: any) {
    ws.handlers?.onMessage?.(message);
  },
  close(ws: any) {
    ws.handlers?.onClose?.();
  },
  error(ws: any, error: any) {
    ws.handlers?.onError?.(error);
  },
};

// ---------------------------------------------------------------------------
// 9. Graceful Process Shutdown Handler (SIGINT & SIGTERM)
// ---------------------------------------------------------------------------
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);

  try {
    console.log("Closing database connection pool...");
    await queryClient.end({ timeout: 5 });
    console.log("Database connection pool closed successfully.");
  } catch (err) {
    console.error("Error closing database connection pool:", err);
  }

  console.log("Graceful shutdown complete. Exiting process.");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Export app for testing and server instantiation
export { app };
export default app;
