import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { UomService } from "./service.js";
import {
  createUomSchema,
  updateUomSchema,
  listUomsQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const uomsRouter = new Hono();

// Protect all UOM endpoints with authMiddleware
uomsRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/uoms - Create Unit of Measure
// ---------------------------------------------------------------------------
uomsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parseResult = createUomSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid UOM data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const uom = await UomService.createUom(parseResult.data, userId);
  return c.json({ data: uom }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/uoms - List Units of Measure with Pagination & Filtering
// ---------------------------------------------------------------------------
uomsRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listUomsQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await UomService.listUoms(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/uoms/:id - Get Unit of Measure Details
// ---------------------------------------------------------------------------
uomsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const uom = await UomService.getUomById(id);
  return c.json({ data: uom }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/uoms/:id - Update Unit of Measure
// ---------------------------------------------------------------------------
uomsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = updateUomSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid update data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const updatedUom = await UomService.updateUom(id, parseResult.data, userId);
  return c.json({ data: updatedUom }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/uoms/:id - Delete or Deactivate Unit of Measure
// ---------------------------------------------------------------------------
uomsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await UomService.deleteUom(id);
  return c.json(result, 200);
});

export default uomsRouter;
