"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function ApplicationGeneratedToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const hasShownToastRef = useRef(false)

  const generated = searchParams.get("generated")
  const queryString = searchParams.toString()

  useEffect(() => {
    hasShownToastRef.current = false
  }, [pathname])

  useEffect(() => {
    if (generated !== "1") return

    if (!hasShownToastRef.current) {
      hasShownToastRef.current = true
      toast.success("Cover letter ready — review and edit below.")
    }

    const params = new URLSearchParams(queryString)
    params.delete("generated")
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [generated, queryString, pathname, router])

  return null
}
