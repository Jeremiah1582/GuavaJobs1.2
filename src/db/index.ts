// src/db/index.ts — Prisma 7 + better-sqlite3 adapter (SQLite at .internhunt/data.db)
// Native modules use require() so Next.js Turbopack skips static .node binding analysis.

import path from "path";
import fs from "fs";
import { PrismaClient } from "@/generated/prisma";

const DATA_DIR = path.join(process.cwd(), ".internhunt");
export const DB_PATH = path.join(DATA_DIR, "data.db");
export const RESUMES_DIR = path.join(DATA_DIR, "resumes");

const DATABASE_URL =
  process.env.INTERNHUNT_DATABASE_URL ?? `file:${DB_PATH}`;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(RESUMES_DIR, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3") as typeof import("better-sqlite3").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");

const bootstrapSqlite = new Database(DB_PATH);
bootstrapSqlite.pragma("journal_mode = WAL");
bootstrapSqlite.close();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ensurePrismaMigrated } = require("./ensure-prisma-migrated") as typeof import("./ensure-prisma-migrated");
ensurePrismaMigrated(DB_PATH);

const globalForPrisma = globalThis as typeof globalThis & {
  __internhuntPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
  const client = new PrismaClient({ adapter });
  void client.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
  return client;
}

export const prisma = globalForPrisma.__internhuntPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__internhuntPrisma = prisma;
}

export type { Prisma } from "@/generated/prisma";

export function ensureUserResumeDir(userId: string): string {
  const dir = path.join(RESUMES_DIR, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
