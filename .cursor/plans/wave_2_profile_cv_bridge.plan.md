---
name: Wave 2 Profile CV
overview: Wire the existing profile UI and services into the dashboard, add resume-to-profile sync with merge/overwrite rules from NOTES.md, and validate Storage upload.
todos:
  - id: w2-1-profile-page
    content: "W2.1: RSC dashboard/profile page — getSession, ensureUser, ProfileForm + ProfileCompletenessBar"
    status: completed
  - id: w2-4-cv-upload-qa
    content: "W2.4: Manual QA uploadCvAction from profile form; fix errors if any"
    status: completed
  - id: w2-3-storage
    content: "W2.3: Confirm cv-uploads via storage:ensure; document resumes bucket deferred"
    status: completed
  - id: w2-5-sync-lib
    content: "W2.5: Add sync-from-resume.ts + applyResumeToProfileAction (merge/overwrite)"
    status: completed
  - id: w2-6-resume-ui
    content: "W2.6: Resume page post-scan flow — auto merge if <100%, AlertDialog if 100%"
    status: completed
  - id: w2-verify-docs
    content: Run W2 verify gates; tick MASTER_BUILD_PLAN checkboxes
    status: completed
isProject: false
---

# Wave 2 — Profile + CV bridge (detailed build plan)

created_date: 2026-06-04 19:00:00, updated_at: 2026-06-04 19:00:00

## Context

**Done:** Waves 0–1 (Postgres, `src/lib/profile/*`, Supabase Auth, `cv-uploads` bucket script).

**Gap:** [`src/app/dashboard/profile/page.tsx`](../src/app/dashboard/profile/page.tsx) is a placeholder, but [`ProfileForm`](../src/components/profile/profile-form.tsx) and [`profileService`](../src/lib/profile/service.ts) are fully ported. Resume scanner works via [`/api/resume/upload`](../src/app/api/resume/upload/route.ts) but does not update `Profile`.

**Product rule** ([`NOTES.md`](../NOTES.md)): CV scan should pre-fill profile; if profile is **100% complete**, ask before overwrite.

## Execution order

| Step | ID | Why |
|------|-----|-----|
| 1 | W2.1 | Unblocks profile QA and W2.4 |
| 2 | W2.4 | Test CV upload through live UI |
| 3 | W2.3 | Confirm bucket (mostly done) |
| 4 | W2.5 | Server mapping + action |
| 5 | W2.6 | Resume UI hook |
| — | W2.2 | Already complete |

## W2.1 — Profile page

**Wire, don't rewrite.** `ProfileForm` already includes `UrlImport`, completeness, server actions.

1. Async RSC: `getSession` → redirect; `ensureUser`; `getOrCreateForUser`; `getByUserId`
2. Render `ProfileCompletenessBar` + `ProfileForm initialProfile={profile}`
3. `export const dynamic = "force-dynamic"`

## W2.5 — sync-from-resume.ts

- Parse Resume JSON fields → `ProfileUpdateInput`
- `merge`: fill empty profile fields only
- `overwrite`: replace summary/skills/experience/education
- `applyResumeToProfileAction(resumeId, mode)` in `actions.ts`

## W2.6 — Resume page

After upload success:

- `percent < 100` → `applyResumeToProfileAction(id, "merge")` + toast
- `percent === 100` → `AlertDialog` → confirm `overwrite` or skip

Use `computeCompleteness().percent === 100` from profileService.

## Verify W2

- [ ] Profile save persists
- [ ] CV upload to `cv-uploads`
- [ ] Scan merges profile when &lt; 100%
- [ ] Scan prompts when 100%
- [ ] `npm run build`

See [MASTER_BUILD_PLAN.md](../docs/MASTER_BUILD_PLAN.md) § Wave 2 for full “How to implement” blocks.
