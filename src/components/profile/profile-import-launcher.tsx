"use client"

import { useState } from "react"
import { FileUp, Globe, Sparkles } from "lucide-react"

import { CvProfileImport } from "@/components/profile/cv-profile-import"
import { UrlImport, type UrlImportApplyPayload } from "@/components/profile/url-import"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ProfileImportLauncherProps = {
  cvFileUrl: string | null
  onImport: (data: UrlImportApplyPayload) => void
  className?: string
}

type ImportTab = "url" | "cv"

export function ProfileImportLauncher({
  cvFileUrl,
  onImport,
  className,
}: ProfileImportLauncherProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ImportTab>("url")

  function handleImport(data: UrlImportApplyPayload) {
    onImport(data)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "h-10 w-full gap-2 border-dashed border-guava-pink/40 bg-guava-pink-light/20 text-foreground shadow-none hover:border-guava-pink/60 hover:bg-guava-pink-light/35 sm:w-auto",
          className,
        )}
      >
        <Sparkles className="size-4 text-guava-pink" aria-hidden />
        Import from website or CV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import profile data</DialogTitle>
            <DialogDescription>
              Pull fields from a portfolio URL or your uploaded CV — review before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setTab("url")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === "url"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Globe className="size-4" aria-hidden />
              Website
            </button>
            <button
              type="button"
              onClick={() => setTab("cv")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === "cv"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileUp className="size-4" aria-hidden />
              CV file
            </button>
          </div>

          <div className="min-h-[200px]">
            {tab === "url" ? (
              <UrlImport embedded onImport={handleImport} />
            ) : (
              <CvProfileImport
                embedded
                cvFileUrl={cvFileUrl}
                onImport={handleImport}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
