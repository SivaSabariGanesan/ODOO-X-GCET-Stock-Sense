import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { TransferService } from "./service.js";
import {
  createInternalTransferSchema,
  updateInternalTransferSchema,
  listInternalTransfersQuerySchema,
  createInternalTransferItemSchema,
  updateInternalTransferItemSchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const transfersRouter = new Hono();

// Protect all internal transfer endpoints with authMiddleware
transfersRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/transfers - Create Internal Transfer
// ---------------------------------------------------------------------------
transfersRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createInternalTransferSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const transfer = await TransferService.createTransfer(
    parseResult.data,
    user.id
  );
  return c.json({ data: transfer }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/transfers - List Internal Transfers
// ---------------------------------------------------------------------------
transfersRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listInternalTransfersQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await TransferService.listTransfers(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/transfers/:id - Get Internal Transfer by ID
// ---------------------------------------------------------------------------
transfersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const transfer = await TransferService.getTransfer(id);
  return c.json({ data: transfer }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/transfers/:id - Update Internal Transfer Header
// ---------------------------------------------------------------------------
transfersRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateInternalTransferSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const transfer = await TransferService.updateTransfer(id, parseResult.data);
  return c.json({ data: transfer }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/transfers/:id/cancel - Cancel Internal Transfer
// ---------------------------------------------------------------------------
transfersRouter.post("/:id/cancel", async (c) => {
  const id = c.req.param("id");
  const transfer = await TransferService.cancelTransfer(id);
  return c.json({ data: transfer, message: "Internal transfer cancelled successfully" }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/transfers/:id/validate - Validate Internal Transfer Document
// ---------------------------------------------------------------------------
transfersRouter.post("/:id/validate", async (c) => {
  const id = c.req.param("id");
  const validationResult = await TransferService.validateTransfer(id);
  return c.json({ data: validationResult }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/transfers/:id/process - Process Internal Transfer (Mutates Inventory)
// ---------------------------------------------------------------------------
transfersRouter.post("/:id/process", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const transfer = await TransferService.processTransfer(id, user.id);
  return c.json(
    { data: transfer, message: "Internal transfer processed successfully and stock moved" },
    200
  );
});

// ---------------------------------------------------------------------------
// POST /api/transfers/:id/items - Add Transfer Item
// ---------------------------------------------------------------------------
transfersRouter.post("/:id/items", async (c) => {
  const transferId = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createInternalTransferItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await TransferService.addTransferItem(
    transferId,
    parseResult.data
  );
  return c.json({ data: item }, 201);
});

// ---------------------------------------------------------------------------
// PATCH /api/transfers/:id/items/:itemId - Update Transfer Item
// ---------------------------------------------------------------------------
transfersRouter.patch("/:id/items/:itemId", async (c) => {
  const transferId = c.req.param("id");
  const itemId = c.req.param("itemId");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateInternalTransferItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await TransferService.updateTransferItem(
    transferId,
    itemId,
    parseResult.data
  );
  return c.json({ data: item }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/transfers/:id/items/:itemId - Remove Transfer Item
// ---------------------------------------------------------------------------
transfersRouter.delete("/:id/items/:itemId", async (c) => {
  const transferId = c.req.param("id");
  const itemId = c.req.param("itemId");

  const result = await TransferService.removeTransferItem(
    transferId,
    itemId
  );
  return c.json(result, 200);
});

export default transfersRouter;
