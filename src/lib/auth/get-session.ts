import type { SessionUser } from "./session";

/**
 * Wave 0 stub — always returns null until Wave 1 (Supabase Auth + `@supabase/ssr`).
 * Application Hub and profile server actions redirect or 401 when null.
 */
export async function getSession(): Promise<SessionUser | null> {
  return null;
}
