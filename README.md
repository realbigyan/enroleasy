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
      leads/             Lead pipeline (kanban) + CSV import
      students/          Student list + profile
      applications/      Application tracker
      tasks/             Follow-up tasks
      integrations/      Lead-intake webhook, Meta connect, CSV import notes
    api/
      auth/              register, login, logout, me
      leads/ students/ applications/ tasks/ notes/ destinations/   CRM CRUD
      integrations/      Webhook token + native Meta OAuth/connect flow
      webhooks/meta/     Meta Lead Ads webhook receiver
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
- Partner-agent referral tracking dashboards.

## Lead integrations

Three ways to get leads into EnrolEasy, all documented with in-app setup notes on the **Integrations** page:

1. **Generic webhook** — works today, no approval needed. Point Zapier's or Make.com's built-in
   Facebook Lead Ads trigger at your org's secret webhook URL.
2. **Native Meta integration** — connect a Facebook Page directly via OAuth. Requires a Meta
   Developer App (`META_APP_ID`/`META_APP_SECRET`/`META_WEBHOOK_VERIFY_TOKEN`) and Meta's
   App Review approval for `leads_retrieval` before it's live; the Integrations page shows
   a clear "not yet available" state until then.
3. **CSV import** — always-available manual fallback with column mapping and duplicate detection,
   built into the Leads page.
