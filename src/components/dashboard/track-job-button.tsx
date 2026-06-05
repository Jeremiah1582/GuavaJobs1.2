"use client"

import { useFormStatus } from "react-dom"
import { Briefcase, Loader2 } from "lucide-react"

export function TrackJobButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Tracking…
        </>
      ) : (
        <>
          <Briefcase className="size-3" aria-hidden />
          Track application
        </>
      )}
    </button>
  )
}
