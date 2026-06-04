import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign up — InternHunt",
  description: "Create your InternHunt account.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight text-foreground"
          >
            InternHunt
          </Link>
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Email and password — same account for dashboard and Application Hub.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <AuthForm mode="sign-up" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
