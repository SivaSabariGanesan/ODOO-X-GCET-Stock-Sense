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

// ---------------------------------------------------------------------------
// Receipt Core Domain Errors
// ---------------------------------------------------------------------------

export class ReceiptNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Receipt with ID '${id}' was not found` : "Receipt not found", 404);
    this.name = "ReceiptNotFoundError";
  }
}

export class ReceiptItemNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Receipt item with ID '${id}' was not found` : "Receipt item not found", 404);
    this.name = "ReceiptItemNotFoundError";
  }
}

export class WarehouseNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Warehouse with ID '${id}' was not found` : "Warehouse not found", 404);
    this.name = "WarehouseNotFoundError";
  }
}

export class LocationNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Location with ID '${id}' was not found` : "Location not found", 404);
    this.name = "LocationNotFoundError";
  }
}

export class ProductNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Product with ID '${id}' was not found` : "Product not found", 404);
    this.name = "ProductNotFoundError";
  }
}

export class ReceiptLockedError extends AppError {
  constructor(status: string) {
    super(`Cannot modify receipt in '${status}' state. Completed or cancelled receipts are locked from editing.`, 400);
    this.name = "ReceiptLockedError";
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Invalid status transition from '${fromStatus}' to '${toStatus}'`, 400);
    this.name = "InvalidStatusTransitionError";
  }
}

export class ReceiptValidationError extends AppError {
  constructor(message: string, errors: string[]) {
    super(message, 400, errors);
    this.name = "ReceiptValidationError";
  }
}

// ---------------------------------------------------------------------------
// Delivery Core Domain Errors
// ---------------------------------------------------------------------------

export class DeliveryNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Delivery with ID '${id}' was not found` : "Delivery not found", 404);
    this.name = "DeliveryNotFoundError";
  }
}

export class DeliveryItemNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Delivery item with ID '${id}' was not found` : "Delivery item not found", 404);
    this.name = "DeliveryItemNotFoundError";
  }
}

export class DeliveryLockedError extends AppError {
  constructor(status: string) {
    super(`Cannot modify delivery in '${status}' state. Completed or cancelled deliveries are locked from editing.`, 400);
    this.name = "DeliveryLockedError";
  }
}

export class DeliveryValidationError extends AppError {
  constructor(message: string, errors: string[]) {
    super(message, 400, errors);
    this.name = "DeliveryValidationError";
  }
}
