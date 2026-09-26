import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { StockLedgerService } from "./service.js";
import { listStockMovementsQuerySchema } from "./schema.js";
import { AppError } from "../../lib/errors.js";

const stockMovementsRouter = new Hono();

// Protect all stock movement endpoints with authMiddleware
stockMovementsRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/stock-movements - List Stock Movements (Ledger History)
// ---------------------------------------------------------------------------
stockMovementsRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listStockMovementsQuerySchema.safeParse(query);
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
// GET /api/stock-movements/:id - Get Stock Movement Details by ID
// ---------------------------------------------------------------------------
stockMovementsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const movement = await StockLedgerService.getMovementById(id);
  return c.json({ data: movement }, 200);
});

export default stockMovementsRouter;
