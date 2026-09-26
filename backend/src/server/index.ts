import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { swaggerUI } from "@hono/swagger-ui";
import { config } from "../app/config";
import { openApiSpec } from "../app/config/swagger";
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
import { StockLedgerService } from "../modules/stock-movements/service";
import { listStockMovementsQuerySchema } from "../modules/stock-movements/schema";
import { authMiddleware } from "../app/middleware/auth";
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
// Swagger OpenAPI Documentation UI Endpoints
// ---------------------------------------------------------------------------
app.get("/swagger.json", (c) => c.json(openApiSpec));
app.get("/docs", swaggerUI({ url: "/swagger.json" }));
app.get("/ui", swaggerUI({ url: "/swagger.json" }));

// ---------------------------------------------------------------------------
// API Route Modules
// ---------------------------------------------------------------------------
app.route("/api/auth", authRouter);
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

app.route("/api/products", productsRouter);



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
