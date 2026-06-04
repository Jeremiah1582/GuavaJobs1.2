import type { CoverLetterCitation } from "@/lib/applications"

type LetterGroundingPanelProps = {
  citations: CoverLetterCitation[]
}

export function LetterGroundingPanel({ citations }: LetterGroundingPanelProps) {
  if (citations.length === 0) return null

  return (
    <details className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Grounding — profile facts used ({citations.length})
      </summary>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {citations.map((citation, index) => (
          <li key={`${citation.field}-${index}`} className="border-l-2 border-accent/40 pl-3">
            <span className="font-medium text-foreground">{citation.field}</span>
            <p className="mt-0.5 italic">&ldquo;{citation.excerpt}&rdquo;</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
