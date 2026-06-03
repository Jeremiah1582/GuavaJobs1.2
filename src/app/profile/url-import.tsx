"use client"

import { useState } from "react"
import {
  Globe,
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ProfileUrlImportResult } from "@guavajobs/core"
import {
  apiErrorMessage,
  formatApiErrorDetails,
  type ApiErrorPayload,
} from "@/lib/format-api-error"

export type UrlImportApplyPayload = Pick<
  ProfileUrlImportResult,
  | "name"
  | "headline"
  | "summary"
  | "location"
  | "phone"
  | "avatarUrl"
  | "websiteUrl"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "region"
  | "postalCode"
  | "country"
  | "skills"
  | "experience"
  | "education"
  | "quiz"
  | "confidence"
  | "pagesScanned"
> & {
  sourceUrl: string
}

type UrlImportProps = {
  onImport: (data: UrlImportApplyPayload) => void
  className?: string
}

type ImportState =
  | "idle"
  | "input"
  | "loading"
  | "preview"
  | "error"

function parseAdditionalPaths(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function confidenceLabel(confidence: ProfileUrlImportResult["confidence"]) {
  switch (confidence) {
    case "high":
      return { text: "High confidence", className: "text-guava-green" }
    case "medium":
      return { text: "Medium confidence — please review", className: "text-amber-600 dark:text-amber-400" }
    default:
      return { text: "Low confidence — review carefully", className: "text-destructive" }
  }
}

export function UrlImport({ onImport, className }: UrlImportProps) {
  const [url, setUrl] = useState("")
  const [extraPaths, setExtraPaths] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [state, setState] = useState<ImportState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [preview, setPreview] = useState<ProfileUrlImportResult | null>(null)
  const [loadingHint, setLoadingHint] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }

    try {
      new URL(url)
    } catch {
      setError("Please enter a valid URL (e.g. https://yoursite.com/cv)")
      return
    }

    setState("loading")
    setError(null)
    setErrorDetails(null)
    setPreview(null)
    setLoadingHint("Loading your page and related sections…")

    let devDetails: string | null = null

    try {
      const additionalPaths = parseAdditionalPaths(extraPaths)
      const response = await fetch("/api/profile/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, additionalPaths }),
      })

      const result = (await response.json()) as ApiErrorPayload & {
        data?: ProfileUrlImportResult
      }

      if (!response.ok) {
        const payload = result as ApiErrorPayload
        devDetails = formatApiErrorDetails(payload.details)
        throw new Error(apiErrorMessage(payload, "Failed to parse profile"))
      }

      setPreview(result.data as ProfileUrlImportResult)
      setState("preview")
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "Failed to import profile")
      setErrorDetails(devDetails)
    }
  }

  const handleApply = () => {
    if (!preview) return
    onImport({
      name: preview.name,
      headline: preview.headline,
      summary: preview.summary,
      location: preview.location,
      phone: preview.phone,
      avatarUrl: preview.avatarUrl,
      websiteUrl: preview.websiteUrl,
      addressLine1: preview.addressLine1,
      addressLine2: preview.addressLine2,
      city: preview.city,
      region: preview.region,
      postalCode: preview.postalCode,
      country: preview.country,
      skills: preview.skills,
      experience: preview.experience,
      education: preview.education,
      quiz: preview.quiz,
      confidence: preview.confidence,
      pagesScanned: preview.pagesScanned,
      sourceUrl: url.trim(),
    })
    setUrl("")
    setExtraPaths("")
    setPreview(null)
    setState("idle")
  }

  const handleCancel = () => {
    setUrl("")
    setExtraPaths("")
    setState("idle")
    setError(null)
    setErrorDetails(null)
    setPreview(null)
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("input")}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-gradient-to-br from-muted/30 to-muted/10 p-4 text-left transition-all duration-700 hover:border-accent/50 hover:from-guava-pink-light/30 hover:to-muted/10",
          className,
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-guava-pink-gradient text-accent-foreground transition-transform duration-700 group-hover:scale-110">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Import from your website</p>
          <p className="text-sm text-muted-foreground">
            Paste your portfolio or CV page — we scan related pages (About,
            Experience, Resume) on the same site
          </p>
        </div>
        <Globe className="size-5 shrink-0 text-muted-foreground transition-colors duration-700 group-hover:text-accent" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-guava-pink-light/40 to-muted/20 transition-all duration-700",
        className,
      )}
    >
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-guava-pink-gradient text-accent-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-medium text-foreground">Import from URL</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="size-8"
            disabled={state === "loading"}
          >
            <X className="size-4" />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>

        {state === "preview" && preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="size-4 text-guava-green" />
              <span
                className={cn(
                  "text-sm font-medium",
                  confidenceLabel(preview.confidence).className,
                )}
              >
                {confidenceLabel(preview.confidence).text}
              </span>
            </div>

            {preview.pagesScanned.length > 0 ? (
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Pages scanned on your site
                </p>
                <ul className="flex flex-wrap gap-2">
                  {preview.pagesScanned.map((page) => (
                    <li
                      key={page.url}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs",
                        page.ok
                          ? "bg-guava-green-light/50 text-foreground"
                          : "bg-muted text-muted-foreground line-through",
                      )}
                    >
                      <FileText className="size-3" />
                      {page.path}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="grid gap-2 text-sm">
              {preview.summary ? (
                <div>
                  <dt className="font-medium text-foreground">Summary</dt>
                  <dd className="line-clamp-3 text-muted-foreground">
                    {preview.summary}
                  </dd>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-4">
                <div>
                  <dt className="font-medium text-foreground">Roles</dt>
                  <dd className="text-muted-foreground">
                    {preview.experience.length}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Skills</dt>
                  <dd className="text-muted-foreground">
                    {preview.skills.length}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Education</dt>
                  <dd className="text-muted-foreground">
                    {preview.education.length}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleApply}
                className="bg-guava-pink-gradient text-accent-foreground"
              >
                Apply to profile
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPreview(null)
                  setState("input")
                }}
              >
                Try another URL
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://yoursite.com or …/cv"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (error) setError(null)
                    if (errorDetails) setErrorDetails(null)
                    if (state === "error") setState("input")
                  }}
                  className="pl-10"
                  disabled={state === "loading"}
                />
              </div>
              <Button
                type="submit"
                disabled={state === "loading" || !url.trim()}
                className="min-w-[100px]"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Reading
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Import
                  </>
                )}
              </Button>
            </div>

            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Hide" : "Add"} extra page paths on your site
            </button>

            {showAdvanced ? (
              <div className="space-y-1.5">
                <Label htmlFor="extra-paths" className="text-xs text-muted-foreground">
                  Same-site paths (comma or newline), e.g. /work, /about-me
                </Label>
                <Input
                  id="extra-paths"
                  value={extraPaths}
                  onChange={(e) => setExtraPaths(e.target.value)}
                  placeholder="/experience, /resume"
                  disabled={state === "loading"}
                />
              </div>
            ) : null}

            {error ? (
              <div className="space-y-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p className="whitespace-pre-wrap">{error}</p>
                </div>
                {errorDetails ? (
                  <details className="rounded-md border border-destructive/20 bg-background/80 p-2 text-xs text-foreground">
                    <summary className="cursor-pointer font-medium text-destructive">
                      Developer details
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                      {errorDetails}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : null}

            {state === "loading" ? (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                {loadingHint}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tip: If your CV lives at a sub-page, paste that URL directly. We
                also follow common routes like /about, /resume, and /experience.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
