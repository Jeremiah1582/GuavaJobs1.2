created_date: 2026-06-04 14:00:00, updated_at: 2026-06-04 14:00:00

# Supabase Auth setup (Wave 1)

Complete these steps in the [Supabase Dashboard](https://supabase.com/dashboard) before testing sign-in locally.

## 1. Authentication providers

1. Go to **Authentication → Providers → Email**.
2. Enable **Email** provider.
3. Enable **Confirm email** only if you want production-like flows (disable for fastest local dev).
4. **Wave 1 uses email + password only** — leave Google/OAuth disabled unless you extend later.

## 2. URL configuration

**Authentication → URL configuration**

| Setting | Local dev value |
|---------|-----------------|
| Site URL | `http://localhost:3000` (or your `NEXT_PUBLIC_APP_URL`) |
| Redirect URLs | `http://localhost:3000/auth/callback` |
| | `http://localhost:3000/**` (optional wildcard for dev) |

Add production URLs when deploying.

## 3. Environment variables

Copy [`.env.example`](../.env.example) → `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL` / `DIRECT_URL`

Verify locally:

```bash
npm run verify:supabase-auth-env
```

## 4. Storage (from Wave 0)

```bash
npm run storage:ensure
```

Creates private bucket `cv-uploads` for profile uploads.
