import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "../app/config";
import authRouter from "../modules/auth/route";
import { AppError } from "../lib/errors";

const app = new Hono();

// ---------------------------------------------------------------------------
// Global Middlewares
// ---------------------------------------------------------------------------
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// ---------------------------------------------------------------------------
// Health Check Route
// ---------------------------------------------------------------------------
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "StockSense API",
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API Route Modules
// ---------------------------------------------------------------------------
app.route("/api/auth", authRouter);

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        details: err.details ?? undefined,
      },
      err.statusCode as any
    );
  }

  console.error("Unhandled Server Error:", err);
  return c.json(
    {
      error: "Internal Server Error",
    },
    500
  );
});

// Export app for testing and server instantiation
export { app };
export default app;
