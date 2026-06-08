"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const PROFILE_SECTIONS = [
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "career", label: "Career" },
  { id: "preferences", label: "Preferences" },
  { id: "cv", label: "CV" },
] as const

export function ProfileSectionNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Profile sections"
      className={cn(
        "sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur-md md:-mx-8 md:px-8",
        className,
      )}
    >
      <ul className="flex gap-0.5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROFILE_SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className="inline-flex rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ProfileSection({
  id,
  title,
  description,
  children,
  action,
  className,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 space-y-4 border-b border-border/50 py-8 last:border-b-0", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
