import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

const recommended = ["NEXT_PUBLIC_APP_URL"] as const;

function main() {
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  const missingRecommended = recommended.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error("Missing required env vars:", missing.join(", "));
    console.error("See docs/SUPABASE_AUTH_SETUP.md");
    process.exit(1);
  }

  if (missingRecommended.length > 0) {
    console.warn("Recommended (auth redirects):", missingRecommended.join(", "));
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
  console.log("ok — Supabase auth env present", {
    appUrl,
    supabaseHost: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()).host,
    publishableKeyPrefix:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim().slice(0, 8) + "…",
  });
}

main();
