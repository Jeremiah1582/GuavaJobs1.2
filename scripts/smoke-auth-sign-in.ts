import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const email = process.env.SEED_USER_EMAIL?.trim();
  const password = process.env.SEED_USER_PASSWORD?.trim();

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or PUBLISHABLE_KEY");
    process.exit(1);
  }

  if (!email || !password) {
    console.log(
      "skip — set SEED_USER_EMAIL and SEED_USER_PASSWORD in .env.local to run sign-in smoke",
    );
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("signInWithPassword failed:", error.message);
    process.exit(1);
  }

  console.log("ok — Supabase sign-in", {
    userId: data.user?.id,
    email: data.user?.email,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
