import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type GlassCardVariant = "neutral" | "pink" | "green"

type GlassCardProps = {
  children: ReactNode
  className?: string
  variant?: GlassCardVariant
  as?: "div" | "article" | "section"
}

const variantClass: Record<GlassCardVariant, string> = {
  neutral: "glass-panel glass-surface",
  pink: "glass-panel glass-surface glass-surface-pink",
  green: "glass-panel glass-surface glass-surface-green",
}

export function GlassCard({
  children,
  className,
  variant = "neutral",
  as: Comp = "div",
}: GlassCardProps) {
  return (
    <Comp className={cn("rounded-2xl", variantClass[variant], className)}>
      {children}
    </Comp>
  )
}
