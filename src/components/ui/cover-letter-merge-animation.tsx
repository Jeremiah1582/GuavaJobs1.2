"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, FileText, Sparkles, User } from "lucide-react"

const CYCLE_PHASES = ["inputs", "merging", "generating"] as const
type MergePhase = (typeof CYCLE_PHASES)[number] | "complete"

/** Time on each phase before advancing (loops while loading). */
const PHASE_DURATION_MS = 2_400

type CoverLetterMergeAnimationProps = {
  /** Show the overlay panel (loading or complete). */
  active: boolean
  /** When true, stops the loop and shows the success state. */
  complete?: boolean
  className?: string
}

export function CoverLetterMergeAnimation({
  active,
  complete = false,
  className = "",
}: CoverLetterMergeAnimationProps) {
  const [phase, setPhase] = useState<MergePhase>("inputs")

  useEffect(() => {
    if (!active) {
      setPhase("inputs")
      return
    }

    if (complete) {
      setPhase("complete")
      return
    }

    setPhase("inputs")
    let index = 0

    const intervalId = window.setInterval(() => {
      index = (index + 1) % CYCLE_PHASES.length
      setPhase(CYCLE_PHASES[index])
    }, PHASE_DURATION_MS)

    return () => window.clearInterval(intervalId)
  }, [active, complete])

  if (!active) return null

  const isComplete = complete || phase === "complete"
  const showLetter = phase === "generating" || isComplete
  const showSparkles = isComplete || phase === "merging" || phase === "generating"

  return (
    <div
      className={`relative mx-auto w-full max-w-lg min-h-[280px] rounded-xl border border-border bg-muted/30 p-6 ${className}`}
      aria-live="polite"
      aria-busy={!isComplete}
    >
      <h3 className="text-center text-sm font-semibold text-foreground">
        {isComplete ? "Generation complete" : "Creating your cover letter"}
      </h3>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {isComplete
          ? "Your grounded letter is ready — review and edit before you apply."
          : "Merging job description with your profile"}
      </p>

      <div className="relative mt-8 min-h-[200px]">
        {!isComplete ? (
          <>
            <div
              className={`absolute left-0 top-0 w-[42%] transition-all duration-700 ease-out ${
                phase === "inputs"
                  ? "translate-y-0 opacity-100"
                  : phase === "merging"
                    ? "translate-x-[55%] scale-90 opacity-100"
                    : "scale-75 opacity-0"
              }`}
            >
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="size-4 text-accent" aria-hidden />
                  <span className="text-xs font-medium">Job description</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
                  <div className="h-2 w-4/5 animate-pulse rounded-full bg-muted [animation-delay:120ms]" />
                  <div className="h-2 w-3/5 animate-pulse rounded-full bg-muted/80 [animation-delay:240ms]" />
                </div>
              </div>
            </div>

            <div
              className={`absolute right-0 top-0 w-[42%] transition-all duration-700 ease-out delay-150 ${
                phase === "inputs"
                  ? "translate-y-0 opacity-100"
                  : phase === "merging"
                    ? "-translate-x-[55%] scale-90 opacity-100"
                    : "scale-75 opacity-0"
              }`}
            >
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <User className="size-4 text-guava-green" aria-hidden />
                  <span className="text-xs font-medium">Your profile</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-3/4 animate-pulse rounded-full bg-muted [animation-delay:80ms]" />
                  <div className="h-2 w-full animate-pulse rounded-full bg-muted [animation-delay:200ms]" />
                  <div className="h-2 w-2/3 animate-pulse rounded-full bg-muted/80 [animation-delay:320ms]" />
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div
          className={`absolute left-1/2 top-6 -translate-x-1/2 transition-all duration-500 ${
            showSparkles ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          {isComplete ? (
            <div className="flex size-12 items-center justify-center rounded-full bg-guava-green/15">
              <CheckCircle2 className="size-7 text-guava-green" aria-hidden />
            </div>
          ) : (
            <div className="flex size-12 animate-pulse items-center justify-center rounded-full bg-guava-pink-light">
              <Sparkles className="size-6 text-accent" aria-hidden />
            </div>
          )}
        </div>

        <div
          className={`absolute left-1/2 top-[88px] w-[88%] -translate-x-1/2 transition-all duration-700 ${
            showLetter ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div
            className={`relative overflow-hidden rounded-xl border bg-card p-4 shadow-md ${
              isComplete ? "border-guava-green/40" : "border-accent/30"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <FileText className="size-4 text-accent" aria-hidden />
              <span className="text-xs font-semibold">Cover letter</span>
            </div>
            <div className="space-y-2">
              {[100, 92, 88, 70].map((width, i) => (
                <div
                  key={width}
                  className={`h-2 rounded-full bg-foreground/15 transition-all duration-500 ${
                    isComplete ? "opacity-100" : "animate-pulse"
                  }`}
                  style={{
                    width: `${width}%`,
                    animationDelay: isComplete ? undefined : `${i * 120}ms`,
                  }}
                />
              ))}
            </div>
            {!isComplete ? (
              <div className="animate-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {isComplete && "You can review now or keep browsing jobs."}
        {!isComplete && phase === "inputs" && "Reading job requirements and your experience…"}
        {!isComplete && phase === "merging" && "Matching your background to the role…"}
        {!isComplete && phase === "generating" && "Writing your personalised letter…"}
      </p>

      {!isComplete ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/80">
          <span className="sr-only">Still working</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-accent/70"
              style={{ animationDelay: `${i * 160}ms` }}
              aria-hidden
            />
          ))}
          <span>This usually takes 15–30 seconds</span>
        </p>
      ) : null}
    </div>
  )
}
