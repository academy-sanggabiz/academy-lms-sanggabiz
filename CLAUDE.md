# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (Turbopack, default for Next.js 16)
- `npm run build` — production build (Turbopack by default)
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next`)

There is no test suite configured in this project yet (no test script, no test framework in `package.json`).

## Architecture

This is a Next.js 16 App Router LMS ("EaseLMS" / Sanggabiz). **Next.js 16 has real breaking changes vs. training data** — see `AGENTS.md`, and read `node_modules/next/dist/docs/` before relying on prior Next.js knowledge. The one that bites most often: **Middleware is renamed to Proxy**. The root convention file must be `proxy.ts` exporting a `proxy()` function — there is no `middleware.ts` at the project root. Async APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async-only, with no sync fallback.

### Reference design

`reference/design_handoff_ease_lms/` contains the design handoff for this product: a high-fidelity, non-production HTML/React prototype (`EaseLMS Dashboard.dc.html` — do not import or run it) plus a `README.md` with the actual design tokens (colors, fonts, spacing) to match when building UI. Treat it as the interactive spec for screens/flows, not as code to reuse.

The folder layout under `app/`, `lib/`, `data/`, etc. is intentionally modeled after `enyojoo/easelms/apps/lms` (a reference production implementation of the same product) — `app/admin/*`, `app/learner/*`, `app/api/*` route groups mirror that structure. Many of these directories are currently **empty scaffolding** for features not yet built (course builder, payments, certificates, email, quiz engine) — their presence doesn't imply working code exists there.

### Supabase integration

Client creation follows the standard `@supabase/ssr` split, in `lib/supabase/`:
- `client.ts` — browser client (`createBrowserClient`), for Client Components.
- `server.ts` — server client (`createServerClient` + `next/headers` cookies), async `createClient()`, for Server Components/Actions.
- `middleware.ts` — exports `updateSession(request)`, a helper that refreshes the session and redirects unauthenticated users to `/auth/login` for any path not under `/login` or `/auth`. **This is not yet wired up** — there is no root `proxy.ts` calling it, so route protection currently has no effect. When wiring it, remember the Next.js 16 `proxy.ts` convention above (not `middleware.ts`).

Both clients read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key) from `.env.local`. No service-role key is configured yet — anything requiring elevated DB access (bypassing RLS) needs one added server-side only, never exposed via `NEXT_PUBLIC_*`.

`supabase/` holds `seed.sql` plus `migrations/` and `email-templates/` folders (scaffolded, mirroring the reference repo). There is no local Supabase CLI project linked (`supabase init`/`link` has not been run) — schema changes are currently applied by hand via the Supabase Dashboard SQL Editor.

### UI

shadcn/ui (`components.json`, style `base-nova`, base color `neutral`) with Tailwind CSS v4 — config lives in `app/globals.css` via `@theme inline` (no `tailwind.config.js`; the CSS is the config). Path alias `@/*` maps to the project root (see `tsconfig.json`). Component aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks` (per `components.json`).
