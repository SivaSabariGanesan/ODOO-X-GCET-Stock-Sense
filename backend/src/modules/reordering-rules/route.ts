import { Hono } from "hono";
import { authMiddleware } from "../../app/middleware/auth.js";
import { ReorderRuleService } from "./service.js";
import {
  createReorderRuleSchema,
  updateReorderRuleSchema,
  listReorderRulesQuerySchema,
} from "./schema.js";
import { AppError } from "../../lib/errors.js";

const reorderingRulesRouter = new Hono();

// Protect all Reordering Rule endpoints with authMiddleware
reorderingRulesRouter.use("*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/reordering-rules - Create Reordering Rule
// ---------------------------------------------------------------------------
reorderingRulesRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parseResult = createReorderRuleSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid reordering rule data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const rule = await ReorderRuleService.createReorderRule(parseResult.data, userId);
  return c.json({ data: rule }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/reordering-rules - List Reordering Rules with Pagination & Filtering
// ---------------------------------------------------------------------------
reorderingRulesRouter.get("/", async (c) => {
  const query = c.req.query();
  const parseResult = listReorderRulesQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new AppError("Invalid query parameters", 400, parseResult.error.flatten());
  }

  const result = await ReorderRuleService.listReorderRules(parseResult.data);
  return c.json(
    { data: result.data, meta: result.pagination, pagination: result.pagination },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/reordering-rules/:id - Get Reordering Rule Details
// ---------------------------------------------------------------------------
reorderingRulesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const rule = await ReorderRuleService.getReorderRuleById(id);
  return c.json({ data: rule }, 200);
});

// ---------------------------------------------------------------------------
// PATCH /api/reordering-rules/:id - Update Reordering Rule
// ---------------------------------------------------------------------------
reorderingRulesRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = updateReorderRuleSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid update data", 400, parseResult.error.flatten());
  }

  const jwtPayload = c.get("jwtPayload");
  const userId = jwtPayload?.id;

  const updatedRule = await ReorderRuleService.updateReorderRule(id, parseResult.data, userId);
  return c.json({ data: updatedRule }, 200);
});

// ---------------------------------------------------------------------------
// DELETE /api/reordering-rules/:id - Delete Reordering Rule
// ---------------------------------------------------------------------------
reorderingRulesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await ReorderRuleService.deleteReorderRule(id);
  return c.json(result, 200);
});

export default reorderingRulesRouter;
