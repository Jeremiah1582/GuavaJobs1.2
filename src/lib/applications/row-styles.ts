export type ApplicationStatus =
  | "DRAFT"
  | "APPLIED"
  | "WAITING"
  | "INTERVIEW"
  | "OFFER"
  | "ACCEPTED"

export type ApplicationRejectionPhase = "PRE_INTERVIEW" | "POST_INTERVIEW"

function statusTint(status: ApplicationStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-muted/60"
    case "APPLIED":
      return "bg-yellow-50 dark:bg-yellow-950/25"
    case "WAITING":
      return "bg-amber-50 dark:bg-amber-950/30"
    case "INTERVIEW":
      return "bg-sky-50 dark:bg-sky-950/30"
    case "OFFER":
      return "bg-blue-100 dark:bg-blue-950/35"
    case "ACCEPTED":
      return "bg-emerald-50 dark:bg-emerald-950/30"
    default:
      return "bg-muted/60"
  }
}

/** Row background + text classes for tracker tables (V2 colour system). */
export function getApplicationRowClass(
  status: ApplicationStatus,
  rejectionPhase?: ApplicationRejectionPhase | null,
): string {
  if (rejectionPhase === "PRE_INTERVIEW") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200"
  }
  if (rejectionPhase === "POST_INTERVIEW") {
    return `${statusTint(status)} text-red-700 opacity-60 dark:text-red-300`
  }

  switch (status) {
    case "DRAFT":
      return "bg-muted/60 text-foreground"
    case "APPLIED":
      return "bg-yellow-50 text-foreground dark:bg-yellow-950/25"
    case "WAITING":
      return "bg-amber-50 text-foreground dark:bg-amber-950/30"
    case "INTERVIEW":
      return "bg-sky-50 text-foreground dark:bg-sky-950/30"
    case "OFFER":
      return "bg-blue-100 text-foreground dark:bg-blue-950/35"
    case "ACCEPTED":
      return "bg-emerald-50 text-blue-800 dark:bg-emerald-950/30 dark:text-blue-300"
    default:
      return "bg-muted/60 text-foreground"
  }
}
