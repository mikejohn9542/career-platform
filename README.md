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

## SQLite database

Copy `.env.example` to `.env` and set `DATABASE_PATH` to the SQLite file used by the
application. Generate migrations after schema changes with `npx drizzle-kit generate`,
then apply them with `npm run db:migrate`. Seeding is transactional and replaces the
authored profile graph, so repeated runs are idempotent and remove records no longer
present in `src/content/profile.ts`.

## Temporary scaffold

The current home page is intentionally minimal while the portfolio app foundation is being established.
