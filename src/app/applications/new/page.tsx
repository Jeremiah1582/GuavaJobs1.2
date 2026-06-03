import Link from "next/link"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createManualApplicationAction } from "@/lib/applications/create-manual"
import { getSession } from "@/lib/auth/get-session"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Add application",
}

export default async function NewApplicationPage() {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in?next=/applications/new")
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:px-6">
      <PageHeader
        title="Add job manually"
        description="Save a role that is not on the job board — include URL, source, and location when you have them."
      />

      <form action={createManualApplicationAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Job title</Label>
          <Input id="title" name="title" required maxLength={200} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" required maxLength={200} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobUrl">Job URL (optional)</Label>
          <Input
            id="jobUrl"
            name="jobUrl"
            type="url"
            placeholder="https://…"
            maxLength={2000}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source (optional)</Label>
          <Input
            id="source"
            name="source"
            placeholder="LinkedIn, company site, recruiter…"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location (optional)</Label>
          <Input id="location" name="location" placeholder="City, remote, hybrid…" maxLength={200} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="appliedAt">Date applied (optional)</Label>
          <Input id="appliedAt" name="appliedAt" type="date" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <textarea
            id="description"
            name="description"
            rows={8}
            maxLength={50000}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Paste the job description or notes…"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            className="bg-guava-pink-gradient text-accent-foreground hover:opacity-90"
          >
            Save as draft
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
