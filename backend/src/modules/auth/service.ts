import { eq, and, gt, desc } from "drizzle-orm";
import { sign } from "hono/jwt";
import { db } from "../../db/client";
import { users, User } from "../../db/schema/users";
import { passwordResetOtps } from "../../db/schema/password-reset-otps";
import { config } from "../../app/config";
import { EmailService } from "../../lib/email";
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  VerifyOTPInput,
  ResetPasswordInput,
  SafeUser,
  AuthResponse,
} from "./types";
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  InactiveAccountError,
  UnauthorizedError,
  InvalidOtpError,
  TooManyOtpAttemptsError,
} from "../../lib/errors";

// ---------------------------------------------------------------------------
// Helper: Remove sensitive fields from User object
// ---------------------------------------------------------------------------
export function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// ---------------------------------------------------------------------------
// Helper: Generate a cryptographically secure 6-digit numeric OTP
// ---------------------------------------------------------------------------
function generate6DigitOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const num = (array[0] % 900000) + 100000;
  return num.toString();
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<SafeUser> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check duplicate email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      throw new DuplicateEmailError();
    }

    // 2. Hash password securely with Argon2id
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 2,
    });

    // 3. Create user in DB
    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: input.role ?? "staff",
        isActive: true,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user record");
    }

    return toSafeUser(newUser);
  }

  /**
   * Authenticate user and issue JWT token
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // 2. Verify password
    const isPasswordValid = await Bun.password.verify(
      input.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 3. Check account active state
    if (!user.isActive) {
      throw new InactiveAccountError();
    }

    // 4. Generate JWT Token
    const exp = Math.floor(Date.now() / 1000) + config.jwt.expiresInSeconds;
    const token = await sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        exp,
        iat: Math.floor(Date.now() / 1000),
      },
      config.jwt.secret
    );

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Fetch current authenticated user profile
   */
  static async getCurrentUser(userId: string): Promise<SafeUser> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User profile not found or inactive");
    }

    return toSafeUser(user);
  }

  /**
   * Request Password Reset OTP
   */
  static async forgotPassword(
    input: ForgotPasswordInput
  ): Promise<{ message: string; debugOtp?: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Generic success response even if email doesn't exist (prevents email enumeration)
    const genericResponse = {
      message:
        "If an account exists with that email, a password reset OTP has been sent.",
    };

    if (!user) {
      return genericResponse;
    }

    // Invalidate prior active OTPs for this user
    await db
      .update(passwordResetOtps)
      .set({ isUsed: true })
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          eq(passwordResetOtps.isUsed, false)
        )
      );

    // Generate 6-digit OTP & Hash it
    const otp = generate6DigitOTP();
    const otpHash = await Bun.password.hash(otp, {
      algorithm: "argon2id",
    });

    const expiresAt = new Date(
      Date.now() + config.otp.expiresInMinutes * 60 * 1000
    );

    // Persist OTP Hash in DB
    await db.insert(passwordResetOtps).values({
      userId: user.id,
      otpHash,
      expiresAt,
      isUsed: false,
      attemptCount: 0,
    });

    // Send email (via SMTP or dev console transport)
    await EmailService.sendPasswordResetOTP(normalizedEmail, otp);

    // Return debug OTP in non-production environments for automated integration testing
    const isDev = config.env === "development" || config.env === "test";
    return {
      ...genericResponse,
      debugOtp: isDev ? otp : undefined,
    };
  }

  /**
   * Verify Password Reset OTP
   */
  static async verifyOTP(
    input: VerifyOTPInput
  ): Promise<{ message: string; valid: boolean }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new InvalidOtpError("Invalid email or expired OTP");
    }

    // Find latest unused OTP for user
    const [latestOtp] = await db
      .select()
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          eq(passwordResetOtps.isUsed, false)
        )
      )
      .orderBy(desc(passwordResetOtps.createdAt))
      .limit(1);

    if (!latestOtp) {
      throw new InvalidOtpError("No active OTP request found");
    }

    // Check expiration
    if (new Date() > latestOtp.expiresAt) {
      throw new InvalidOtpError("OTP has expired. Please request a new one.");
    }

    // Check max attempt guard
    if (latestOtp.attemptCount >= config.otp.maxAttempts) {
      throw new TooManyOtpAttemptsError();
    }

    // Verify OTP hash
    const isValid = await Bun.password.verify(input.otp, latestOtp.otpHash);

    if (!isValid) {
      // Increment attempt count
      const newAttempts = latestOtp.attemptCount + 1;
      await db
        .update(passwordResetOtps)
        .set({ attemptCount: newAttempts })
        .where(eq(passwordResetOtps.id, latestOtp.id));

      if (newAttempts >= config.otp.maxAttempts) {
        throw new TooManyOtpAttemptsError();
      }

      throw new InvalidOtpError("Invalid verification code");
    }

    return {
      message: "OTP verified successfully",
      valid: true,
    };
  }

  /**
   * Reset Password using verified OTP
   */
  static async resetPassword(
    input: ResetPasswordInput
  ): Promise<{ message: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new InvalidOtpError("Invalid email or expired OTP");
    }

    const [latestOtp] = await db
      .select()
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          eq(passwordResetOtps.isUsed, false)
        )
      )
      .orderBy(desc(passwordResetOtps.createdAt))
      .limit(1);

    if (!latestOtp) {
      throw new InvalidOtpError("No active OTP request found");
    }

    if (new Date() > latestOtp.expiresAt) {
      throw new InvalidOtpError("OTP has expired. Please request a new one.");
    }

    if (latestOtp.attemptCount >= config.otp.maxAttempts) {
      throw new TooManyOtpAttemptsError();
    }

    const isValid = await Bun.password.verify(input.otp, latestOtp.otpHash);

    if (!isValid) {
      await db
        .update(passwordResetOtps)
        .set({ attemptCount: latestOtp.attemptCount + 1 })
        .where(eq(passwordResetOtps.id, latestOtp.id));

      throw new InvalidOtpError("Invalid verification code");
    }

    // Hash new password
    const newPasswordHash = await Bun.password.hash(input.newPassword, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 2,
    });

    // Update user password and mark OTP as used
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await tx
        .update(passwordResetOtps)
        .set({
          isUsed: true,
          usedAt: new Date(),
        })
        .where(eq(passwordResetOtps.id, latestOtp.id));
    });

    return { message: "Password reset successfully" };
  }
}
