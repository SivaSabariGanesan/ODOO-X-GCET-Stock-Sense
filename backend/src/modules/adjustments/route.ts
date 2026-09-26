import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { AdjustmentService } from "./service.js";
import {
  createInventoryAdjustmentSchema,
  updateInventoryAdjustmentSchema,
  listInventoryAdjustmentsQuerySchema,
  createInventoryAdjustmentItemSchema,
  updateInventoryAdjustmentItemSchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const adjustmentsRouter = new Hono();

// Protect all inventory adjustment endpoints with authMiddleware
adjustmentsRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/adjustments - Create Inventory Adjustment
// ---------------------------------------------------------------------------
adjustmentsRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createInventoryAdjustmentSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const adjustment = await AdjustmentService.createAdjustment(
    parseResult.data,
    user.id
  );
  return c.json({ data: adjustment }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/adjustments - List Inventory Adjustments
// ---------------------------------------------------------------------------
adjustmentsRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listInventoryAdjustmentsQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await AdjustmentService.listAdjustments(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/adjustments/:id - Get Inventory Adjustment by ID
// ---------------------------------------------------------------------------
adjustmentsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const adjustment = await AdjustmentService.getAdjustment(id);
  return c.json({ data: adjustment }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/adjustments/:id - Update Inventory Adjustment Header
// ---------------------------------------------------------------------------
adjustmentsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateInventoryAdjustmentSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const adjustment = await AdjustmentService.updateAdjustment(id, parseResult.data);
  return c.json({ data: adjustment }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/adjustments/:id/cancel - Cancel Inventory Adjustment
// ---------------------------------------------------------------------------
adjustmentsRouter.post("/:id/cancel", async (c) => {
  const id = c.req.param("id");
  const adjustment = await AdjustmentService.cancelAdjustment(id);
  return c.json({ data: adjustment, message: "Inventory adjustment cancelled successfully" }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/adjustments/:id/preview - Preview Differences (Read-Only)
// ---------------------------------------------------------------------------
adjustmentsRouter.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  const preview = await AdjustmentService.previewAdjustment(id);
  return c.json({ data: preview }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/adjustments/:id/validate - Validate Inventory Adjustment Document
// ---------------------------------------------------------------------------
adjustmentsRouter.post("/:id/validate", async (c) => {
  const id = c.req.param("id");
  const validationResult = await AdjustmentService.validateAdjustment(id);
  return c.json({ data: validationResult }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/adjustments/:id/process - Process Inventory Adjustment (Mutates Stock)
// ---------------------------------------------------------------------------
adjustmentsRouter.post("/:id/process", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const adjustment = await AdjustmentService.processAdjustment(id, user.id);
  return c.json(
    { data: adjustment, message: "Inventory adjustment processed successfully and stock updated" },
    200
  );
});

// ---------------------------------------------------------------------------
// POST /api/adjustments/:id/items - Add Adjustment Item
// ---------------------------------------------------------------------------
adjustmentsRouter.post("/:id/items", async (c) => {
  const adjustmentId = c.req.param("id");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = createInventoryAdjustmentItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await AdjustmentService.addAdjustmentItem(
    adjustmentId,
    parseResult.data
  );
  return c.json({ data: item }, 201);
});

// ---------------------------------------------------------------------------
// PATCH /api/adjustments/:id/items/:itemId - Update Adjustment Item
// ---------------------------------------------------------------------------
adjustmentsRouter.patch("/:id/items/:itemId", async (c) => {
  const adjustmentId = c.req.param("id");
  const itemId = c.req.param("itemId");
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = updateInventoryAdjustmentItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const item = await AdjustmentService.updateAdjustmentItem(
    adjustmentId,
    itemId,
    parseResult.data
  );
  return c.json({ data: item }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/adjustments/:id/items/:itemId - Remove Adjustment Item
// ---------------------------------------------------------------------------
adjustmentsRouter.delete("/:id/items/:itemId", async (c) => {
  const adjustmentId = c.req.param("id");
  const itemId = c.req.param("itemId");

  const result = await AdjustmentService.removeAdjustmentItem(
    adjustmentId,
    itemId
  );
  return c.json(result, 200);
});

export default adjustmentsRouter;
