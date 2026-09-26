import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth";
import { ReceiptCoreService } from "./service";
import {
  createReceiptSchema,
  updateReceiptSchema,
  listReceiptsQuerySchema,
  createReceiptItemSchema,
  updateReceiptItemSchema,
} from "./schema";
import { AppError } from "../../lib/errors";

const receiptsRouter = new Hono();

// Apply auth middleware to all receipt endpoints
receiptsRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/receipts - Create Receipt
// ---------------------------------------------------------------------------
receiptsRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createReceiptSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const receipt = await ReceiptCoreService.createReceipt(parseResult.data, user.id);
  return c.json({ data: receipt }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/receipts - List Receipts
// ---------------------------------------------------------------------------
receiptsRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listReceiptsQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await ReceiptCoreService.listReceipts(parseResult.data);
  return c.json({ data: result.data, meta: result.pagination, pagination: result.pagination }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/receipts/:id - Get Receipt by ID
// ---------------------------------------------------------------------------
receiptsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const receipt = await ReceiptCoreService.getReceipt(id);
  return c.json({ data: receipt }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/receipts/:id - Update Receipt Header
// ---------------------------------------------------------------------------
receiptsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateReceiptSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const receipt = await ReceiptCoreService.updateReceipt(id, parseResult.data);
  return c.json({ data: receipt }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/receipts/:id/cancel - Cancel Receipt
// ---------------------------------------------------------------------------
receiptsRouter.post("/:id/cancel", async (c) => {
  const id = c.req.param("id");
  const receipt = await ReceiptCoreService.cancelReceipt(id);
  return c.json({ data: receipt, message: "Receipt cancelled successfully" }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/receipts/:id/validate - Validate Receipt Document
// ---------------------------------------------------------------------------
receiptsRouter.post("/:id/validate", async (c) => {
  const id = c.req.param("id");
  const validationResult = await ReceiptCoreService.validateReceipt(id);
  return c.json({ data: validationResult }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/receipts/:id/items - Add Item to Receipt
// ---------------------------------------------------------------------------
receiptsRouter.post("/:id/items", async (c) => {
  const receiptId = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createReceiptItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await ReceiptCoreService.addReceiptItem(receiptId, parseResult.data);
  return c.json({ data: item }, 201);
});

// ---------------------------------------------------------------------------
// PATCH /api/receipts/:id/items/:itemId - Update Receipt Item
// ---------------------------------------------------------------------------
receiptsRouter.patch("/:id/items/:itemId", async (c) => {
  const receiptId = c.req.param("id");
  const itemId = c.req.param("itemId");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateReceiptItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await ReceiptCoreService.updateReceiptItem(receiptId, itemId, parseResult.data);
  return c.json({ data: item }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/receipts/:id/items/:itemId - Remove Receipt Item
// ---------------------------------------------------------------------------
receiptsRouter.delete("/:id/items/:itemId", async (c) => {
  const receiptId = c.req.param("id");
  const itemId = c.req.param("itemId");

  const result = await ReceiptCoreService.removeReceiptItem(receiptId, itemId);
  return c.json(result, 200);
});

export default receiptsRouter;
