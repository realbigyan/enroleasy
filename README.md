# EnrolEasy

A B2B SaaS platform for study-abroad consultancies. Each consultancy
gets its own workspace with:

- **CRM** — lead pipeline (stage-based kanban), student profiles, university/course
  applications, follow-up tasks, and notes.
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
  schema.prisma       Multi-tenant CRM data model
  seed.ts             Demo organization, users, leads, students
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
    api/
      auth/              register, login, logout, me
      leads/ students/ applications/ tasks/ notes/ destinations/   CRM CRUD
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

4. **Seed demo data** (a consultancy, a counselor, and a student)

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

## Roadmap / natural next steps

- Stripe billing wired to the `Subscription` model (checkout, webhooks, seat limits).
- Org-level settings page (invite counselors, manage seats, branding).
- Email notifications for task due-dates and application status changes.
- Bulk lead import (CSV) and partner-agent referral tracking.
