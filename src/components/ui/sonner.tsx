"use client"

import { Toaster as Sonner } from "sonner"

export function AppToaster() {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-popover text-popover-foreground border-border",
        },
      }}
    />
  )
}
