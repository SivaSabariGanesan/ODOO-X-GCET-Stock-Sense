import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { CategoryService } from "./service.js";
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const categoriesRouter = new Hono();

// Protect all Category endpoints with authMiddleware
categoriesRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/categories - Create Category
// ---------------------------------------------------------------------------
categoriesRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parseResult = createCategorySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid category data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const category = await CategoryService.createCategory(parseResult.data, userId);
  return c.json({ data: category }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/categories - List Categories with Pagination & Filtering
// ---------------------------------------------------------------------------
categoriesRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listCategoriesQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await CategoryService.listCategories(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/categories/:id - Get Category Details
// ---------------------------------------------------------------------------
categoriesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const category = await CategoryService.getCategoryById(id);
  return c.json({ data: category }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/categories/:id - Update Category
// ---------------------------------------------------------------------------
categoriesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = updateCategorySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid update data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const updatedCategory = await CategoryService.updateCategory(id, parseResult.data, userId);
  return c.json({ data: updatedCategory }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/categories/:id - Delete or Deactivate Category
// ---------------------------------------------------------------------------
categoriesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await CategoryService.deleteCategory(id);
  return c.json(result, 200);
});

export default categoriesRouter;
