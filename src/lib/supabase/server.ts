import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "./env";

/** Cookie-based Supabase client for Server Components, Server Actions, and Route Handlers. */
export async function createServerSupabaseClient() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Supabase server client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}
