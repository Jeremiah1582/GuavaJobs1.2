import Link from "next/link"

type ApplicationCvSectionProps = {
  cvFileUrl: string | null
}

export function ApplicationCvSection({ cvFileUrl }: ApplicationCvSectionProps) {
  return (
    <section className="mt-10 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">CV for this application</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Attach the CV version you want to use for this role. Full per-application CV AI comes in a
        later release.
      </p>
      {cvFileUrl ? (
        <p className="mt-3 text-sm">
          Profile CV on file:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cvFileUrl}</code>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No CV uploaded on your profile yet.</p>
      )}
      <Link
        href="/dashboard/profile"
        className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        Upload CV on profile →
      </Link>
    </section>
  )
}
