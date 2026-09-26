import { z } from "zod";

// ---------------------------------------------------------------------------
// Centralized Password Validation Rule
// ---------------------------------------------------------------------------
// Min 8 chars, at least 1 uppercase letter, 1 lowercase letter, 1 number
// ---------------------------------------------------------------------------
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(100, "Password must not exceed 100 characters")
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number",
  });

// ---------------------------------------------------------------------------
// Request Validation Schemas
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(255, "Name must not exceed 255 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address format")
    .max(255, "Email must not exceed 255 characters"),
  password: passwordSchema,
  role: z.enum(["admin", "manager", "staff"]).optional().default("staff"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address format"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address format"),
});

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address format"),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain numbers only"),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address format"),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain numbers only"),
  newPassword: passwordSchema,
});
