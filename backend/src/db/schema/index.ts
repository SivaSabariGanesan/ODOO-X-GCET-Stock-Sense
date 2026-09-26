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

export * from "./users.js";
export * from "./password-reset-otps.js";
export * from "./categories.js";
export * from "./units-of-measure.js";
export * from "./products.js";
export * from "./warehouses.js";
export * from "./locations.js";
export * from "./reorder-rules.js";
export * from "./stock-balances.js";
