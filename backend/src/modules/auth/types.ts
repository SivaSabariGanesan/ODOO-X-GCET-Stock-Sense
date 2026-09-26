import { User } from "../../db/schema/users";

// ---------------------------------------------------------------------------
// Authentication Data Types
// ---------------------------------------------------------------------------

export type SafeUser = Omit<User, "passwordHash">;

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "manager" | "staff";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface VerifyOTPInput {
  email: string;
  otp: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}
