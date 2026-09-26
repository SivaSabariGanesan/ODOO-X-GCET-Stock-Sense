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

export class InsufficientStockError extends AppError {
  constructor(message = "Insufficient stock available") {
    super(message, 400);
    this.name = "InsufficientStockError";
  }
}

// ---------------------------------------------------------------------------
// Internal Transfer Domain Errors
// ---------------------------------------------------------------------------

export class TransferNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Internal transfer with ID '${id}' was not found` : "Internal transfer not found", 404);
    this.name = "TransferNotFoundError";
  }
}

export class TransferItemNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Internal transfer item with ID '${id}' was not found` : "Internal transfer item not found", 404);
    this.name = "TransferItemNotFoundError";
  }
}

export class TransferLockedError extends AppError {
  constructor(status: string) {
    super(`Cannot modify internal transfer in '${status}' state. Completed or cancelled transfers are locked from editing.`, 400);
    this.name = "TransferLockedError";
  }
}

export class TransferValidationError extends AppError {
  constructor(message: string, errors: string[]) {
    super(message, 400, errors);
    this.name = "TransferValidationError";
  }
}

// ---------------------------------------------------------------------------
// Inventory Adjustment Domain Errors
// ---------------------------------------------------------------------------

export class AdjustmentNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Inventory adjustment with ID '${id}' was not found` : "Inventory adjustment not found", 404);
    this.name = "AdjustmentNotFoundError";
  }
}

export class AdjustmentItemNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Inventory adjustment item with ID '${id}' was not found` : "Inventory adjustment item not found", 404);
    this.name = "AdjustmentItemNotFoundError";
  }
}

export class AdjustmentLockedError extends AppError {
  constructor(status: string) {
    super(`Cannot modify inventory adjustment in '${status}' state. Completed or cancelled adjustments are locked from editing.`, 400);
    this.name = "AdjustmentLockedError";
  }
}

export class AdjustmentValidationError extends AppError {
  constructor(message: string, errors: string[]) {
    super(message, 400, errors);
    this.name = "AdjustmentValidationError";
  }
}

// ---------------------------------------------------------------------------
// Stock Movement / Ledger Domain Errors
// ---------------------------------------------------------------------------

export class StockMovementNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Stock movement with ID '${id}' was not found` : "Stock movement not found", 404);
    this.name = "StockMovementNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Product Domain Errors
// ---------------------------------------------------------------------------

export class CategoryNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Category with ID '${id}' was not found` : "Category not found", 404);
    this.name = "CategoryNotFoundError";
  }
}

export class UomNotFoundError extends AppError {
  constructor(id?: string) {
    super(id ? `Unit of Measure with ID '${id}' was not found` : "Unit of Measure not found", 404);
    this.name = "UomNotFoundError";
  }
}

export class DuplicateSkuError extends AppError {
  constructor(sku: string) {
    super(`A product with SKU '${sku}' already exists`, 409);
    this.name = "DuplicateSkuError";
  }
}

export class ProductReferencedError extends AppError {
  constructor(id: string, message = `Product '${id}' is referenced in inventory operations and cannot be hard deleted. Deactivate it instead.`) {
    super(message, 400);
    this.name = "ProductReferencedError";
  }
}

export class DuplicateCategoryNameError extends AppError {
  constructor(name: string) {
    super(`A category with name '${name}' already exists`, 409);
    this.name = "DuplicateCategoryNameError";
  }
}

export class CategoryReferencedError extends AppError {
  constructor(id: string, message = `Category '${id}' is referenced by existing products and cannot be hard deleted. Deactivate it instead.`) {
    super(message, 400);
    this.name = "CategoryReferencedError";
  }
}

export class DuplicateUomError extends AppError {
  constructor(identifier: string) {
    super(`A Unit of Measure with name or abbreviation '${identifier}' already exists`, 409);
    this.name = "DuplicateUomError";
  }
}

export class UomReferencedError extends AppError {
  constructor(id: string, message = `Unit of Measure '${id}' is referenced by existing products and cannot be hard deleted. Deactivate it instead.`) {
    super(message, 400);
    this.name = "UomReferencedError";
  }
}





