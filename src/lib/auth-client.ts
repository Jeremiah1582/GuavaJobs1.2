// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [emailOTPClient()],
});

// Named exports for convenience
export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;