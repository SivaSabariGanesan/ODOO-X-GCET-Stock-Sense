import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { ProductService } from "./service.js";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const productsRouter = new Hono();

// Protect all Product endpoints with authMiddleware
productsRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/products - Create Product
// ---------------------------------------------------------------------------
productsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parseResult = createProductSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid product data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const product = await ProductService.createProduct(parseResult.data, userId);
  return c.json({ data: product }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/products - List Products with Pagination & Filtering
// ---------------------------------------------------------------------------
productsRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listProductsQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await ProductService.listProducts(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/products/:id - Get Product Details
// ---------------------------------------------------------------------------
productsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const product = await ProductService.getProductById(id);
  return c.json({ data: product }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/products/:id - Update Product
// ---------------------------------------------------------------------------
productsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = updateProductSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid update data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const updatedProduct = await ProductService.updateProduct(id, parseResult.data, userId);
  return c.json({ data: updatedProduct }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/products/:id - Delete or Deactivate Product
// ---------------------------------------------------------------------------
productsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await ProductService.deleteProduct(id);
  return c.json(result, 200);
});

export default productsRouter;
