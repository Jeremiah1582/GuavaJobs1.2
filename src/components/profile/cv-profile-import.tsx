"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  FileUp,
  Loader2,
  ScanLine,
} from "lucide-react"

import { ProfileImportPreview } from "@/components/profile/profile-import-preview"
import type { UrlImportApplyPayload } from "@/components/profile/url-import"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  apiErrorMessage,
  formatApiErrorDetails,
  type ApiErrorPayload,
} from "@/lib/format-api-error"
import type { ProfileUrlImportResult } from "@/lib/validators/profile-import"

type CvProfileImportProps = {
  cvFileUrl: string | null
  onImport: (data: UrlImportApplyPayload) => void
  className?: string
}

type PanelState = "idle" | "loading" | "preview" | "error"

function toApplyPayload(
  preview: ProfileUrlImportResult,
  sourceLabel: string,
): UrlImportApplyPayload {
  return {
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
    sourceUrl: sourceLabel,
  }
}

export function CvProfileImport({
  cvFileUrl,
  onImport,
  className,
}: CvProfileImportProps) {
  const [state, setState] = useState<PanelState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [preview, setPreview] = useState<ProfileUrlImportResult | null>(null)
  const [hasResumeScan, setHasResumeScan] = useState(false)
  const [resumeFilename, setResumeFilename] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/resume")
      .then((r) => r.json())
      .then((data: { resume?: { id?: string; filename?: string } }) => {
        if (cancelled) return
        if (data.resume?.id) {
          setHasResumeScan(true)
          setResumeFilename(data.resume.filename ?? "Latest scan")
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const parseResume = useCallback(
    async (body: { source: "profileCv" } | { source: "resume" }) => {
      setState("loading")
      setError(null)
      setErrorDetails(null)
      setPreview(null)

      let devDetails: string | null = null

      try {
        const response = await fetch("/api/profile/parse-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        const result = (await response.json()) as ApiErrorPayload & {
          data?: ProfileUrlImportResult
        }

        if (!response.ok) {
          const payload = result as ApiErrorPayload
          devDetails = formatApiErrorDetails(payload.details)
          throw new Error(apiErrorMessage(payload, "Failed to read CV"))
        }

        setPreview(result.data as ProfileUrlImportResult)
        setState("preview")
      } catch (err) {
        setState("error")
        setError(err instanceof Error ? err.message : "Failed to import from CV")
        setErrorDetails(devDetails)
      }
    },
    [],
  )

  const handleApply = () => {
    if (!preview) return
    const label =
      preview.pagesScanned[0]?.path ??
      (cvFileUrl ? "profile-cv" : "resume-scan")
    onImport(toApplyPayload(preview, label))
    setPreview(null)
    setState("idle")
    setError(null)
  }

  const handleReset = () => {
    setPreview(null)
    setState("idle")
    setError(null)
    setErrorDetails(null)
  }

  if (!cvFileUrl && !hasResumeScan) {
    return null
  }

  if (state === "preview" && preview) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-muted/40 to-muted/20 p-4",
          className,
        )}
      >
        <ProfileImportPreview
          preview={preview}
          onApply={handleApply}
          onBack={handleReset}
          backLabel="Cancel"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-4",
        className,
      )}
    >
      <p className="mb-3 text-sm font-medium text-foreground">
        Populate profile from your CV
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        Preview extracted fields, then apply them to the form. You still need to
        save your profile afterward.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {cvFileUrl ? (
          <Button
            type="button"
            variant="secondary"
            disabled={state === "loading"}
            onClick={() => void parseResume({ source: "profileCv" })}
            className="justify-start gap-2"
          >
            {state === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Use uploaded CV
          </Button>
        ) : null}

        {hasResumeScan ? (
          <Button
            type="button"
            variant="outline"
            disabled={state === "loading"}
            onClick={() => void parseResume({ source: "resume" })}
            className="justify-start gap-2"
          >
            {state === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
            Use latest resume scan
            {resumeFilename ? (
              <span className="text-muted-foreground">({resumeFilename})</span>
            ) : null}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 space-y-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
          {errorDetails ? (
            <details className="rounded-md border border-destructive/20 bg-background/80 p-2 text-xs text-foreground">
              <summary className="cursor-pointer font-medium text-destructive">
                Developer details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">
                {errorDetails}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {!cvFileUrl && hasResumeScan ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: upload a CV in the section below to import directly from your
          file.
        </p>
      ) : null}
    </div>
  )
}
