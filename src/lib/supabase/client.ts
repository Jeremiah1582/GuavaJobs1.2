"use client";

import { createBrowserClient } from "@supabase/ssr";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "./env";

export function createBrowserSupabaseClient() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Supabase browser client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
