import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/users";
import { passwordResetOtps } from "../src/db/schema/password-reset-otps";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { config } from "../src/app/config";

const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = "Password123!";
let authToken = "";
let userId = "";

describe("StockSense Auth Module", () => {
  beforeAll(async () => {
    // Ensure test user cleanup before starting
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
  });

  afterAll(async () => {
    // Cleanup test artifacts
    if (userId) {
      await db.delete(passwordResetOtps).where(eq(passwordResetOtps.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // -------------------------------------------------------------------------
  // 1. Registration Tests
  // -------------------------------------------------------------------------
  describe("Registration", () => {
    it("should register a new user successfully", async () => {
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          role: "staff",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(TEST_EMAIL.toLowerCase());
      expect(data.user.name).toBe("Test User");
      expect(data.user.passwordHash).toBeUndefined(); // Never return password hash!
      userId = data.user.id;
    });

    it("should reject duplicate email registration", async () => {
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate User",
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });

    it("should reject invalid registration input (weak password)", async () => {
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Weak Pass",
          email: "weak@example.com",
          password: "weak", // Fails min length & complexity
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
    });

    it("should verify password is safely hashed in the database", async () => {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).not.toBe(TEST_PASSWORD);
      expect(dbUser.passwordHash).toContain("$argon2id$");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Login Tests
  // -------------------------------------------------------------------------
  describe("Login", () => {
    it("should authenticate with valid credentials", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.token).toBeDefined();
      expect(data.user.passwordHash).toBeUndefined();
      authToken = data.token;
    });

    it("should reject login with wrong password", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: "WrongPassword123!",
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Invalid email or password");
    });

    it("should reject login with non-existent email", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent_email_12345@example.com",
          password: TEST_PASSWORD,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Invalid email or password");
    });

    it("should reject login for inactive user accounts", async () => {
      // Deactivate user in DB
      await db.update(users).set({ isActive: false }).where(eq(users.id, userId));

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("deactivated");

      // Reactivate user for subsequent tests
      await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
    });
  });

  // -------------------------------------------------------------------------
  // 3. Authentication Middleware Tests (/api/auth/me)
  // -------------------------------------------------------------------------
  describe("Authentication Middleware", () => {
    it("should grant access with valid Authorization header token", async () => {
      const res = await app.request("/api/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.id).toBe(userId);
      expect(data.user.email).toBe(TEST_EMAIL.toLowerCase());
    });

    it("should reject request when Authorization token is missing", async () => {
      const res = await app.request("/api/auth/me", {
        method: "GET",
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("token required");
    });

    it("should reject request with malformed or invalid token", async () => {
      const res = await app.request("/api/auth/me", {
        method: "GET",
        headers: { Authorization: "Bearer invalid.token.payload" },
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Invalid or expired");
    });

    it("should reject request with an expired token", async () => {
      // Generate expired token
      const expiredToken = await sign(
        {
          id: userId,
          email: TEST_EMAIL,
          role: "staff",
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        config.jwt.secret
      );

      const res = await app.request("/api/auth/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Password Reset & OTP Tests
  // -------------------------------------------------------------------------
  describe("Password Reset & OTP", () => {
    let generatedOtp = "";

    it("should handle forgot-password request and generate OTP", async () => {
      const res = await app.request("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain("If an account exists");
      expect(data.debugOtp).toBeDefined();
      generatedOtp = data.debugOtp;
    });

    it("should return generic message for nonexistent email in forgot-password", async () => {
      const res = await app.request("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent_forgot@example.com" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain("If an account exists");
      expect(data.debugOtp).toBeUndefined();
    });

    it("should verify valid OTP successfully", async () => {
      const res = await app.request("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          otp: generatedOtp,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
    });

    it("should reject invalid OTP code", async () => {
      const res = await app.request("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          otp: "000000",
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid verification code");
    });

    it("should reject expired OTPs", async () => {
      // Force OTP expiration in DB
      await db
        .update(passwordResetOtps)
        .set({ expiresAt: new Date(Date.now() - 60000) })
        .where(eq(passwordResetOtps.userId, userId));

      const res = await app.request("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          otp: generatedOtp,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("expired");
    });

    it("should enforce maximum OTP attempt limits", async () => {
      // Create new fresh OTP
      const forgotRes = await app.request("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });
      const newOtp = (await forgotRes.json()).debugOtp;

      // Fail 5 times to hit rate limit
      for (let i = 0; i < 5; i++) {
        await app.request("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEST_EMAIL,
            otp: "999999",
          }),
        });
      }

      // 6th attempt should be blocked with 429 Too Many Attempts
      const res = await app.request("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          otp: newOtp,
        }),
      });

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("Too many failed");
    });

    it("should reset password successfully and allow login with new password", async () => {
      // Request fresh OTP
      const forgotRes = await app.request("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_EMAIL }),
      });
      const freshOtp = (await forgotRes.json()).debugOtp;
      const NEW_PASSWORD = "NewPassword456!";

      // Reset password
      const resetRes = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          otp: freshOtp,
          newPassword: NEW_PASSWORD,
        }),
      });

      expect(resetRes.status).toBe(200);

      // Verify login with old password fails
      const oldLoginRes = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      });
      expect(oldLoginRes.status).toBe(401);

      // Verify login with NEW password succeeds
      const newLoginRes = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: NEW_PASSWORD,
        }),
      });
      expect(newLoginRes.status).toBe(200);
    });

    it("should reject reused OTPs after password reset", async () => {
      // Attempt to reset password again with same OTP
      const res = await app.request("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          otp: generatedOtp,
          newPassword: "AnotherPassword789!",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Logout Tests
  // -------------------------------------------------------------------------
  describe("Logout", () => {
    it("should clear cookie and respond with success on logout", async () => {
      const res = await app.request("/api/auth/logout", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Logged out successfully");
      expect(res.headers.get("Set-Cookie")).toContain("stocksense_token=");
    });
  });
});
