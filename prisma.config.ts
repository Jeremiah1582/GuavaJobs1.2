import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

// Don't use prisma's `env()` helper here: it throws eagerly when the variable
// is missing, which breaks `prisma generate` (postinstall) in environments
// where DIRECT_URL has not been configured yet. `prisma generate` does not
// need a live datasource URL, so fall back to a harmless placeholder. Commands
// that actually connect (migrate, db execute) still require a real DIRECT_URL.
const directUrl =
  process.env.DIRECT_URL ?? "postgresql://user:password@localhost:5432/db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI (migrate, db execute): session on 5432. App runtime uses DATABASE_URL in src/db (0B).
    url: directUrl,
  },
});
