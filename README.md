<div align="center">

# Sanggabiz LMS

**A modern Learning Management System — course authoring, assessments, progress tracking & certificates.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Features](#-features) • [Tech Stack](#️-tech-stack) • [Quick Start](#-quick-start) • [Project Structure](#️-project-structure) • [Roadmap](#️-roadmap)

</div>

---

## 🎯 Overview

Sanggabiz LMS is a Learning Management System built with **Next.js 16**, **React 19**, **TypeScript**, and **Supabase**. It provides a complete flow for creating, managing, and delivering online courses — rich video/text/slides lessons, an interactive quiz & essay-assessment engine, per-lesson progress tracking, and automated completion certificates.

Access is organized around three roles: **learner**, **admin**, and **superadmin**, enforced end-to-end by Supabase Row-Level Security.

> ⚠️ **This is not the Next.js you may know.** Next.js 16 has real breaking changes: middleware is renamed to **Proxy** (the root file is `proxy.ts` exporting `proxy()`, there is **no** `middleware.ts`), and async APIs (`cookies()`, `headers()`, `params`, `searchParams`) are async-only. See [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md) before relying on prior Next.js knowledge.

---

## ✨ Features

### Course Management
- 📝 Rich text lesson editor (Tiptap) with images, headings, colors, and highlights
- 🎥 Video lessons (YouTube) and 🖥️ Google Slides lessons
- 📄 Downloadable per-lesson resources
- 🧩 Modules (sections) with drag-and-drop lesson reordering
- 🔗 Course prerequisites
- 📦 Draft → publish workflow with live preview
- 🖼️ Thumbnail uploads via Supabase Storage

### Learning Experience
- 🖥️ Full-screen immersive lesson player
- ✅ Per-lesson completion checkbox with real-time progress bar
- 📝 Interactive quizzes (multiple choice, short answer)
- 🧠 Essay / study-case assessments with resumable server-side drafts
- 🏆 Certificate issued automatically on course completion

### Assessment Engine
- ❓ Multiple question types (multiple choice single/multi, short answer, essay)
- ⚙️ Configurable pass score, attempts, time limit, and shuffle
- 🤖 Server-side auto-grading for objective questions
- ✍️ Manual essay grading workflow (Admin → Grading)

### Admin & Superadmin Tools
- 📚 Full course management (create, edit, publish, delete)
- 👥 Learner management — enroll / unenroll any learner
- 💳 Purchase management (free-only records today; see [Roadmap](#️-roadmap))
- 🎓 Certificate template management — design, signer, and type (see [Certificates](#certificates))
- 🖊️ Editable public landing page (superadmin)
- 🔐 Role-based access control enforced via Postgres RLS

### Certificates
- 🎓 Automated generation on completion
- ✍️ Custom template, signature, signer name/title, and certificate type
- 📄 PDF export stored in Supabase Storage

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first config, no `tailwind.config.js`)
- **Components:** [shadcn/ui](https://ui.shadcn.com/) (`base-nova`) + Radix primitives, [Lucide](https://lucide.dev/) icons, [Sonner](https://sonner.emilkowal.ski/) toasts
- **Theming:** [next-themes](https://github.com/pacocoursey/next-themes) (light/dark)
- **Database & Auth:** [Supabase](https://supabase.com/) — PostgreSQL + Auth (`@supabase/ssr`) + Storage
- **Forms & Validation:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Rich Text:** [Tiptap](https://tiptap.dev/)
- **Drag & Drop:** [dnd-kit](https://dndkit.com/)
- **PDF Generation:** [@react-pdf/renderer](https://react-pdf.org/)
- **Deployment:** [Cloudflare Workers](https://workers.cloudflare.com/) via [OpenNext](https://opennext.js.org/cloudflare)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm 10.0 or higher
- A Supabase account (free tier works)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

   > No service-role key is used — every DB access runs under the anon/authenticated key and is gated by RLS.

3. **Set up the Supabase database**

   **a. Create a Supabase project**
   - Go to [supabase.com](https://supabase.com), sign in, and click **New Project**.
   - Choose an organization, project name, database password, and region; wait ~2 minutes for provisioning.

   **b. Get your credentials**
   - Go to **Project Settings → API**.
   - Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy the **anon / publishable** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - Update `.env.local` with these values.

   **c. Run the database setup**
   - In the Supabase project, open **SQL Editor → New Query**.
   - Paste the entire contents of [`supabase/migrations/databaseSetup.sql`](./supabase/migrations/databaseSetup.sql).
   - Click **Run**. This is the single consolidated schema — tables, RLS policies, functions, triggers, and Storage buckets.

   **d. Complete the dashboard-only steps**
   - **Auth → Hooks:** enable the custom access-token hook (`custom_access_token_hook`) so `profiles.role` is mirrored into the JWT.
   - **Auth → Providers:** configure Email and Google sign-in, plus redirect URLs.

4. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### First admin user

New signups default to the `learner` role. To create your first **admin** / **superadmin**, sign up through the app, then update that user's `role` in the Supabase **Table Editor** (`public.profiles`) — the role is never client-writable by design.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run preview` | Build + preview locally on Cloudflare Workers |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run cf-typegen` | Regenerate `CloudflareEnv` types after changing bindings |

> There is no test suite configured yet.

---

## 🏗️ Project Structure

Single Next.js app (not a monorepo):

```
academy-lms-sanggabiz/
├── app/
│   ├── page.tsx            # public landing page (superadmin-editable)
│   ├── admin/              # admin dashboard: courses, learners, grading, purchases, landing
│   ├── learner/            # learner shell: dashboard, courses, purchase, profile, settings
│   ├── learn/[courseId]/   # full-screen lesson player (deliberately outside /learner)
│   ├── auth/               # authentication pages
│   └── api/                # API routes (scaffolding)
├── components/
│   ├── admin/              # admin UI (course builder, tabs, pickers)
│   ├── learner/            # learner shell, sidebar, curriculum
│   ├── learn/              # lesson player panes
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabase/           # browser + server clients, session proxy helper
│   ├── courses.ts          # client-safe course types/helpers
│   ├── courses-server.ts   # server-only course data fetches
│   ├── courses-admin.ts    # server-only admin course mutations
│   └── certificates.ts     # certificate issuance + PDF generation
├── supabase/migrations/    # databaseSetup.sql — single source of truth
├── reference/              # design handoff (prototype + tokens) — reference only
├── proxy.ts                # Next.js 16 Proxy (replaces middleware.ts)
├── erd.md                  # target data model + build status
└── CLAUDE.md / AGENTS.md   # architecture notes & Next.js 16 conventions
```

---

## 📖 Documentation

- [`erd.md`](./erd.md) — data model, entity dictionary, RLS intent, and build status.
- [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) — architecture notes and Next.js 16 conventions.
- `reference/design_handoff_ease_lms/` — high-fidelity design prototype and design tokens (reference only; do not import or run).

---

## 🗺️ Roadmap

Per [`erd.md`](./erd.md), the following are not yet built:

- [ ] **Payment gateway integration** — commerce is scaffolded as free-only today (`transactions` table + purchase screens); a real charge flow is deferred.
- [ ] **Course categories** — `categories` table + `courses.category_id` + category filtering.
- [ ] **Brand settings** — site name, logo, and primary color (partially covered by the landing-page editor).
- [ ] **Email notifications** — enrollment / completion / certificate emails.
- [ ] Additional quiz question types (true/false, matching, fill-in-the-blank — enum-reserved).

---

<div align="center">

**Sanggabiz LMS** — built with Next.js 16, Supabase, and Tailwind CSS.

</div>
