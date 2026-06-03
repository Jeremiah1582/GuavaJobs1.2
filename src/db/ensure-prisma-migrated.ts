// Applies Prisma migrations on app startup (replaces Drizzle runMigrations).
import { execSync } from "child_process";
import fs from "fs";

export const PRISMA_INIT_MIGRATION = "20250603220000_init";

const EXPECTED_MIGRATIONS = [
  PRISMA_INIT_MIGRATION,
  "20250603220100_legacy_cleanup",
] as const;

declare global {
  var __internhuntPrismaMigrated: boolean | undefined;
}

function sqliteTableExists(dbPath: string, table: string): boolean {
  if (!fs.existsSync(dbPath)) return false;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3").default;
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(table) as { name: string } | undefined;
    return row != null;
  } finally {
    db.close();
  }
}

function listAppliedMigrations(dbPath: string): string[] {
  if (!sqliteTableExists(dbPath, "_prisma_migrations")) return [];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3").default;
  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db
      .prepare("SELECT migration_name FROM _prisma_migrations")
      .all() as { migration_name: string }[];
    return rows.map((r) => r.migration_name);
  } catch {
    return [];
  } finally {
    db.close();
  }
}

function allMigrationsApplied(dbPath: string): boolean {
  const applied = new Set(listAppliedMigrations(dbPath));
  return EXPECTED_MIGRATIONS.every((name) => applied.has(name));
}

/** Run `prisma migrate deploy` once per process; never crash the app on lock/timeouts. */
export function ensurePrismaMigrated(dbPath: string): void {
  if (globalThis.__internhuntPrismaMigrated) return;

  const cwd = process.cwd();
  const env = { ...process.env };

  try {
    const hasAppTables = sqliteTableExists(dbPath, "user");
    const applied = listAppliedMigrations(dbPath);
    const initApplied = applied.includes(PRISMA_INIT_MIGRATION);

    if (hasAppTables && !initApplied) {
      console.log(
        `[db] Baselining existing SQLite DB → migrate resolve --applied ${PRISMA_INIT_MIGRATION}`,
      );
      execSync(`npx prisma migrate resolve --applied ${PRISMA_INIT_MIGRATION}`, {
        cwd,
        env,
        stdio: "pipe",
        timeout: 60_000,
      });
    }

    if (!allMigrationsApplied(dbPath)) {
      execSync("npx prisma migrate deploy", {
        cwd,
        env,
        stdio: "pipe",
        timeout: 60_000,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Dev server often holds a WAL lock — skip if schema is already usable.
    if (sqliteTableExists(dbPath, "user") && allMigrationsApplied(dbPath)) {
      console.warn(`[db] migrate deploy skipped (${msg}); using existing schema.`);
    } else if (sqliteTableExists(dbPath, "user")) {
      console.warn(
        `[db] migrate deploy failed (${msg}). Run: npm run db:migrate:deploy`,
      );
    } else {
      console.error(`[db] migrate deploy failed (${msg})`);
      throw err;
    }
  }

  globalThis.__internhuntPrismaMigrated = true;
}
