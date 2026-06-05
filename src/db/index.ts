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

/**
 * Get the Prisma client instance. Lazily initializes on first call.
 * This defers DATABASE_URL requirement from module-load-time to first-use-time,
 * allowing the dev server to start even when the env var is not set yet.
 */
function getPrismaSingleton(): PrismaClient {
  if (__prismaInstance === null) {
    __prismaInstance = getPrismaClient();
  }
  return __prismaInstance;
}

// Export for use in API routes
export const prisma = new Proxy(
  {},
  {
    get(target: any, prop: PropertyKey) {
      const client = getPrismaSingleton();
      const value = Reflect.get(client, prop);
      // Bind methods to the client to preserve `this` context
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  },
) as PrismaClient;

export type { Prisma } from "@/generated/prisma";

export function ensureUserResumeDir(userId: string): string {
  const dir = path.join(RESUMES_DIR, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
