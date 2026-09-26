import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { StockLedgerService } from "./service.js";
import { listStockMovementsQuerySchema, recordMovementSchema } from "./schema.js";
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
// POST /api/stock-movements - Record New Immutable Stock Movement
// ---------------------------------------------------------------------------
stockMovementsRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parseResult = recordMovementSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid stock movement input data", 400, parseResult.error.flatten());
  }

  const input = {
    ...parseResult.data,
    createdBy: parseResult.data.createdBy ?? user?.id,
  };

  const movement = await StockLedgerService.recordMovement(input);
  return c.json({ data: movement }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/stock-movements/reference/:referenceType/:referenceId - Get Movements by Reference
// ---------------------------------------------------------------------------
stockMovementsRouter.get("/reference/:referenceType/:referenceId", async (c) => {
  const referenceType = c.req.param("referenceType") as any;
  const referenceId = c.req.param("referenceId");

  const movements = await StockLedgerService.getMovementsByReference(referenceType, referenceId);
  return c.json({ data: movements }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/stock-movements/:id - Get Stock Movement Details by ID
// ---------------------------------------------------------------------------
stockMovementsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const movement = await StockLedgerService.getMovementById(id);
  return c.json({ data: movement }, 200);
});

// ---------------------------------------------------------------------------
// Immutability Protection: Reject Modification / Deletion Attempts
// ---------------------------------------------------------------------------
stockMovementsRouter.put("*", () => {
  throw new AppError("Stock ledger records are immutable and cannot be updated", 405);
});

stockMovementsRouter.patch("*", () => {
  throw new AppError("Stock ledger records are immutable and cannot be updated", 405);
});

stockMovementsRouter.delete("*", () => {
  throw new AppError("Stock ledger records are immutable and cannot be deleted", 405);
});

export default stockMovementsRouter;
