// src/db/index.ts
// NOTE: We use require() instead of import for better-sqlite3 and drizzle
// because Next.js 16 Turbopack cannot statically resolve native .node bindings.
// serverExternalPackages in next.config handles bundling, but the static
// export analysis still fails with ESM imports of native modules.

import path from "path";
import fs from "fs";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), ".internhunt");
const DB_PATH  = path.join(DATA_DIR, "data.db");
export const RESUMES_DIR = path.join(DATA_DIR, "resumes");

fs.mkdirSync(DATA_DIR,    { recursive: true });
fs.mkdirSync(RESUMES_DIR, { recursive: true });

// Use require() so Turbopack skips static export analysis for native modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3") as typeof import("better-sqlite3").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { drizzle } = require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const schemaModule = require("./schema") as typeof schema;

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema: schemaModule });

export function ensureUserResumeDir(userId: string): string {
  const dir = path.join(RESUMES_DIR, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}