"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

type ProgressRingVariant = "green" | "pink"

type ProgressRingProps = {
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
  variant?: ProgressRingVariant
  compact?: boolean
  showLabel?: boolean
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  className,
  label = "complete",
  variant = "green",
  compact = false,
  showLabel = true,
}: ProgressRingProps) {
  const gradientId = useId()
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference
  const isPink = variant === "pink"

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percent}% ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={isPink ? "text-guava-pink-light" : "text-guava-green-light"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={
                isPink ? "var(--guava-pink-gradient-from)" : "var(--guava-green-gradient-from)"
              }
            />
            <stop
              offset="100%"
              stopColor={isPink ? "var(--guava-pink-gradient-to)" : "var(--guava-green-gradient-to)"}
            />
          </linearGradient>
        </defs>
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center",
          compact ? "gap-0" : "gap-0.5",
        )}
      >
        <span
          className={cn(
            "font-semibold tabular-nums text-foreground",
            compact ? "text-sm leading-none" : "text-2xl",
          )}
        >
          {compact ? percent : `${percent}%`}
        </span>
        {showLabel && !compact ? (
          <span className="text-xs text-muted-foreground">{label}</span>
        ) : null}
        {showLabel && compact ? (
          <span className="text-[9px] leading-none text-muted-foreground">{label}</span>
        ) : null}
      </div>
    </div>
  )
}
