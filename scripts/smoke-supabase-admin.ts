import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createSupabaseAdmin, isSupabaseConfigured } from "../src/lib/supabase/admin";

async function main() {
  if (!isSupabaseConfigured()) {
    console.error("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  const client = createSupabaseAdmin();
  const { data, error } = await client.auth.getSession();

  if (error) {
    console.error("Admin client error:", error.message);
    process.exit(1);
  }

  console.log("ok — Supabase admin client created", {
    hasSession: Boolean(data.session),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
