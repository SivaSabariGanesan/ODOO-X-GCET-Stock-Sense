import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../../app/middleware/auth.js";
import { rateLimiter } from "../../app/middleware/rate-limiter.js";
import { AiOrchestrator } from "./orchestrator.js";
import { aiTools } from "./tools.js";
import { AppError } from "../../lib/errors.js";

const aiRouter = new Hono();

// Rate limiter for AI chat requests (30 requests per minute per IP)
const aiChatLimiter = rateLimiter({ windowMs: 60 * 1000, max: 30, keyPrefix: "ai-chat" });

// Protect all AI endpoints with authMiddleware
aiRouter.use("*", authMiddleware);

const chatSchema = z.object({
  message: z.string().min(1, "Message content is required").max(2000, "Message content exceeds maximum length of 2000 characters"),
  conversationId: z.string().optional(),
  confirmAction: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/ai/chat - Process Grounded AI Assistant Messages
// ---------------------------------------------------------------------------
aiRouter.post("/chat", aiChatLimiter, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = chatSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Invalid AI request body", 400, parseResult.error.flatten());
  }

  const currentUser = c.get("user");
  if (!currentUser) {
    throw new AppError("Authentication required", 401);
  }

  const result = await AiOrchestrator.handleChat(parseResult.data, currentUser);

  return c.json(
    {
      success: true,
      data: result,
      message: "AI response generated successfully",
    },
    200
  );
});

// ---------------------------------------------------------------------------
// GET /api/ai/tools - List Registered Grounded AI Tools & Capabilities
// ---------------------------------------------------------------------------
aiRouter.get("/tools", async (c) => {
  const toolsList = Object.values(aiTools).map((t) => ({
    name: t.name,
    description: t.description,
    requiresConfirmation: !!t.requiresConfirmation,
    requiredRole: t.requiredRole ?? ["all"],
  }));

  return c.json({ success: true, data: { tools: toolsList } }, 200);
});

export { aiRouter };
