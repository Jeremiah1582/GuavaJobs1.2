import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Guard /dashboard when not explicitly disabled (sign-in ships in Wave 1). */
const PROTECT_DASHBOARD =
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_GUARD !== "false";

export async function middleware(request: NextRequest) {
  const { response } = await updateSession(request, {
    protectDashboard: PROTECT_DASHBOARD,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
