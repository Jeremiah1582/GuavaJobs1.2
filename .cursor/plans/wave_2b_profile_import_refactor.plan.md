---
name: Wave 2B Profile import
overview: Remove ATS→profile bridge; URL import unchanged; CV populate via existing upload + CvProfileImport.
todos:
  - id: w2b-1-remove-ats-bridge
    content: "W2B.1: Remove resume page merge/overwrite + AlertDialog"
    status: completed
  - id: w2b-2-cleanup-actions
    content: "W2B.2: Remove applyResumeToProfileAction + sync-from-resume"
    status: completed
  - id: w2b-3-parse-resume-api
    content: "W2B.3: POST /api/profile/parse-resume (profileCv | resume)"
    status: completed
  - id: w2b-4-profile-import-ui
    content: "W2B.4: CvProfileImport — url-import.tsx unchanged"
    status: completed
  - id: w2b-5-notes-docs
    content: "W2B.5: Update MASTER_BUILD_PLAN + verify build"
    status: completed
isProject: false
---

# Wave 2B — Profile import refactor (pre–Wave 3)

created_date: 2026-06-04 23:00:00, updated_at: 2026-06-05 00:15:00

## Rationale

| Tool | Purpose |
|------|---------|
| **ATS Resume Analyzer** | Scoring only — never writes profile |
| **URL import** | Unchanged — [`url-import.tsx`](../../src/components/profile/url-import.tsx) |
| **CV → profile** | Existing **CV File** upload → **Use uploaded CV** in [`cv-profile-import.tsx`](../../src/components/profile/cv-profile-import.tsx) |

**No** second PDF picker on the import panel.

## Shipped

- Removed ATS → profile bridge on `/dashboard/resume`
- Deleted `sync-from-resume.ts` and server actions `applyResumeToProfileAction` / `getProfileCompletenessAction`
- `POST /api/profile/parse-resume` with `{ source: "profileCv" }` | `{ source: "resume" }`
- `CvProfileImport` component wired in `profile-form.tsx`
