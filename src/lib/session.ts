// src/lib/session.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user;
}