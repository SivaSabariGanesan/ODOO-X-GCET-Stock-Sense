// ---------------------------------------------------------------------------
// Standard Application Domain Errors
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class DuplicateEmailError extends AppError {
  constructor() {
    super("An account with this email address already exists", 409);
    this.name = "DuplicateEmailError";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid email or password", 401);
    this.name = "InvalidCredentialsError";
  }
}

export class InactiveAccountError extends AppError {
  constructor() {
    super("Your account has been deactivated. Please contact an administrator.", 403);
    this.name = "InactiveAccountError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied: insufficient permissions") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class InvalidOtpError extends AppError {
  constructor(message = "Invalid or expired OTP") {
    super(message, 400);
    this.name = "InvalidOtpError";
  }
}

export class TooManyOtpAttemptsError extends AppError {
  constructor() {
    super("Too many failed verification attempts. Please request a new OTP.", 429);
    this.name = "TooManyOtpAttemptsError";
  }
}
