import { Hono } from "hono";
import { authMiddleware, requireRole } from "../../app/middleware/auth";
import { WarehouseService } from "./service";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  listWarehousesQuerySchema,
} from "./schema";
import { AppError } from "../../lib/errors";

const warehousesRouter = new Hono();

// Protect all Warehouse endpoints with authMiddleware
warehousesRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/warehouses - Create Warehouse (Admin/Manager only)
// ---------------------------------------------------------------------------
warehousesRouter.post("/", requireRole("admin", "manager"), async (c) => {
  const body = await c.req.json();
  const parseResult = createWarehouseSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid warehouse data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const warehouse = await WarehouseService.createWarehouse(parseResult.data, userId);
  return c.json({ data: warehouse }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/warehouses - List Warehouses with Pagination & Filtering
// ---------------------------------------------------------------------------
warehousesRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listWarehousesQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await WarehouseService.listWarehouses(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/warehouses/:id - Get Warehouse Details
// ---------------------------------------------------------------------------
warehousesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const warehouse = await WarehouseService.getWarehouseById(id);
  return c.json({ data: warehouse }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/warehouses/:id - Update Warehouse (Admin/Manager only)
// ---------------------------------------------------------------------------
warehousesRouter.patch("/:id", requireRole("admin", "manager"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = updateWarehouseSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid update data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const updatedWarehouse = await WarehouseService.updateWarehouse(id, parseResult.data, userId);
  return c.json({ data: updatedWarehouse }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/warehouses/:id - Delete or Deactivate Warehouse (Admin/Manager)
// ---------------------------------------------------------------------------
warehousesRouter.delete("/:id", requireRole("admin", "manager"), async (c) => {
  const id = c.req.param("id");
  const result = await WarehouseService.deleteWarehouse(id);
  return c.json(result, 200);
});

export default warehousesRouter;
