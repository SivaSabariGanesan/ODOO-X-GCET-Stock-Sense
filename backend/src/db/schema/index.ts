// ---------------------------------------------------------------------------
// Database schema barrel export
// ---------------------------------------------------------------------------
// Import ALL schema tables from this single entry point so Drizzle Kit can
// pick them up via the schema path in drizzle.config.ts, and so application
// code only needs one import.
//
// Person 2: add your schema files here when implementing the inventory-
// operation domain (receipts, deliveries, transfers, adjustments, movements).
// ---------------------------------------------------------------------------

export * from "./users";
export * from "./password-reset-otps";
export * from "./categories";
export * from "./units-of-measure";
export * from "./products";
export * from "./warehouses";
export * from "./locations";
export * from "./reorder-rules";
export * from "./stock-balances";
export * from "./receipts";
export * from "./receipt-items";
export * from "./deliveries";
export * from "./delivery-items";
