import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// ---------------------------------------------------------------------------
// Database client
// ---------------------------------------------------------------------------
// Single shared Drizzle instance for the entire backend. Import `db` wherever
// you need to run queries; import `sql` for raw SQL fragments.
//
// The postgres-js driver handles connection pooling internally. The default
// pool size is 10; override with the POSTGRES_POOL_SIZE env var if needed.
//
// In test environments, create a separate client pointing at the test DB
// rather than monkey-patching this module.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Copy .env.example to .env and fill in your database credentials."
  );
}

// postgres-js connection — lazy by default (connects on first query)
const queryClient = postgres(DATABASE_URL, {
  max: Number(process.env.POSTGRES_POOL_SIZE ?? 10),
  // Fail fast during startup rather than hanging on a misconfigured DB
  connect_timeout: 10,
  idle_timeout: 30,
  // Note: camelCase column mapping is handled by Drizzle ORM, not the driver.
});

// Drizzle instance — typed against the full schema so you get autocomplete
// on every table and column in query builders.
export const db = drizzle(queryClient, { schema });

// Re-export the raw postgres client for advanced use (e.g. LISTEN/NOTIFY,
// multi-statement transactions that span multiple Drizzle calls).
export { queryClient };

// Re-export the sql tag from drizzle-orm for raw SQL fragments
export { sql } from "drizzle-orm";
