# Career Platform

This project is the foundation for a recruiter-focused personal resume and career platform built with Next.js, TypeScript, and Vitest.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm test -- --run tests/unit/smoke.test.ts`
- `npm run db:migrate`
- `npm run db:seed`

## Database (PostgreSQL)

The app reads content from PostgreSQL via `DATABASE_URL`. Without it, pages render from
`src/generated/profile-snapshot.json`, which `npm run build` generates from `src/content/profile.ts`.

- Generate a migration after schema changes: `npx drizzle-kit generate --name <change>`
- Apply migrations: `npm run db:migrate`
- Replace the database content with `src/content/profile.ts`: `npm run db:seed` (idempotent)

On Railway, `railway.json` runs `db:migrate` (never `db:seed`) before each release, and the web
service's `DATABASE_URL` references the Postgres service. Production rows were moved once from the
VM's SQLite backup with `npm run db:move-rows` (see the migration plan). `db:seed` is for local
development only.

## Temporary scaffold

The current home page is intentionally minimal while the portfolio app foundation is being established.
