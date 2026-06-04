"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/** Dev-only demo toast — hidden in production builds. */
export function HomeDemoToast() {
  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() =>
        toast.success("Guavajobs app is ready", {
          description: "Toasts wired for F2+ flows.",
        })
      }
    >
      Test toast (dev)
    </Button>
  )
}
