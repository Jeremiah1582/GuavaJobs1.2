import type { SessionUser } from "./session";
import { validateSessionUser } from "./session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in Supabase user for server code, or null when unauthenticated.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id || !user.email) {
      return null;
    }

    const displayName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : undefined;

    const base = validateSessionUser({ id: user.id, email: user.email });
    return displayName ? { ...base, displayName } : base;
  } catch {
    return null;
  }
}
