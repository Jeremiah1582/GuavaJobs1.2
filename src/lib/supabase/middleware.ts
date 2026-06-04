import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "./env";

export type AuthRouteGuardOptions = {
  /** When true, redirect unauthenticated users away from /dashboard/* */
  protectDashboard?: boolean;
};

const PUBLIC_AUTH_PATHS = ["/sign-in", "/sign-up", "/auth/callback", "/login"];

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}

export async function updateSession(
  request: NextRequest,
  options: AuthRouteGuardOptions = {},
) {
  const { protectDashboard = false } = options;

  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseBrowserConfigured()) {
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = PUBLIC_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isDashboard = pathname.startsWith("/dashboard");

  if (protectDashboard && isDashboard && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("next", pathname);
    return { response: NextResponse.redirect(signInUrl), user: null };
  }

  if (protectDashboard && isAuthPage && user) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const target = request.nextUrl.clone();
    target.pathname = next ?? "/dashboard";
    target.search = "";
    return { response: NextResponse.redirect(target), user };
  }

  return { response: supabaseResponse, user };
}
