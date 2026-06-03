import type { ProfileCompleteness } from "@guavajobs/core"

type ProfileCompletenessProps = {
  completeness: ProfileCompleteness
}

export function ProfileCompletenessBar({
  completeness,
}: ProfileCompletenessProps) {
  const { percent, missing } = completeness

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Profile completeness</span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {percent < 80 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Complete your profile for better AI cover letters. Still needed:{" "}
          {missing.join(", ")}.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Great — your profile is ready to ground AI cover letters.
        </p>
      )}
    </div>
  )
}
