"use client";

import { signOutAction } from "@/lib/auth/actions";

type SignOutButtonProps = {
  className?: string;
  children: React.ReactNode;
};

export function SignOutButton({ className, children }: SignOutButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void signOutAction();
      }}
    >
      {children}
    </button>
  );
}
