import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign in — InternHunt",
  description: "Sign in to your InternHunt account.",
};

export default function SignInPage() {
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
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to track applications, jobs, and your profile.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <AuthForm mode="sign-in" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
