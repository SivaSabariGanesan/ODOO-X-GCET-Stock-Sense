import { Context, Next } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { config } from "../config";
import { AuthService } from "../../modules/auth/service";
import { JWTPayload, SafeUser } from "../../modules/auth/types";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors";

// ---------------------------------------------------------------------------
// Hono Type Declaration for Context Variables
// ---------------------------------------------------------------------------
declare module "hono" {
  interface ContextVariableMap {
    user: SafeUser;
    jwtPayload: JWTPayload;
  }
}

/**
 * Authentication Middleware
 * Resolves JWT credential from Authorization Header or Cookie, verifies it,
 * checks user active state in DB, and attaches authenticated user to context.
 */
export async function authMiddleware(c: Context, next: Next): Promise<void> {
  let token: string | undefined;

  // 1. Check Authorization Header (Bearer token)
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to Cookie
  if (!token) {
    token = getCookie(c, config.jwt.cookieName);
  }

  if (!token) {
    throw new UnauthorizedError("Authentication token required");
  }

  // 3. Verify JWT token signature and expiration
  let payload: JWTPayload;
  try {
    const verifiedPayload = await verify(token, config.jwt.secret);
    payload = verifiedPayload as unknown as JWTPayload;
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired authentication token");
  }

  if (!payload || !payload.id) {
    throw new UnauthorizedError("Malformed authentication token payload");
  }

  // 4. Resolve user & verify active account status in DB
  const user = await AuthService.getCurrentUser(payload.id);

  // 5. Attach authenticated user to context
  c.set("user", user);
  c.set("jwtPayload", payload);

  await next();
}

/**
 * Authorization Middleware: Role-Based Access Control (RBAC)
 * Enforces role check against authenticated user context.
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next): Promise<void> => {
    const user = c.get("user");

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Access denied: requires one of the following roles: [${allowedRoles.join(", ")}]`
      );
    }

    await next();
  };
}
