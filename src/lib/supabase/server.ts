import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdmin } from "./admin";

/**
 * Wave 0 interim: service-role client for server actions that need Storage.
 * Wave 1 replaces this with `@supabase/ssr` + the signed-in user's JWT.
 */
export function createServerSupabaseClient(): SupabaseClient {
  return createSupabaseAdmin();
}
