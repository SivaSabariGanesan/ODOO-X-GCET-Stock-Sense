import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { AuthService } from "./service";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "./schema";
import { authMiddleware } from "../../app/middleware/auth";
import { config } from "../../app/config";
import { AppError } from "../../lib/errors";

const authRouter = new Hono();

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
authRouter.post("/register", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = registerSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const user = await AuthService.register(parseResult.data);
  return c.json({ user }, 201);
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const { user, token } = await AuthService.login(parseResult.data);

  // Set HTTP-only secure cookie
  setCookie(c, config.jwt.cookieName, token, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "Lax",
    maxAge: config.jwt.expiresInSeconds,
    path: "/",
  });

  return c.json({ user, token }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
authRouter.post("/logout", (c) => {
  deleteCookie(c, config.jwt.cookieName, {
    path: "/",
  });
  return c.json({ message: "Logged out successfully" }, 200);
});

// ---------------------------------------------------------------------------
// GET /api/auth/me (Protected)
// ---------------------------------------------------------------------------
authRouter.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ user }, 200);
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------
authRouter.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = forgotPasswordSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const result = await AuthService.forgotPassword(parseResult.data);
  return c.json(result, 200);
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// ---------------------------------------------------------------------------
authRouter.post("/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = verifyOtpSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const result = await AuthService.verifyOTP(parseResult.data);
  return c.json(result, 200);
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------
authRouter.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Invalid JSON body", 400);
  });

  const parseResult = resetPasswordSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, parseResult.error.flatten());
  }

  const result = await AuthService.resetPassword(parseResult.data);
  return c.json(result, 200);
});

export default authRouter;
