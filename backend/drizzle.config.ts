import type { Config } from "drizzle-kit";

// ---------------------------------------------------------------------------
// Drizzle Kit configuration
// ---------------------------------------------------------------------------
// Used by the CLI commands defined in package.json:
//   db:generate  →  drizzle-kit generate:pg  (generates SQL from schema)
//   db:migrate   →  drizzle-kit push:pg       (pushes schema directly to DB)
//
// For production, prefer the hand-written migration in src/db/migrations/
// executed via `bun run src/db/migrate.ts` rather than drizzle-kit push.
// ---------------------------------------------------------------------------

export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ?? "",
  },
  // Verbose output so you can see exactly what DDL drizzle-kit generates
  verbose: true,
  // Prompt before destructive changes (drop table / drop column)
  strict: true,
} satisfies Config;
