# EnrolEasy

A B2B SaaS platform for study-abroad and test-prep consultancies. Each consultancy
gets its own workspace with:

- **CRM** — lead pipeline (stage-based kanban), student profiles, university/course
  applications, follow-up tasks, and notes.
- **Test-prep platform** — mock tests for IELTS, PTE Academic, and the Duolingo
  English Test, with objective auto-scoring and a placeholder scoring path for
  writing/speaking responses (ready to be wired up to a real AI-grading service).
- **Multi-tenancy** — every record is scoped to an `Organization`; users have
  roles (`OWNER`, `ADMIN`, `COUNSELOR`, `STUDENT`) that gate what they can do.
- **Subscriptions** — a `Subscription` model (plan/status/seats) is in place so
  Stripe billing can be layered on without a schema change.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — one codebase for marketing site,
  dashboard, and API routes.
- **PostgreSQL + Prisma** — schema in `prisma/schema.prisma`.
- **Custom auth** — email/password with bcrypt hashing and a JWT stored in an
  httpOnly cookie (`src/lib/auth.ts`). No third-party auth dependency.
- **Tailwind CSS v4** for styling, `lucide-react` for icons.

## Project structure

```
prisma/
  schema.prisma       Multi-tenant CRM + test-prep data model
  seed.ts             Demo organization, users, leads, students, mock tests
src/
  app/
    page.tsx            Marketing landing page
    login/ register/    Auth pages
    dashboard/
      layout.tsx         Auth-gated shell + sidebar nav
      page.tsx           Overview / stats
      leads/             Lead pipeline (kanban)
      students/          Student list + profile
      applications/      Application tracker
      tasks/             Follow-up tasks
      test-prep/         Module picker → mock test list → attempt → results
    api/
      auth/              register, login, logout, me
      leads/ students/ applications/ tasks/ notes/ destinations/   CRM CRUD
      test-prep/          mock-tests, attempts, answers, submit (scoring)
  lib/
    prisma.ts           Prisma client singleton
    auth.ts             Password hashing, JWT sessions, cookie helpers
    api-guard.ts        requireSession() — auth + role guard for API routes
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in:
   - `DATABASE_URL` — any PostgreSQL instance (Supabase, Neon, Railway, or local Docker).
   - `JWT_SECRET` — generate one with `openssl rand -base64 32`.

3. **Generate the Prisma client and create the database schema**

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Seed demo data** (a consultancy, a counselor, a student, and sample
   IELTS/PTE/Duolingo mock tests)

   ```bash
   npm run db:seed
   ```

   Demo logins (password for all: `password123`):
   - Owner: `owner@everest.test`
   - Counselor: `counselor@everest.test`
   - Student: `student@everest.test`

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. `/register` creates a brand-new consultancy
   workspace (this is the B2B signup flow); `/login` signs into an existing one.

> **Note on this sandbox:** `npx prisma generate` and `migrate` need to download
> Prisma's query-engine binaries from `binaries.prisma.sh`, which is blocked by
> this environment's network allowlist. The schema, seed script, and all
> application code are written and ready — run the two commands above on your
> own machine (or CI) where that domain isn't blocked, and everything will
> generate and run normally.

## How the test-prep scoring works today

- Objective question types (`MULTIPLE_CHOICE`, `TRUE_FALSE_NOTGIVEN`,
  `MATCHING`, `FILL_BLANK`) are graded the instant a student answers, by exact
  match against `Question.correctAnswer`.
- Subjective types (`ESSAY` for Writing, `SPEAKING_PROMPT` for Speaking) get a
  provisional score when the attempt is submitted
  (`src/app/api/test-prep/attempts/[id]/submit/route.ts`), flagged in
  `Answer.aiFeedback` as pending full review. Swap that placeholder block for
  a real call to an LLM grader or human-review queue when you're ready.
- Scores are normalized per test type: IELTS bands (0–9, nearest 0.5), PTE
  (10–90), Duolingo (10–160).

## Roadmap / natural next steps

- Stripe billing wired to the `Subscription` model (checkout, webhooks, seat limits).
- Real audio recording/playback for Speaking and Listening items (currently a
  transcript textarea stands in for the recorder).
- AI-scored writing/speaking feedback (the `aiFeedback` field and submit route
  are the integration point).
- Org-level settings page (invite counselors, manage seats, branding).
- Email notifications for task due-dates and application status changes.
- Bulk lead import (CSV) and partner-agent referral tracking.
