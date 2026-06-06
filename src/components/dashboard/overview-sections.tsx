"use client"

import Link from "next/link"
import { Children, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  FileUp,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react"

import { GlassCard } from "@/components/dashboard/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { ApplicationListItem } from "@/lib/applications"
import { formatApplicationStatusLabel, getApplicationRowClass } from "@/lib/applications"
import type { GettingStartedState } from "@/lib/dashboard/getting-started"
import { cn } from "@/lib/utils"

const stepIcons = [FileUp, Search, Sparkles] as const

// ——— Stagger animation wrapper ———

export function OverviewSections({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="flex flex-col gap-12 md:gap-16">{children}</div>
  }

  return (
    <motion.div
      className="flex flex-col gap-12 md:gap-16"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      {Children.toArray(children).map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// ——— Getting started ———

export function GettingStartedSection({ state }: { state: GettingStartedState }) {
  const reduceMotion = useReducedMotion()
  if (state.allComplete) return null

  return (
    <section aria-labelledby="getting-started-heading" className="space-y-5">
      <div>
        <h2 id="getting-started-heading" className="text-lg font-semibold tracking-tight">
          Your path to the first application
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Three focused steps — no clutter, just momentum.</p>
      </div>
      <ol className="relative flex flex-col gap-4 lg:flex-row lg:gap-0">
        <div
          className="pointer-events-none absolute left-[1.65rem] top-10 hidden h-[calc(100%-5rem)] w-px bg-border lg:left-[calc(33.33%-0.5px)] lg:top-12 lg:block lg:h-px lg:w-[calc(66.66%-4rem)]"
          aria-hidden
        />
        {state.steps.map((step, index) => {
          const Icon = stepIcons[index]!
          const isPink = step.current
          const isGreen = step.complete
          return (
            <motion.li
              key={step.number}
              className="relative flex-1"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.07, duration: 0.35 }}
            >
              <GlassCard
                variant={isGreen ? "green" : isPink ? "pink" : "neutral"}
                className={cn(
                  "group flex h-full flex-col p-5 md:p-6 lg:mx-2 lg:first:ml-0 lg:last:mr-0",
                  step.current && "ring-1 ring-guava-pink/25",
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-transform duration-300 group-hover:scale-105",
                      isGreen
                        ? "bg-guava-green-gradient text-white"
                        : isPink
                          ? "bg-guava-pink-gradient text-accent-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isGreen ? <Check /> : step.number}
                  </span>
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isGreen ? "text-guava-green" : isPink ? "text-guava-pink" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                </div>
                <h3 className="text-sm font-semibold leading-snug md:text-base">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "mt-5 w-full gap-1.5",
                    step.current
                      ? "bg-guava-pink-gradient text-accent-foreground hover:opacity-90"
                      : step.complete
                        ? "bg-guava-green/10 text-guava-green-dark hover:bg-guava-green/15"
                        : "",
                  )}
                  variant={step.current || step.complete ? "default" : "secondary"}
                >
                  <Link href={step.href}>
                    {step.complete ? "View" : step.current ? "Continue" : "Start"}
                    <ArrowRight />
                  </Link>
                </Button>
              </GlassCard>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}

// ——— Recent applications ———

function appStatusLabel(app: ApplicationListItem): string {
  if (app.rejectionPhase) return "Rejected"
  return formatApplicationStatusLabel(app.status)
}

function appAccentTone(app: ApplicationListItem): "pink" | "green" | "muted" {
  if (app.rejectionPhase) return "muted"
  if (app.status === "OFFER" || app.status === "ACCEPTED") return "green"
  return "pink"
}

export function RecentApplicationsSection({ applications }: { applications: ApplicationListItem[] }) {
  const recent = applications.slice(0, 3)

  if (recent.length === 0) {
    return (
      <GlassCard variant="neutral" className="flex flex-col items-center gap-6 p-10 text-center md:p-14">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-guava-pink/10">
          <Briefcase className="text-guava-pink" />
        </div>
        <div className="max-w-sm space-y-2">
          <p className="text-lg font-semibold tracking-tight">No applications yet</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Browse matched listings and track a role — your pipeline will appear here instantly.
          </p>
        </div>
        <Button asChild className="bg-guava-pink-gradient text-accent-foreground hover:opacity-90">
          <Link href="/dashboard/jobs">
            Browse job listings
            <ArrowRight />
          </Link>
        </Button>
      </GlassCard>
    )
  }

  return (
    <section aria-labelledby="recent-apps-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="recent-apps-heading" className="text-lg font-semibold tracking-tight">
            Recent applications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Last 3 updates — details & letters</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <Link href="/dashboard/applications">
            View all
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <ul className="flex flex-col gap-3">
        {recent.map((app) => {
          const tone = appAccentTone(app)
          return (
            <li key={app.id}>
              <Link href={`/dashboard/applications/${app.id}`} className="group block">
                <GlassCard
                  variant="neutral"
                  className={cn(
                    "flex gap-4 p-4 transition-[transform,box-shadow] duration-300 hover:translate-x-px sm:items-center sm:p-5",
                    getApplicationRowClass(app.status, app.rejectionPhase),
                  )}
                >
                  <div
                    className={cn(
                      "dashboard-accent-rail hidden sm:block",
                      tone === "pink" && "dashboard-accent-rail--pink",
                      tone === "green" && "dashboard-accent-rail--green",
                      tone === "muted" && "dashboard-accent-rail--muted",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium transition-colors group-hover:text-guava-pink-dark">
                      {app.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{app.company}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-current/15 bg-background/60">
                    {appStatusLabel(app)}
                  </Badge>
                </GlassCard>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ——— Collapsible more tools ———

export function MoreToolsSection() {
  return (
    <Collapsible defaultOpen={false} className="group">
      <GlassCard variant="neutral" className="overflow-hidden">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/20 md:p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">More tools</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Resume scan & career coach — helpful extras, not required to get started
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-2 border-t border-border/30 p-4 md:grid-cols-2 md:gap-3 md:p-6">
            <Link
              href="/dashboard/resume"
              className="flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-guava-green-light/30"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-guava-green-gradient text-white shadow-sm">
                <FileText />
              </span>
              <div>
                <p className="text-sm font-medium">Resume ATS scan</p>
                <p className="text-xs text-muted-foreground">Score your CV document</p>
              </div>
            </Link>
            <Link
              href="/dashboard/chat"
              className="flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-guava-pink-light/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-guava-pink-gradient text-accent-foreground shadow-sm">
                <MessageSquare />
              </span>
              <div>
                <p className="text-sm font-medium">Career coach</p>
                <p className="text-xs text-muted-foreground">AI interview prep</p>
              </div>
            </Link>
          </div>
        </CollapsibleContent>
      </GlassCard>
    </Collapsible>
  )
}
