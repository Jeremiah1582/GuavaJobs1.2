// Postgres Prisma client (Supabase pooler via DATABASE_URL).
import "server-only";

import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const DATA_DIR = path.join(process.cwd(), ".internhunt");
export const RESUMES_DIR = path.join(DATA_DIR, "resumes");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(RESUMES_DIR, { recursive: true });

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase pooler URL to .env.local (see .env.example).",
    );
  }
  return url;
}

const globalForPrisma = globalThis as typeof globalThis & {
  __internhuntPrisma?: PrismaClient;
  __internhuntPrismaError?: Error;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

/** Dev hot-reload can keep an old PrismaClient missing delegates added after `prisma generate`. */
function isPrismaClientStale(client: PrismaClient): boolean {
  return !("jobDescriptionInsight" in client);
}

function getPrismaClient(): PrismaClient {
  // If we previously tried to create a client and failed, rethrow only when actually accessed.
  if (globalForPrisma.__internhuntPrismaError) {
    throw globalForPrisma.__internhuntPrismaError;
  }

  const cached = globalForPrisma.__internhuntPrisma;
  if (cached && !isPrismaClientStale(cached)) {
    return cached;
  }

  try {
    const client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.__internhuntPrisma = client;
    }
    return client;
  } catch (err) {
    // Cache the error so we don't keep trying. Rethrow on access.
    globalForPrisma.__internhuntPrismaError = err instanceof Error ? err : new Error(String(err));
    throw globalForPrisma.__internhuntPrismaError;
  }
}

let __prismaInstance: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (__prismaInstance === null) {
      __prismaInstance = getPrismaClient();
    }
    return Reflect.get(__prismaInstance, prop);
  },
});

export type { Prisma } from "@/generated/prisma";

export function ensureUserResumeDir(userId: string): string {
  const dir = path.join(RESUMES_DIR, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
