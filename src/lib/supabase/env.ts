export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabasePublishableKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** @deprecated use `isSupabaseAdminConfigured` */
export const isSupabaseConfigured = isSupabaseAdminConfigured;
