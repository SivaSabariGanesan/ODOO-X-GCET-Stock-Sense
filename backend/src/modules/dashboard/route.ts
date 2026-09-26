import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { DashboardService } from "./service.js";
import {
  dashboardStockQuerySchema,
  dashboardLowStockQuerySchema,
  dashboardMovementsQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const dashboardRouter = new Hono();

// Protect all dashboard endpoints with authMiddleware
dashboardRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/dashboard/summary - High-Level Domain & Stock Metrics
// ---------------------------------------------------------------------------
dashboardRouter.get("/summary", async (c) => {
  const summary = await DashboardService.getSummary();
  return c.json({ data: summary }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/stock - Current Stock Breakdown & Pagination
// ---------------------------------------------------------------------------
dashboardRouter.get("/stock", async (c) => {
  const query = c.req.query();
  const parseResult = dashboardStockQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await DashboardService.getStock(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/low-stock - Products Below Reordering Rules
// ---------------------------------------------------------------------------
dashboardRouter.get("/low-stock", async (c) => {
  const query = c.req.query();
  const parseResult = dashboardLowStockQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await DashboardService.getLowStock(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/movements - Recent Movement History
// ---------------------------------------------------------------------------
dashboardRouter.get("/movements", async (c) => {
  const query = c.req.query();
  const parseResult = dashboardMovementsQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await DashboardService.getMovements(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/warehouses - Warehouse Level Breakdown & Aggregates
// ---------------------------------------------------------------------------
dashboardRouter.get("/warehouses", async (c) => {
  const warehousesSummary = await DashboardService.getWarehouses();
  return c.json({ data: warehousesSummary }, 200);
});

// ---------------------------------------------------------------------------
// Read-Only Protection: Reject Mutation Requests
// ---------------------------------------------------------------------------
dashboardRouter.post("*", () => {
  throw new AppError("Dashboard endpoints are strictly read-only", 405);
});

dashboardRouter.put("*", () => {
  throw new AppError("Dashboard endpoints are strictly read-only", 405);
});

dashboardRouter.patch("*", () => {
  throw new AppError("Dashboard endpoints are strictly read-only", 405);
});

dashboardRouter.delete("*", () => {
  throw new AppError("Dashboard endpoints are strictly read-only", 405);
});

export default dashboardRouter;
