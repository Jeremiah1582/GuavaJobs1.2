created_date: 2026-06-03 14:45:00, updated_at: 2026-06-04 16:00:00

# InternHunt — Project structure

Canonical paths for agents. **Execute tasks from** [`MASTER_BUILD_PLAN.md`](./MASTER_BUILD_PLAN.md) §3 (Waves 0A–7). Product rules: [`NOTES.md`](../NOTES.md).

## Auth & public routes

| URL | File | Notes |
|-----|------|-------|
| `/sign-in` | `src/app/sign-in/page.tsx` | Email + password (Wave 1) |
| `/sign-up` | `src/app/sign-up/page.tsx` | Registration |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Email confirm / PKCE |
| `/login` | `src/app/login/page.tsx` | Redirects to `/sign-in` |
| `/` | `src/app/page.tsx` | Marketing / home |

**Rule:** No `DEV_MODE` / dev user. Middleware guards `/dashboard/*`.

## Dashboard routes (`/dashboard/*` only)

| URL | File |
|-----|------|
| `/dashboard` | `src/app/dashboard/page.tsx` — overview + **minimized** `application-tracker` |
| `/dashboard/resume` | `src/app/dashboard/resume/page.tsx` |
| `/dashboard/jobs` | `src/app/dashboard/jobs/page.tsx` |
| `/dashboard/profile` | `src/app/dashboard/profile/page.tsx` |
| `/dashboard/applications` | `src/app/dashboard/applications/page.tsx` — **full** `application-tracker` |
| `/dashboard/applications/new` | `src/app/dashboard/applications/new/page.tsx` |
| `/dashboard/applications/[id]` | `src/app/dashboard/applications/[id]/page.tsx` |
| `/dashboard/chat` | `src/app/dashboard/chat/page.tsx` |
| `/dashboard/cover` | **Remove Phase 5** |

Redirects: `next.config.ts` (`/applications`, `/profile`, `/jobs` → dashboard).

**Target:** `src/app/dashboard/layout.tsx` — shared sidebar (Phase 4).

## UI components

| Area | Path |
|------|------|
| Applications | `src/components/applications/` |
| Profile | `src/components/profile/` |
| Dashboard | `src/components/dashboard/` — `application-tracker`, `application-status-form`, `application-notes-panel`, `tracked-toast` |
| Shared | `src/components/page-header.tsx`, `empty-state.tsx` |
| shadcn | `src/components/ui/` |

## Server logic

| Area | Path |
|------|------|
| Applications | `src/lib/applications/` — `service.ts` (target), `actions.ts`, `track-job.ts`, `generate-cover-letter.ts`, `row-styles.ts` |
| Profile | `src/lib/profile/` |
| Jobs | `src/lib/jobs-api.ts` (keep), `src/lib/jobs/saved-searches.ts` (target) |
| Auth | `src/lib/auth/get-session.ts`, `require-session.ts`, `actions.ts` |
| Supabase | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `admin.ts` |
| Users | `src/lib/users/ensure-user.ts` (target) |
| AI | `src/lib/llm.ts`, `src/lib/ai/` (target) |
| Validators | `src/lib/validators/` (target) |
| API helpers | `src/lib/api/` (target) |

## Styles

| File | Role |
|------|------|
| `src/styles/guava-tokens.css` | Brand tokens |
| `src/app/globals.css` | Tailwind v4 + Guava theme |
| `src/app/internhunt-legacy.css` | Dashboard utilities |

## Database

| Item | Path |
|------|------|
| Schema | `prisma/schema.prisma` — **target: Postgres only** (today: SQLite) |
| Config | `prisma.config.ts` — **must use `DATABASE_URL` not `INTERNHUNT_DATABASE_URL`** |
| Client | `src/db/index.ts` — **target: PrismaClient + DATABASE_URL** |
| Supabase admin | `src/lib/supabase/admin.ts` — **create in Wave 0D** |
| Generated | `src/generated/prisma/` |
| Migrations | `prisma/migrations/` — **fresh chain on Supabase** |

## APIs

| Prefix | Path |
|--------|------|
| Applications | `src/app/api/applications/` |
| Profile | `src/app/api/profile/` |
| Saved searches | `src/app/api/saved-searches/` |
| Jobs | `src/app/api/jobs/` |
| Resume / chat | `src/app/api/resume/`, `chat/` |

## Temporary — delete after Phase 0

| Item | Path |
|------|------|
| Guava core | `core/` |
