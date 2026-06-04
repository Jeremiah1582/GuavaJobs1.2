created_date: 2026-06-03 12:00:00, updated_at: 2026-06-04 22:30:00

# InternHunt — Master Build Plan

> **For AI agents:** Start at [§1 How to execute](#1-how-to-execute-this-plan), then the [§3 Task backlog](#3-task-backlog-bite-sized). Read [`NOTES.md`](../NOTES.md) + [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md). After Phase 0: **never** import `@guavajobs/core` or keep a `core/` package.

---

## 1. How to execute this plan

### 1.1 Rules

1. Complete tasks **in order within each wave**; do not skip waves.  
2. **One wave ≈ one focused PR** (or one agent session) when possible.  
3. Run **Verify** steps at the end of each wave before starting the next.  
4. Mark tasks `[x]` in this file when done (optional but helps handoff).  
5. If a task fails, fix before continuing — do not stack broken layers.

### 1.1a Implementation notes (for AI / dev)

When a wave includes a **How to implement** block, follow it before inventing new architecture. Prefer **wiring existing code** over rewriting. Standard patterns in this repo:

| Pattern | Use when |
|---------|----------|
| **RSC page + client form** | Dashboard pages: server loads data with `getSession()` → `usersService.ensureUser()` → service → pass DTO to `"use client"` child |
| **Server Actions** | Mutations from forms: `src/lib/*/actions.ts` with `getSession`, Zod/`profileUpdateSchema`, `revalidatePath` |
| **Route Handlers** | External/legacy JSON APIs (`/api/jobs`, `/api/resume`) or streaming |
| **No new packages** | Unless the plan explicitly says so |

Full Wave 2 execution detail: [`.cursor/plans/wave_2_profile_cv_bridge.plan.md`](../.cursor/plans/wave_2_profile_cv_bridge.plan.md) (create/update when planning W2).

### 1.2 Critical path (what blocks what)

```
Wave 0A Schema + migrate     ─┐
Wave 0B Prisma client        ─┼─► Wave 0C Port core → src/lib
Wave 0D API helpers          ─┘         │
                                        ▼
                               Wave 0E Rewire 34 imports + jobs/resume APIs
                                        │
                                        ▼
                               Wave 1  Supabase Auth (MUST before manual QA)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              Wave 2 Profile    Wave 3 App backend   (parallel after 1)
                    │                   │
                    │                   ▼
                    │             Wave 4 Hub UI (Milestone C)
                    └─────────┬─────────┘
                              ▼
                        Wave 5 Cover AI + remove /dashboard/cover
                              ▼
                        Wave 6 Saved searches → Wave 7 Polish
```

**Milestones**

| ID | Goal | Waves |
|----|------|-------|
| **B** | Track job → application → generate letter | 0–3 (+ auth 1) |
| **C** | Full Application Hub UI | 0–4 (+ 5 for animation) |

### 1.3 Current state (codebase audit)

| Area | Status | Evidence |
|------|--------|----------|
| UI (applications, profile, dashboard) | Ready | `src/components/applications/`, `profile/`, `dashboard/` |
| Dashboard routes | Ready | `src/app/dashboard/applications/**`, `profile/page.tsx` (RSC + ProfileForm) |
| Styling | Ready | `src/styles/guava-tokens.css`, `src/app/globals.css` |
| Env (local) | Ready | `DATABASE_URL`, `DIRECT_URL`, Supabase URL + publishable + service role |
| Prisma schema | **Postgres** | `prisma/schema.prisma` `provider = "postgresql"` |
| Prisma config | Ready | `prisma.config.ts` → `DIRECT_URL` for CLI |
| DB runtime | Ready | `src/db/index.ts` → Prisma + `@prisma/adapter-pg` |
| Business logic | Ready | `src/lib/` (no `core/`, no `@guavajobs/core`) |
| Auth | **Supabase (Wave 1 done)** | `@supabase/ssr`, `/sign-in`, middleware guards `/dashboard` |
| Supabase libs | Ready | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `admin.ts` |
| `getSession` | Ready | `src/lib/auth/get-session.ts` → `auth.getUser()` |
| Application hub | **Auth-gated** | Pages redirect to `/sign-in`; APIs return 401 when signed out |
| Profile page | **Ready** | `dashboard/profile/page.tsx` — RSC, completeness bar, ProfileForm, CV upload |
| Resume → profile | **Ready** | `sync-from-resume.ts`, `applyResumeToProfileAction`, resume page merge/overwrite dialog |
| Storage | **Partial** | `cv-uploads` via `storage:ensure` + service-role upload; `resumes` bucket deferred |

**Next:** **Wave 3** (application backend — Milestone B). Wave 2 complete.

### 1.4 Locked decisions (do not re-litigate)

| Topic | Decision |
|-------|----------|
| Database | Postgres on Supabase; **fresh** migration (empty project) |
| Auth | **Supabase Auth only**; remove Better Auth tables; **always** real sign-in (no `DEV_MODE` / `ensureDevUser`) |
| `User.id` | Must equal Supabase `auth.users.id` (UUID) |
| Service role | **Available** in `.env.local` — use for Storage + `createSupabaseAdmin()` (server-only) |
| Storage | **Supabase Storage** preferred (`cv-uploads`, `resumes`); local `RESUMES_DIR` fallback only if bucket blocked |
| Routes | Product UI under `/dashboard/*` only |
| Cover letters | Application-scoped; `Application.coverLetterId` 1:1; `Application.resumeId` → Resume (1:N); remove `/dashboard/cover` in Wave 5 |
| Jobs | Keep `src/lib/jobs-api.ts` + SerpAPI; do not port `core/services/jobs` yet |
| Validators | Zod 4 when porting from core |
| Tracker UI | **Minimized** on `/dashboard`; **full** on `/dashboard/applications` |

---

## 2. Product rules (`NOTES.md`)

**Application** = job listing + CV (`resumeId`) + cover letter (`coverLetterId`) + profile (live + snapshot).

- CV scanner pre-fills profile; if ~100% complete → **confirm** before overwrite.  
- Cover letter AI = **profile + job**; use `cover-letter-merge-animation.tsx`.  
- Saved searches in Wave 6.

---

## 3. Task backlog (bite-sized)

Task IDs: `W0A.1` = Wave 0A, task 1.  
**Verify** blocks are required gates.

---

### Wave 0A — Postgres schema (foundation) ✅ Complete

**Goal:** Single `prisma/schema.prisma` for Supabase Postgres.  
**Prereqs:** `DATABASE_URL`, `DIRECT_URL` in `.env.local`.

| ID | Task | Files / notes |
|----|------|----------------|
| W0A.1 | Archive SQLite migrations: move `prisma/migrations/20250603*` to `prisma/migrations/_sqlite_archive/` or delete after backup | Do not apply to Supabase |
| W0A.2 | Merge schemas: copy Application hub from `core/prisma/schema.prisma` + InternHunt models from `prisma/schema.prisma` | One file |
| W0A.3 | Remove models `Session`, `Account`, `Verification` | Better Auth |
| W0A.4 | Unify `User`: `@id @db.Uuid`, `email`, `displayName`; relations to Profile, Application, Resume, etc. | Match Supabase user id |
| W0A.5 | Rename `CoverLetter` → `LegacyCoverLetter` (`@@map("legacy_cover_letters")`) | Avoid clash |
| W0A.6 | Add `Application` with `resumeId`, `coverLetterId @unique`, pipeline fields from core | See §4 |
| W0A.7 | Add `ApplicationCoverLetter`, `Profile`, `ApplicationNote`, `ApplicationProfileSnapshot`, `SavedJobSearch` | From core |
| W0A.8 | Convert `Resume`, `Job`, etc. to Postgres types (`DateTime` where appropriate) | Fresh DB OK |
| W0A.9 | Set `datasource db { provider = "postgresql" }` | No sqlite |
| W0A.10 | Update `prisma.config.ts`: `url: env("DATABASE_URL")`, add `directUrl: env("DIRECT_URL")` if supported | **Replace `INTERNHUNT_DATABASE_URL`** |
| W0A.11 | Create migration `prisma/migrations/20260604000000_init_postgres/migration.sql` | `migrate dev` with `DIRECT_URL` |
| W0A.12 | Run `npx prisma generate` | Output `src/generated/prisma` |

**Verify W0A**

- [x] `npx prisma migrate status` clean on Supabase  
- [x] Tables visible in Supabase Table Editor  
- [x] `rg 'provider = "sqlite"' prisma/schema.prisma` → no matches  

---

### Wave 0B — Prisma client runtime ✅ Complete

**Goal:** App uses Postgres only at runtime.

| ID | Task | Files |
|----|------|-------|
| W0B.1 | Rewrite `src/db/index.ts`: `new PrismaClient()` + `DATABASE_URL`, global singleton | Remove better-sqlite3 |
| W0B.2 | Remove or gate `src/db/ensure-prisma-migrated.ts` SQLite logic | Postgres uses migrate deploy |
| W0B.3 | Update `next.config.ts` `serverExternalPackages`: remove sqlite packages | Keep `@prisma/client` |
| W0B.4 | Update `package.json` `postinstall`: drop `rebuild-sqlite` if removing sqlite | `prisma generate` only |
| W0B.5 | Remove `INTERNHUNT_DATABASE_URL` from `.env.local` | User env |
| W0B.6 | Update `.env.example` (all required vars documented) | No fake secrets |

**Verify W0B**

- [x] `import { prisma } from "@/db"` works in a one-line script or API route  
- [x] `rg 'better-sqlite3|INTERNHUNT_DATABASE' src prisma.config.ts` → only comments or none  

---

### Wave 0C — Port `core/` into `src/lib/` (no import rewiring yet) ✅ Complete

**Goal:** All business logic exists under `src/lib/`; tests compile after 0E.

| ID | Task | Destination |
|----|------|-------------|
| W0C.1 | Copy + Zod 4 fix `core/src/validators/*` | `src/lib/validators/` |
| W0C.2 | Copy `core/src/api/*` | `src/lib/api/` (`jsonSuccess`, `jsonError`, `withErrorHandler`, `ApiErrorCode`) |
| W0C.3 | Copy `core/src/applications/constants.ts`, `snapshots.ts`, `job-taxonomy.ts`, `profile-prompt.ts` | `src/lib/applications/` |
| W0C.4 | Port `services/applications.ts` + errors | `src/lib/applications/service.ts` |
| W0C.5 | Port `services/cover-letters/**` | `src/lib/applications/cover-letter/` |
| W0C.6 | Port `services/profile.ts` | `src/lib/profile/service.ts` |
| W0C.7 | Port `services/profile-url-import/**` | `src/lib/profile/url-import/` |
| W0C.8 | Port `services/saved-job-searches.ts` | `src/lib/jobs/saved-searches.ts` |
| W0C.9 | Port `services/users.ts` | `src/lib/users/ensure-user.ts` |
| W0C.10 | Port `services/usage.ts` + `services/ai/**` | `src/lib/ai/` — merge OpenAI calls with `src/lib/llm.ts` |
| W0C.11 | Add `src/lib/types/` from `core/src/types` if needed | Shared DTOs |
| W0C.12 | In ported services: replace `getDb()` with `prisma` from `@/db` | Mechanical |

**Skip:** `core/services/jobs/**`, `core/src/db/**`.

**Verify W0C**

- [x] New files exist under `src/lib/`  
- [x] Ported files do not import `@guavajobs/core`  

---

### Wave 0D — Supabase admin helper (storage prep) ✅ Complete

**Goal:** Server can talk to Storage with service role (for Wave 2).

| ID | Task | Files |
|----|------|-------|
| W0D.1 | `src/lib/supabase/env.ts` — `isSupabaseConfigured()` checks URL + publishable + service role | |
| W0D.2 | `src/lib/supabase/admin.ts` — `createSupabaseAdmin()` using `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Pattern from `core/src/db/supabase.ts` |
| W0D.3 | Document buckets in plan/README: `cv-uploads`, `resumes` | Manual Supabase dashboard |

**Verify W0D**

- [x] Admin client constructs without throw when env set (smoke script OK)  

---

### Wave 0E — Rewire imports + legacy features ✅ Complete

**Goal:** Zero `@guavajobs/core`; legacy InternHunt APIs use Postgres `prisma`.

| ID | Task | Scope |
|----|------|--------|
| W0E.1 | Replace `@guavajobs/core` in **12 API routes** (applications, saved-searches, profile/parse-url, health) | See §5.1 |
| W0E.2 | Replace in **7 lib files** (applications/*, profile/*) | §5.1 |
| W0E.3 | Replace in **15 component files** (applications, profile, dashboard) | §5.1 |
| W0E.4 | Update `src/lib/jobs-api.ts` for Postgres `User`/`Job` types (UUID, DateTime) | Keep SerpAPI logic |
| W0E.5 | Update `src/lib/dev-user.server.ts` — **stop using** or delete in Wave 1 | Done in Wave 1 |
| W0E.6 | Update `src/app/api/health/route.ts` | DB connectivity |
| W0E.7 | Delete `core/` directory | After grep clean |
| W0E.8 | `npm run build` | Fix type errors |

**Verify W0E**

- [x] `rg '@guavajobs/core' src` → **0 matches**  
- [x] `test ! -d core` or `core/` deleted  
- [x] `npm run build` passes  

**Wave 0 complete when:** W0A–W0E verify all checked. ✅

---

### Wave 1 — Supabase Auth (mandatory) ✅ Complete

**Goal:** Real sign-in; no dev bypass.  
**Prereqs:** Wave 0 complete.

| ID | Task | Files |
|----|------|-------|
| W1.1 | `npm install @supabase/supabase-js @supabase/ssr` | package.json |
| W1.2 | `src/lib/supabase/client.ts` | Browser client |
| W1.3 | `src/lib/supabase/server.ts` | Cookie-based server client |
| W1.4 | `src/lib/supabase/middleware.ts` | Session refresh |
| W1.5 | `src/lib/auth/get-session.ts` | `{ id, email, name? } \| null` |
| W1.6 | `src/middleware.ts` | Guard `/dashboard/*` → `/sign-in?next=` |
| W1.7 | `src/app/sign-in/page.tsx` | Match Supabase auth providers |
| W1.8 | `src/app/sign-up/page.tsx` | If registration enabled |
| W1.9 | `src/app/auth/callback/route.ts` | Email/OAuth callback |
| W1.10 | Wire `src/lib/users/ensure-user.ts` on first session | `User.id = auth.users.id` |
| W1.11 | Replace `requireAuth` in `src/lib/session.ts` → delegate to `getSession` or remove | |
| W1.12 | Update **legacy APIs** to use `getSession`: jobs, resume, chat, cover/generate, scrape, apply, save | 10 routes — §5.2 |
| W1.13 | Remove `DEV_MODE`, `src/lib/dev-user.ts`, `dev-user.server.ts` usage | |
| W1.14 | Application pages already use `getSession` — verify redirect works | |

**Verify W1**

- [x] Signed out → `/dashboard` redirects to sign-in  
- [x] Signed in → dashboard loads  
- [x] `User` row created in Postgres on first login (`usersService.ensureUser`)  
- [x] Legacy job/resume APIs return 401 when signed out  

See also: [`docs/SUPABASE_AUTH_SETUP.md`](./SUPABASE_AUTH_SETUP.md), `npm run verify:supabase-auth-env`, `npm run smoke:auth-sign-in`.

---

### Wave 2 — Profile + CV bridge ✅ **Complete**

**Prereqs:** Wave 1 ✅  
**Detailed plan:** [wave_2_profile_cv_bridge.plan.md](../.cursor/plans/wave_2_profile_cv_bridge.plan.md)

| ID | Task | Files | Status |
|----|------|-------|--------|
| W2.1 | Implement full `src/app/dashboard/profile/page.tsx` with `ProfileForm`, completeness, `UrlImport` | | ✅ RSC page wired |
| W2.2 | Fix `src/lib/profile/actions.ts` imports (`profileService`, supabase server) | | ✅ Wired (admin upload + `getSession`) |
| W2.3 | Create Supabase buckets `cv-uploads` (+ policies or service-role server upload) | Dashboard | ✅ `cv-uploads` via `storage:ensure`; `resumes` bucket deferred |
| W2.4 | CV upload path in profile actions uses Storage or documents fallback | | ✅ `uploadCvAction` + profile UI; manual browser QA recommended |
| W2.5 | `src/lib/profile/sync-from-resume.ts` — map resume parse → profile | | ✅ `syncFromResume` + `applyResumeToProfileAction` |
| W2.6 | Resume page/API: after scan, prompt Apply / Confirm overwrite if 100% | `dashboard/resume` | ✅ Auto-merge &lt;100%; AlertDialog at 100% |

#### How to implement — W2.1 (profile page)

**Do not rebuild the form** — [`ProfileForm`](../../src/components/profile/profile-form.tsx) already composes `UrlImport`, `ProfileCompletenessBar`, sections, `updateProfileAction`, `uploadCvAction`.

1. Replace placeholder in [`dashboard/profile/page.tsx`](../../src/app/dashboard/profile/page.tsx) with an **async RSC**:
   - `getSession()` → redirect `/sign-in?next=/dashboard/profile`
   - `await usersService.ensureUser(session)`
   - `await profileService.getOrCreateForUser(session.id)` then `profileService.getByUserId(session.id)` (always returns DTO after create)
2. Render layout: page header + `<ProfileCompletenessBar completeness={profile.completeness} />` + `<ProfileForm initialProfile={profile} />`
3. Optional: `export const dynamic = "force-dynamic"` (same as applications page)
4. **Verify:** edit a field → Save → reload → value persists in Supabase `profiles` table

#### How to implement — W2.3 / W2.4 (storage)

- **W2.3:** Run `npm run storage:ensure` (creates private `cv-uploads`). Defer `resumes` bucket until resume files move off disk (InternHunt still uses `RESUMES_DIR` / local path in upload route).
- **W2.4:** [`uploadCvAction`](../../src/lib/profile/actions.ts) already uploads via **service role** to `{session.id}/{timestamp}.ext` and sets `Profile.cvFileUrl`. After W2.1, test from profile form file input; surface bucket errors (already human-readable).

#### How to implement — W2.5 (sync resume → profile)

1. Add [`src/lib/profile/sync-from-resume.ts`](../../src/lib/profile/sync-from-resume.ts) (server-only):
   - Load active `Resume` for `userId` (or by `resumeId`)
   - Parse JSON columns: `skills`, `experience`, `education`, `summary`
   - Build `ProfileUpdateInput` (map structured experience to `ExperienceEntry[]` — align with upload route’s `structured.experience` shape)
   - **`merge` mode:** only fill empty/null profile fields (default when completeness &lt; 100%)
   - **`overwrite` mode:** replace summary, skills, experience, education when user confirms
2. Add server action `applyResumeToProfileAction(resumeId, mode)` in [`actions.ts`](../../src/lib/profile/actions.ts): session check → `syncFromResume` → `profileService.update` → `revalidatePath("/dashboard/profile")`

#### How to implement — W2.6 (resume scan → profile)

Per [`NOTES.md`](../NOTES.md): pre-fill with minimum effort; **if profile is 100% complete**, ask before overwriting.

1. In [`dashboard/resume/page.tsx`](../../src/app/dashboard/resume/page.tsx) after successful `/api/resume/upload` response:
   - Call new server action or lightweight `GET` that returns `profileService.getByUserId` completeness **or** pass `completeness.percent` from a follow-up fetch
2. **If `completeness.percent < 100`:** call `applyResumeToProfileAction(resumeId, "merge")` + toast “Profile updated from your scan” + link to `/dashboard/profile`
3. **If `completeness.percent === 100`:** show `AlertDialog`: “Profile is complete. Replace with data from this scan?” → Confirm runs `overwrite`, Cancel skips
4. Do **not** block ATS UI on profile sync failure; log and toast error only

**Verify W2**

- [x] `npm run build` + `npx tsc --noEmit` pass  
- [x] Profile page RSC + actions wired (`/dashboard/profile`)  
- [x] `cv-uploads` bucket confirmed (`npm run storage:ensure`)  
- [ ] Edit profile saves to Postgres (manual: sign in → save → reload)  
- [ ] CV upload succeeds from profile form (manual)  
- [ ] Scan → profile merge / overwrite dialog (manual on `/dashboard/resume`)  

---

### Wave 3 — Application backend (**Milestone B**)

**Prereqs:** Wave 1 (Wave 2 parallel OK but letter needs profile).

| ID | Task | Files |
|----|------|-------|
| W3.1 | Confirm `applicationsService` methods on Postgres | `src/lib/applications/service.ts` |
| W3.2 | Wire `src/app/api/applications/**` (6 routes) | session + service |
| W3.3 | `track-job.ts`: resolve job via `jobs-api.ts` / `Job` table | not core jobsService |
| W3.4 | Jobs UI: **Track application** button → server action → redirect to application detail | `dashboard/jobs/page.tsx` |
| W3.5 | `create-manual.ts` + `new/page.tsx` end-to-end | |
| W3.6 | On track/create: optional `resumeId` from latest Resume | |
| W3.7 | Generate letter: create `ApplicationCoverLetter`, set `coverLetterId` | `generate-cover-letter.ts` |
| W3.8 | Dashboard `?tracked=1` + `TrackedToast` | |

**Verify W3 (Milestone B)**

- [ ] Track job → appears in `/dashboard/applications`  
- [ ] Status + note persist  
- [ ] Generate letter sets `coverLetterId` with profile+job content  

---

### Wave 4 — Application Hub UI (**Milestone C**)

**Prereqs:** Wave 3.

| ID | Task | Files |
|----|------|-------|
| W4.1 | `src/app/dashboard/layout.tsx` — sidebar nav | Overview, Resume, Profile, Jobs, Applications, Chat |
| W4.2 | Slim `dashboard/page.tsx` — stats + **minimized** `ApplicationTracker` | |
| W4.3 | Applications list: **full** `ApplicationTracker` + `ApplicationsTable` + `EmptyState` | |
| W4.4 | Application detail: wire all components from §5.3 | `[id]/page.tsx` |
| W4.5 | Remove duplicate nav from old dashboard page if any | |
| W4.6 | Guava tokens on primary buttons (`bg-guava-pink-gradient`) | |

**Verify W4 (Milestone C)**

- [ ] List + detail render without error  
- [ ] Row colours from `row-styles.ts`  
- [ ] All links under `/dashboard/...`  

---

### Wave 5 — Cover AI polish + remove legacy cover

| ID | Task | Files |
|----|------|-------|
| W5.1 | `CoverLetterMergeAnimation` in `ApplicationLetterEditor` during generate | |
| W5.2 | Unify AI via `src/lib/llm.ts` + cover-letter prompts | |
| W5.3 | Delete `src/app/dashboard/cover/page.tsx` + nav link | |
| W5.4 | Redirect `/dashboard/cover` in `next.config.ts` | |
| W5.5 | Stop writes to `LegacyCoverLetter` in `src/app/api/cover/**` | |
| W5.6 | `isUserEdited` on manual save | |

**Verify W5**

- [ ] No nav to legacy cover; redirect works  
- [ ] Animation shows on generate  

---

### Wave 6 — Saved searches

| ID | Task | Files |
|----|------|-------|
| W6.1 | Wire `saved-searches` APIs to ported service | |
| W6.2 | Jobs page: save / list / re-run query via `jobs-api.ts` | |

---

### Wave 7 — Dashboard polish

| ID | Task | Files |
|----|------|-------|
| W7.1 | Overview: application counts, profile %, recent apps | |
| W7.2 | README: env, migrate, auth, buckets | |
| W7.3 | Optional: remove `AppliedJob` / legacy data paths | |

---

## 4. Schema reference (Application FKs)

```prisma
model Application {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @db.Uuid
  resumeId        String?   @db.Uuid
  coverLetterId   String?   @unique @db.Uuid
  status          ApplicationStatus @default(DRAFT)
  // + company, title, job snapshots, pipeline, interview (from core/prisma/schema.prisma)
  resume          Resume?                  @relation(fields: [resumeId], references: [id])
  coverLetter     ApplicationCoverLetter?  @relation(fields: [coverLetterId], references: [id])
  user            User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Fresh migrate:** do not run `core/prisma/migrations/*` on Supabase; use as SQL reference only.

---

## 5. File indexes (for rewiring)

### 5.1 `@guavajobs/core` importers (34 files — Wave 0E)

**API (12):**  
`api/applications/route.ts`, `[id]/route.ts`, `[id]/notes/route.ts`, `[id]/notes/[noteId]/route.ts`, `[id]/cover-letters/route.ts`, `[id]/cover-letters/[letterId]/route.ts`, `api/saved-searches/route.ts`, `[id]/route.ts`, `api/profile/parse-url/route.ts`, `api/health/route.ts`

**Lib (7):**  
`lib/applications/actions.ts`, `cover-letter-context.ts`, `create-manual.ts`, `generate-cover-letter.ts`, `track-job.ts`, `lib/profile/actions.ts`, `parse-cv-text.ts`

**Pages (3):**  
`dashboard/applications/page.tsx`, `[id]/page.tsx`, `new/page.tsx` (create-manual only in lib)

**Components (15):**  
`components/applications/*` (8), `components/profile/*` (9 minus overlap), `components/dashboard/*` (4)

### 5.2 Legacy `requireAuth` APIs (Wave 1)

`api/jobs/route.ts`, `api/jobs/scrape/route.ts`, `api/jobs/[id]/apply/route.ts`, `api/jobs/[id]/save/route.ts`, `api/resume/route.ts`, `api/resume/upload/route.ts`, `api/chat/route.ts`, `api/cover/generate/route.ts`

### 5.3 Application detail component map (Wave 4)

| Component | File |
|-----------|------|
| Status | `dashboard/application-status-form.tsx` |
| Notes | `dashboard/application-notes-panel.tsx` |
| Taxonomy | `applications/application-taxonomy-fields.tsx` |
| CV | `applications/application-cv-section.tsx` |
| Letter | `applications/application-letter-editor.tsx` |
| Grounding | `applications/letter-grounding-panel.tsx` |
| Profile snapshot | `applications/profile-snapshot-card.tsx` |
| Toasts | `applications/application-generated-toast.tsx`, `dashboard/tracked-toast.tsx` |

---

## 6. Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Pooler, `?pgbouncer=true` |
| `DIRECT_URL` | Yes | Migrations, port 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Auth client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server Storage/admin — **in `.env.local`** |
| `NEXT_PUBLIC_APP_URL` | Yes | Auth redirects |
| `OPENAI_API_KEY` | Yes | |
| `SERPAPI_API_KEY` | Yes | |
| ~~`DEV_MODE`~~ | No | Do not use |
| ~~`INTERNHUNT_DATABASE_URL`~~ | No | Remove after Wave 0B |

---

## 7. Storage strategy

| Asset | Approach |
|-------|----------|
| Profile CV | Bucket `cv-uploads`; server upload via **service role** or user-scoped server client; path `{userId}/...` in `Profile.cvFileUrl` |
| Resume PDF | Bucket `resumes` or local `RESUMES_DIR` until bucket ready |
| URL import | HTTP fetch in API route only — no bucket |

`cv-uploads` created via `npm run storage:ensure` (service-role upload; path `{userId}/...`). `resumes` Supabase bucket deferred — resume PDFs still use local `RESUMES_DIR` in `/api/resume/upload`. `src/lib/profile/actions.ts` expects bucket name `cv-uploads`.

---

## 8. `core/` absorption map (reference)

| `core/src/` | `src/lib/` |
|-------------|------------|
| `validators/*` | `validators/` |
| `api/*` | `api/` |
| `services/applications.ts` | `applications/service.ts` |
| `services/cover-letters/**` | `applications/cover-letter/` |
| `services/profile.ts` | `profile/service.ts` |
| `services/profile-url-import/**` | `profile/url-import/` |
| `services/saved-job-searches.ts` | `jobs/saved-searches.ts` |
| `services/users.ts` | `users/ensure-user.ts` |
| `services/usage.ts`, `services/ai/**` | `ai/` |
| `applications/*.ts` (helpers) | `applications/` |
| `db/supabase.ts` | `supabase/admin.ts` (Wave 0D) |

**Do not port:** `services/jobs/**`.

---

## 9. What NOT to do

- Do not import `@guavajobs/core` or keep `core/` after Wave 0E.  
- Do not use `ensureDevUser` / `DEV_MODE`.  
- Do not apply SQLite migrations to Supabase.  
- Do not port `core/services/jobs` (use `jobs-api.ts`).  
- Do not build Milestone C UI (Wave 4) before Wave 3 APIs work.  
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

---

## 10. Global success criteria

- [x] Fresh Postgres schema deployed  
- [x] Supabase Auth on all dashboard + protected API routes  
- [ ] Milestone B then C  
- [x] `rg '@guavajobs/core' src` empty; `core/` deleted  
- [ ] Application-scoped cover letters only; `/dashboard/cover` removed  

---

## 11. Agent handoff (next session)

**Start here:** Wave **3** — application backend (Milestone B): **W3.1**–**W3.8**.

**Completed:** Waves **0–2** (Postgres, Supabase Auth, profile + CV bridge).

**Do not start:** Wave 4 UI until Wave 3 verify passes.

**Quick status commands**

```bash
rg '@guavajobs/core' src --files-with-matches | wc -l   # target: 0
rg 'dev-user|ensureDevUser|DEV_MODE' src               # target: 0
npm run verify:supabase-auth-env && npm run storage:ensure
npm run build
```

---

*Updated 2026-06-04: Waves 0–2 complete; start Wave 3 (application backend).*
