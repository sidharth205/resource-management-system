# Resource Management System — Backend + Admin (Person A)

This is the scaffold: Prisma schema (locked), all `lib/` helpers (RBAC, audit, notify, Supabase clients), `middleware.ts`, the login flow, and every API route from the contract wired to real Prisma queries. Placeholder pages exist for every route so the folder structure is fully navigable — fill them in per the day-by-day plan.

## What's already done
- Next.js 14 (App Router) + TypeScript + Tailwind, scaffolded
- `prisma/schema.prisma` — full schema, all 10 tables, matches the API contract
- `lib/prisma.ts`, `lib/supabase-server.ts`, `lib/supabase-browser.ts`
- `lib/rbac.ts` — `requireRole()` used by every route
- `lib/audit.ts` — `logAudit()`
- `lib/notify.ts` — `createNotification()`
- `middleware.ts` — role-based route protection for `/admin`, `/manager`, `/employee`
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/role`
- `/api/users`, `/api/designations`, `/api/projects`, `/api/tasks`, `/api/timesheets` (+ `/:id` approve/reject), `/api/notifications` (+ `/:id/read`), `/api/dashboard/*-stats`, `/api/reports/*`, `/api/audit-logs`
- `/login` page (working, calls the real API)
- Role-specific layouts with sidebars for `/admin`, `/manager`, `/employee`
- Placeholder page for every route in the plan

## What's NOT done yet (today's remaining steps, in order)
1. Create your Supabase project and fill in `.env.local` (steps below).
2. Run the first migration.
3. Decide + implement how employee accounts get created (see "Two-step user creation" below — this is the one real design decision left).
4. Build out the Admin frontend pages (currently placeholders) — Days 3–4 and 8–9 per the team plan.

---

## Local setup steps

### 1. Install dependencies
```bash
npm install
```

### 2. Create your Supabase project
1. Go to https://supabase.com, sign in, click **New Project**.
2. Pick a name, a database password (save it), and a region close to you.
3. Wait ~2 minutes for provisioning.

### 3. Get your environment variables
1. In the Supabase dashboard: **Project Settings → API** — copy the **Project URL** and the **anon public** key.
2. **Project Settings → Database → Connection string** — copy the **Transaction pooler** URL (for `DATABASE_URL`) and the **Session pooler** or direct connection URL (for `DIRECT_URL`). Replace `[YOUR-PASSWORD]` in both with the DB password from step 2.2.
3. Copy `.env.example` to `.env.local` and paste in all four values:
   ```bash
   cp .env.example .env.local
   ```

### 4. Generate the Prisma client and run the first migration
```bash
npx prisma generate
npx prisma migrate dev --name init
```
This creates all 10 tables in your Supabase Postgres database. Open **Supabase → Table Editor** afterward to confirm they're there.

### 5. Enable email/password auth in Supabase
Supabase Dashboard → **Authentication → Providers** — Email should be enabled by default. Under **Authentication → Settings**, you can turn off "Confirm email" for faster local testing (turn it back on before any real deployment).

### 6. Create your first admin user (two-step, see note below)
Since public signup is intentionally not built (Admin creates all accounts per the team plan), you need to seed the very first admin manually:
1. Supabase Dashboard → **Authentication → Users → Add User** — create a user with an email/password, confirm email if required.
2. Copy that user's UUID from the Users table.
3. Supabase Dashboard → **Table Editor → profiles → Insert row** — `id` = the UUID you copied, `name`, `email` (same as auth user), `role` = `admin`, `status` = `active`.
4. Now `npm run dev` and log in at `/login` with that email/password — you should land on `/admin`.

### 7. Run the dev server
```bash
npm run dev
```
Visit http://localhost:3000 — it redirects to `/login`.

---

## Two-step user creation (design note for when you build the "Create Employee" form)

`POST /api/users` as currently written only creates the `profiles` row — it does **not** create a Supabase Auth user, so that employee can't log in yet. To actually let admin-created employees log in, you have two options:

- **Simple (recommended for a 10-day project):** admin creates the profile via the form, then manually invites the user via Supabase Dashboard → Authentication → Users → Invite, using the same email and matching the UUID. A bit manual, but zero extra code.
- **Full (if you have time later):** use the Supabase **service role key** (never expose client-side) inside `/api/users` POST to call `supabase.auth.admin.createUser()` server-side, so one form submission does both steps. This needs a `SUPABASE_SERVICE_ROLE_KEY` env var and a separate admin Supabase client — don't build this until the simple version is working end-to-end.

## Deploying (Day 11, not today)
1. Push this repo to GitHub.
2. Vercel → Import Project → select the repo.
3. Add the same 4 env vars from `.env.local` in Vercel's Environment Variables settings.
4. Deploy. Vercel auto-builds on every push to `main`.
