import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { StockBalanceService } from "./service.js";
import {
  stockMutationSchema,
  listBalancesQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const stockBalancesRouter = new Hono();

// Protect all Stock Balance endpoints with authMiddleware
stockBalancesRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/stock-balances - List Stock Balances
// ---------------------------------------------------------------------------
stockBalancesRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listBalancesQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await StockBalanceService.listBalances(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/stock-balances/check - Query balance for specific product & location
// ---------------------------------------------------------------------------
stockBalancesRouter.get("/check", async (c) => {
  const productId = c.req.query("productId");
  const locationId = c.req.query("locationId");

  if (!productId || !locationId) {
    throw new AppError("Both productId and locationId query parameters are required", 400);
  }

  const balance = await StockBalanceService.getBalance(productId, locationId);
  return c.json({ data: balance }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/stock-balances/product/:productId - Aggregated product stock across locations
// ---------------------------------------------------------------------------
stockBalancesRouter.get("/product/:productId", async (c) => {
  const productId = c.req.param("productId");
  const result = await StockBalanceService.getProductStock(productId);
  return c.json({ data: result }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/stock-balances/location/:locationId - All product stock at location
// ---------------------------------------------------------------------------
stockBalancesRouter.get("/location/:locationId", async (c) => {
  const locationId = c.req.param("locationId");
  const result = await StockBalanceService.getLocationStock(locationId);
  return c.json({ data: result }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/stock-balances/:id - Get Stock Balance Details by ID
// ---------------------------------------------------------------------------
stockBalancesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const balance = await StockBalanceService.getBalanceById(id);
  return c.json({ data: balance }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/stock-balances/increase - Internal/Service Stock Increase
// ---------------------------------------------------------------------------
stockBalancesRouter.post("/increase", async (c) => {
  const body = await c.req.json();
  const parseResult = stockMutationSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid stock mutation input", 400, parseResult.error.flatten());
  }

  const updated = await StockBalanceService.increaseStock(parseResult.data);
  return c.json({ data: updated }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/stock-balances/decrease - Internal/Service Stock Decrease
// ---------------------------------------------------------------------------
stockBalancesRouter.post("/decrease", async (c) => {
  const body = await c.req.json();
  const parseResult = stockMutationSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid stock mutation input", 400, parseResult.error.flatten());
  }

  const updated = await StockBalanceService.decreaseStock(parseResult.data);
  return c.json({ data: updated }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/stock-balances/set - Absolute Stock Setting
// ---------------------------------------------------------------------------
stockBalancesRouter.post("/set", async (c) => {
  const body = await c.req.json();
  const parseResult = stockMutationSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid stock mutation input", 400, parseResult.error.flatten());
  }

  const updated = await StockBalanceService.setStock(parseResult.data);
  return c.json({ data: updated }, 200);
});

export default stockBalancesRouter;
