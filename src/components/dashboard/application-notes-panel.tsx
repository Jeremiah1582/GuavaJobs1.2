"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { addApplicationNoteAction } from "@/lib/applications/actions"
import type { ApplicationNoteDto } from "@/lib/applications"
import { toast } from "sonner"

type ApplicationNotesPanelProps = {
  applicationId: string
  initialNotes: ApplicationNoteDto[]
}

export function ApplicationNotesPanel({
  applicationId,
  initialNotes,
}: ApplicationNotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])
  const [draft, setDraft] = useState("")
  const [showAll, setShowAll] = useState(false)
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const visible = showAll ? notes : notes.slice(0, 5)

  function onSave() {
    const body = draft.trim()
    if (!body) return

    startTransition(async () => {
      try {
        await addApplicationNoteAction(applicationId, body)
        setDraft("")
        toast.success("Note added")
        router.refresh()
      } catch {
        toast.error("Could not add note")
      }
    })
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">Notes</h2>
      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Add interview prep, recruiter details, or follow-up reminders.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(note.updatedAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 5 ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-accent hover:underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show fewer" : `Show ${notes.length - 5} more`}
        </button>
      ) : null}
      <textarea
        rows={4}
        className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Add a note…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        className="mt-2 bg-guava-pink-gradient text-accent-foreground hover:opacity-90"
        disabled={pending || !draft.trim()}
        onClick={onSave}
      >
        Save note
      </Button>
    </div>
  )
}
