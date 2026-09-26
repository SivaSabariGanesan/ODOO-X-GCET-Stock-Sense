// ---------------------------------------------------------------------------
// Database layer — public API
// ---------------------------------------------------------------------------
// Single entry point for everything the application needs from the DB layer.
// Import from here rather than from individual files.
//
// Example usage in a service:
//   import { db } from "@/db";
//   import { products, type Product } from "@/db";
// ---------------------------------------------------------------------------

// Client + query helpers
export { db, queryClient, sql } from "./client.js";

// All schema tables and their inferred TypeScript types
export * from "./schema/index.js";
