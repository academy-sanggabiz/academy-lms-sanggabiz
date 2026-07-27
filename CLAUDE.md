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

The folder layout under `app/`, `lib/`, etc. is intentionally modeled after `enyojoo/easelms/apps/lms` (a reference production implementation of the same product) — `app/admin/*`, `app/learner/*`, `app/api/*` route groups mirror that structure. Many of these directories are still **empty scaffolding** for features not yet built (course builder, payments, certificates, email, quiz engine) — their presence doesn't imply working code exists there. `app/learner/*` is the most built-out so far (see "Learner app shell" below), including `app/learner/courses/[id]` (course detail: overview, curriculum, enroll).

The lesson player ("Learn" screen in the reference) lives at **`app/learn/[courseId]/`** — deliberately a top-level route, *not* under `app/learner/`. Every `/learner/*` route inherits `LearnerShell` (nav sidebar + top bar) via `app/learner/layout.tsx`, and Next.js can't remove an ancestor layout for a child route — so the full-screen, no-app-nav player the reference shows has to live outside that tree. Don't move it under `app/learner/` expecting to keep the immersive layout.

### Learner app shell

`app/learner/layout.tsx` (server) fetches the current user's `profiles` row and passes `name`/`email` into `components/learner/LearnerShell.tsx` (client — owns the sidebar open/closed state). `LearnerShell` renders `components/learner/Sidebar.tsx` (collapsible nav: Dashboard/Courses/Purchase) and a header with `components/learner/UserMenu.tsx` (avatar/name dropdown: Profile/Settings/Log Out, calling the `logout` server action). Future admin/superadmin shells will likely mirror this layout → shell → sidebar/usermenu split rather than duplicating it — check here first before building a new one.

### Supabase integration

Client creation follows the standard `@supabase/ssr` split, in `lib/supabase/`:
- `client.ts` — browser client (`createBrowserClient`), for Client Components.
- `server.ts` — server client (`createServerClient` + `next/headers` cookies), async `createClient()`, for Server Components/Actions. **Never import this (or anything that imports it) from a file a Client Component also imports** — even transitively, this breaks the entire app (not just one route) because `next/headers` can't be bundled client-side. This is why course data is split into `lib/courses.ts` (client-safe types/helpers) and `lib/courses-server.ts` (the actual `createClient()`-based fetch) — follow that split for any future data module needed by both server pages and client components.
- `middleware.ts` — exports `updateSession(request)`, refreshes the session and redirects unauthenticated users to `/auth/learner/login` for any path starting with `/learn` (covers both `/learner/**` and the full-screen `/learn/[courseId]` player — same prefix check, deliberately not two separate conditions). **Wired up** via the root `proxy.ts` (Next.js 16 convention — see above), which calls `updateSession` on every non-static request.

Roles (`learner`/`admin`/`superadmin`) live in a `profiles` table (`supabase/migrations/20260725000000_learner_auth.sql`), 1:1 with `auth.users`, auto-populated on signup by a trigger. A custom access-token hook mirrors `profiles.role` into the JWT's `app_metadata.role`, so `supabase.auth.getClaims()` gives you the role with no extra query — but the hook only takes effect once enabled in the Supabase Dashboard (Auth → Hooks), creating the SQL function alone isn't enough.

`courses` (`supabase/migrations/20260727000000_courses.sql`) is real DB data (not mock) — RLS only allows `select` where `status = 'published'`; draft rows are invisible to `anon`/`authenticated`. `lib/mock-courses.ts` is separate, older mock data still used by the public landing page — don't confuse the two.

`course_sections` → `lessons` → `resources` (`supabase/migrations/20260728000000_course_content.sql`) is the curriculum shown on `/learner/courses/[id]` (`lib/courses-server.ts` `getCourseDetail`, rendered by `components/learner/CourseCurriculum.tsx`) and consumed by the lesson player. RLS mirrors `courses`: readable whenever the parent course is `published`, via `EXISTS` checks up the section/lesson chain. **Still-open gap:** this exposes `lessons.video_url`/`content` to non-enrolled users at the RLS level — the player (`app/learn/[courseId]/`) gates access at the *page* level (`getLearnData` redirects to course detail if there's no enrollment), but a non-enrolled authenticated user could still read lesson content directly via the Supabase REST API, since RLS is row-level and can't hide columns. Fine for now (lesson content is placeholder/seed data), but real content later should either move gating into RLS (a `lessons` select policy requiring an enrollment, not just a published course) or accept the current page-level-only gate as a deliberate tradeoff.

`enrollments` (`supabase/migrations/20260729000000_enrollments.sql`) links a `profiles.id` learner to a `courses.id`, unique per pair, `status` `active`/`completed`. Unlike `courses`, RLS here is **authenticated-only and own-row** (`auth.uid() = learner_id`) — never anon-readable, since enrollment data is private. Enrolling happens via the `enroll` server action (`app/learner/courses/actions.ts`), which `upsert`s with `ignoreDuplicates` so re-clicking Enroll is a no-op rather than an error, then `revalidatePath`s the Courses list, the course detail page, and the Dashboard. `enrollments.status` is **never auto-set to `completed`** — there's no enrollment UPDATE policy yet, so course-level completion rollup (from all lessons done) is deferred; only per-lesson completion exists so far (see `lesson_progress` below). Unenroll is also not implemented (no delete policy).

`lesson_progress` (`supabase/migrations/20260730000000_lesson_progress.sql`) tracks per-lesson completion, keyed by `enrollment_id` (not `learner_id` directly — it has no learner column, so every RLS policy checks ownership via an `EXISTS` join through `enrollments`). Has select **and** update policies (unlike `enrollments`, which only allows insert) because `toggleLessonComplete` (`app/learn/[courseId]/actions.ts`) `upsert`s on `(enrollment_id, lesson_id)` — the reference's interaction is a **checkbox in the lesson sidebar** (toggle on/off), not a one-way "mark complete" button, so re-toggling needs to actually update the row both ways, not silently ignore the conflict.

Video lessons store a plain YouTube URL in `lessons.video_url` (any of `youtu.be/<id>`, `watch?v=<id>`, `/embed/<id>`); `lib/courses.ts` `getYouTubeEmbedUrl()` normalizes it to an `/embed/` URL for the player's `<iframe>`. Returns `null` for unparseable URLs — `components/learn/LessonPane.tsx` falls back to a "No video available" message rather than rendering a broken iframe.

**When building any screen from the reference, check the exact HTML/JS in `EaseLMS Dashboard.dc.html`, not just a screenshot or the README summary.** The Learn player was first built from a general impression of the layout and missed several concrete, checkable details the source actually specifies (the sidebar's Course-content/AI-Assistant tabs, per-module `{done}/{total}` counts, checkbox-per-lesson with a type+duration subline, and the Overview/Notes/Q&A tab bar below the lesson content) — all easily confirmed by grepping the relevant `data-screen-label` block and its state bindings (`sideTab`, `learnTab`, `learnDone`, etc.) before writing the component. `components/learn/LessonPane.tsx`'s "Notes" (session-local textarea, no persistence) and "Q&A"/"AI Assistant" tabs are **intentionally inert** — the reference itself has no real backend for these either, just local mock state; don't treat them as missing functionality to build out later beyond what's already noted. The course-language string ("Bahasa Indonesia") is hardcoded in both the course detail and Overview tab — there's no `courses.language` column yet.

Both clients read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key) from `.env.local`. No service-role key is configured yet — anything requiring elevated DB access (bypassing RLS) needs one added server-side only, never exposed via `NEXT_PUBLIC_*`.

`supabase/migrations/` holds one file per schema addition (run manually in the Supabase Dashboard SQL Editor — there is no local Supabase CLI project linked yet, `supabase init`/`link` has not been run). `supabase/seed.sql` holds sample data, kept separate from migrations since it has a different lifecycle (safely re-runnable; migrations are not).

### UI

shadcn/ui (`components.json`, style `base-nova`, base color `neutral`) with Tailwind CSS v4 — config lives in `app/globals.css` via `@theme inline` (no `tailwind.config.js`; the CSS is the config). Path alias `@/*` maps to the project root (see `tsconfig.json`). Component aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks` (per `components.json`). Note `--background` (page canvas) and `--card` (white surface) are visually close but distinct tokens — components meant to look like a white card/input/pill need explicit `bg-card`, not just the default/transparent state, or they blend into the page.
