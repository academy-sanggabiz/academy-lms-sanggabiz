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

`reference/design_handoff_ease_lms/` contains the design handoff for this product: a high-fidelity, non-production HTML/React prototype (`EaseLMS Dashboard.dc.html` — do not import or run it) plus a `README.md` with the actual design tokens (colors, fonts, spacing) to match when building UI. Treat it as the interactive spec for screens/flows, not as code to reuse. `erd.md` at the repo root is the target data model (entities, relationships, RLS intent) — check it before adding new tables.

The folder layout under `app/`, `lib/`, etc. is intentionally modeled after `enyojoo/easelms/apps/lms` (a reference production implementation of the same product) — `app/admin/*`, `app/learner/*`, `app/api/*` route groups mirror that structure. Many of these directories are still **empty scaffolding** for features not yet built (course builder, payments, certificates, email, quiz engine) — their presence doesn't imply working code exists there. `app/learner/*` is the most built-out so far (see "Learner app shell" below), including `app/learner/courses/[id]` (course detail: overview, curriculum, enroll). The lesson player itself ("Learn" screen in the reference) is not built yet — course detail is as deep as the flow currently goes.

### Learner app shell

`app/learner/layout.tsx` (server) fetches the current user's `profiles` row and passes `name`/`email` into `components/learner/LearnerShell.tsx` (client — owns the sidebar open/closed state). `LearnerShell` renders `components/learner/Sidebar.tsx` (collapsible nav: Dashboard/Courses/Purchase) and a header with `components/learner/UserMenu.tsx` (avatar/name dropdown: Profile/Settings/Log Out, calling the `logout` server action). Future admin/superadmin shells will likely mirror this layout → shell → sidebar/usermenu split rather than duplicating it — check here first before building a new one.

### Supabase integration

Client creation follows the standard `@supabase/ssr` split, in `lib/supabase/`:
- `client.ts` — browser client (`createBrowserClient`), for Client Components.
- `server.ts` — server client (`createServerClient` + `next/headers` cookies), async `createClient()`, for Server Components/Actions. **Never import this (or anything that imports it) from a file a Client Component also imports** — even transitively, this breaks the entire app (not just one route) because `next/headers` can't be bundled client-side. This is why course data is split into `lib/courses.ts` (client-safe types/helpers) and `lib/courses-server.ts` (the actual `createClient()`-based fetch) — follow that split for any future data module needed by both server pages and client components.
- `middleware.ts` — exports `updateSession(request)`, refreshes the session and redirects unauthenticated users to `/auth/learner/login` for any path under `/learner`. **Wired up** via the root `proxy.ts` (Next.js 16 convention — see above), which calls `updateSession` on every non-static request.

Roles (`learner`/`admin`/`superadmin`) live in a `profiles` table (`supabase/migrations/20260725000000_learner_auth.sql`), 1:1 with `auth.users`, auto-populated on signup by a trigger. A custom access-token hook mirrors `profiles.role` into the JWT's `app_metadata.role`, so `supabase.auth.getClaims()` gives you the role with no extra query — but the hook only takes effect once enabled in the Supabase Dashboard (Auth → Hooks), creating the SQL function alone isn't enough.

`courses` (`supabase/migrations/20260727000000_courses.sql`) is real DB data (not mock) — RLS only allows `select` where `status = 'published'`; draft rows are invisible to `anon`/`authenticated`. `lib/mock-courses.ts` is separate, older mock data still used by the public landing page — don't confuse the two.

`course_sections` → `lessons` → `resources` (`supabase/migrations/20260728000000_course_content.sql`) is the curriculum shown on `/learner/courses/[id]` (`lib/courses-server.ts` `getCourseDetail`, rendered by `components/learner/CourseCurriculum.tsx`). RLS mirrors `courses`: readable whenever the parent course is `published`, via `EXISTS` checks up the section/lesson chain. **Known gap:** this also exposes `lessons.video_url`/`content` to non-enrolled users, since RLS is row-level and can't hide columns — acceptable today (no real lesson content seeded, no player built yet), but once the lesson player ships, actual content access must be gated by a server-side enrollment check, not this policy.

`enrollments` (`supabase/migrations/20260729000000_enrollments.sql`) links a `profiles.id` learner to a `courses.id`, unique per pair, `status` `active`/`completed`. Unlike `courses`, RLS here is **authenticated-only and own-row** (`auth.uid() = learner_id`) — never anon-readable, since enrollment data is private. Enrolling happens via the `enroll` server action (`app/learner/courses/actions.ts`), which `upsert`s with `ignoreDuplicates` so re-clicking Enroll is a no-op rather than an error, then `revalidatePath`s the Courses list, the course detail page, and the Dashboard. Completion tracking and unenroll are **not implemented** — every enrollment is created `active`; there's no update/delete RLS policy yet (that arrives with `lesson_progress`, per `erd.md`'s build order).

Both clients read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key) from `.env.local`. No service-role key is configured yet — anything requiring elevated DB access (bypassing RLS) needs one added server-side only, never exposed via `NEXT_PUBLIC_*`.

`supabase/migrations/` holds one file per schema addition (run manually in the Supabase Dashboard SQL Editor — there is no local Supabase CLI project linked yet, `supabase init`/`link` has not been run). `supabase/seed.sql` holds sample data, kept separate from migrations since it has a different lifecycle (safely re-runnable; migrations are not).

### UI

shadcn/ui (`components.json`, style `base-nova`, base color `neutral`) with Tailwind CSS v4 — config lives in `app/globals.css` via `@theme inline` (no `tailwind.config.js`; the CSS is the config). Path alias `@/*` maps to the project root (see `tsconfig.json`). Component aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks` (per `components.json`). Note `--background` (page canvas) and `--card` (white surface) are visually close but distinct tokens — components meant to look like a white card/input/pill need explicit `bg-card`, not just the default/transparent state, or they blend into the page.
