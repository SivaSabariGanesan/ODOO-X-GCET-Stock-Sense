// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------
// Reads and executes the hand-written SQL migration files in
// src/db/migrations/ in filename order. Run this script once on first deploy
// and after each new migration file is added.
//
// Usage (from the backend/ directory):
//   bun run src/db/migrate.ts
//
// Add a convenience script to package.json:
//   "db:migrate:run": "bun run src/db/migrate.ts"
// ---------------------------------------------------------------------------

import postgres from "postgres";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Copy .env.example to .env and fill in your database credentials."
  );
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function runMigrations(): Promise<void> {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    // Create the migrations tracking table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL      PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Read all .sql files in alphabetical order
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    for (const filename of files) {
      // Skip already-applied migrations
      const [existing] = await sql`
        SELECT id FROM _migrations WHERE filename = ${filename}
      `;

      if (existing) {
        console.log(`  ✓ already applied: ${filename}`);
        continue;
      }

      const filePath = join(MIGRATIONS_DIR, filename);
      const migrationSql = readFileSync(filePath, "utf8");

      console.log(`  → applying: ${filename} …`);

      // Run the entire migration file as a single transaction
      await sql.begin(async (tx) => {
        await tx.unsafe(migrationSql);
        await tx`
          INSERT INTO _migrations (filename) VALUES (${filename})
        `;
      });

      console.log(`  ✓ applied:  ${filename}`);
    }

    console.log("\nAll migrations up to date.");
  } finally {
    await sql.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
