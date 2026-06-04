"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function TrackedToast() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("tracked") === "1") {
      toast.success("Application saved as draft", {
        description: "Expand a row below to add notes or update its status.",
      })
      const url = new URL(window.location.href)
      url.searchParams.delete("tracked")
      window.history.replaceState({}, "", url.pathname)
    }
  }, [searchParams])

  return null
}
