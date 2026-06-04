import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI (migrate, db execute): session on 5432. App runtime uses DATABASE_URL in src/db (0B).
    url: env("DIRECT_URL"),
  },
});
