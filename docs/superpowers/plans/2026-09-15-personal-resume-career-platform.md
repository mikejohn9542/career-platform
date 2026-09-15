# Personal Resume and Career Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, recruiter-focused portfolio with database-backed content, a validated deployment snapshot fallback, dedicated project pages, and a downloadable resume.

**Architecture:** Use a Next.js App Router application with TypeScript, Drizzle ORM, SQLite, and Zod. Version-controlled TypeScript content is validated and compiled into a deployment snapshot; deployment seeds the same content into SQLite, while public server components read SQLite first and fall back to the snapshot on database failure. Deploy the container with Docker Compose to an Azure VM.

**Tech Stack:** Next.js, React, TypeScript, SQLite, Drizzle ORM, Zod, Vitest, Testing Library, Playwright, GitHub Actions, Docker Compose, Azure VM, and Caddy.

**Spec:** `docs/superpowers/specs/2026-09-15-personal-resume-career-platform-design.md`

## Global Constraints

- The first release supports one professional profile only; do not expose multi-profile behavior.
- Content is authored through reviewed repository changes; do not add a web CMS, user accounts, or authentication.
- SQLite is the runtime source of truth when available, with a validated snapshot fallback that keeps the core profile visible during a SQLite outage.
- The public route model is a recruiter-oriented landing page, dedicated project detail pages, and a resume view/download path.
- The visual direction is technical-modern, with semantic markup, keyboard access, responsive layouts, sufficient contrast, and meaningful metadata.
- Contact is an external booking/contact link; do not store contact messages.
- Do not couple core pages to an analytics provider; expose only a provider-neutral instrumentation boundary.
- Build-time content errors must fail with actionable messages; do not silently publish partial or invalid content.
- Keep database access, content validation/import, snapshot fallback, assets, and analytics behind focused boundaries.

---

## File Map

Create these focused units:

- `package.json`, `tsconfig.json`, `next.config.ts`, and `vitest.config.ts`: application and test tooling.
- `src/content/schema.ts`: Zod schemas and inferred content types.
- `src/content/profile.ts`: repository-authored profile content.
- `src/content/load.ts`: content parsing, validation, and snapshot generation.
- `src/generated/profile-snapshot.json`: generated fallback artifact; never hand-edit.
- `src/db/schema.ts`, `src/db/client.ts`, and `src/db/repository.ts`: SQLite schema, connection, and typed reads.
- `drizzle.config.ts`, `drizzle/`: migrations and seed support.
- `scripts/validate-content.ts`, `scripts/generate-snapshot.ts`, and `scripts/seed.ts`: repeatable content/deployment commands.
- `src/lib/content-service.ts`: database-first reads with snapshot fallback and observable fallback logging.
- `src/lib/assets.ts`, `src/lib/analytics.ts`, and `src/lib/seo.ts`: asset, analytics, and metadata boundaries.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/projects/[slug]/page.tsx`, `src/app/resume/page.tsx`, and `src/app/not-found.tsx`: public routes.
- `src/components/`: focused presentation components for profile, project cards/details, navigation, resume, and external contact CTA.
- `public/resume.pdf` and `public/images/`: repository-managed resume and small media assets.
- `tests/unit/`, `tests/integration/`, `tests/integration/helpers.ts`, and `tests/e2e/`: schema, repository/fallback, and public-flow coverage.
- `.github/workflows/ci.yml`: pull-request checks and production build validation.
- `.env.example`, `.gitignore`, and `README.md`: local setup, generated-file rules, and content/deployment instructions.

## Task 1: Scaffold the Next.js application and test foundations

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `tests/unit/smoke.test.ts`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces a runnable Next.js app with `dev`, `build`, `start`, `lint`, `test`, and `test:e2e` scripts.
- Produces a stable `@/*` TypeScript path alias used by later tasks.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/unit/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("application setup", () => {
  it("loads the test runner", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify the toolchain is missing**

Run: `npm test -- --run tests/unit/smoke.test.ts`
Expected: FAIL because the package scripts and dependencies do not exist yet.

- [ ] **Step 3: Add the minimal application scaffold**

Configure Next.js App Router and TypeScript, add `dev`, `build`, `start`, `lint`, `test`, and `test:e2e` scripts, install only the required runtime and test dependencies, and create a root layout with an accessible document language and a temporary home page that clearly indicates the application scaffold is running.

- [ ] **Step 4: Run the smoke test and production build**

Run: `npm test -- --run tests/unit/smoke.test.ts && npm run build`
Expected: PASS and a successful Next.js production build.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts src/app tests/unit .gitignore README.md
git commit -m "chore: scaffold portfolio application"
```

## Task 2: Define and validate repository-authored content

**Files:**
- Create: `src/content/schema.ts`
- Create: `src/content/profile.ts`
- Create: `src/content/load.ts`
- Create: `scripts/validate-content.ts`
- Create: `scripts/generate-snapshot.ts`
- Create: `tests/unit/content.test.ts`
- Create: `src/generated/.gitkeep`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- `profileContentSchema.parse(input): ProfileContent`
- `loadProfileContent(): ProfileContent`
- `writeProfileSnapshot(outputPath: string): Promise<void>`
- `ProfileContent` includes profile, experience, education, skills, projects, resume, and contact fields.
- Snapshot output is JSON representing validated `ProfileContent`.

- [ ] **Step 1: Write failing schema and snapshot tests**

```ts
import { describe, expect, it } from "vitest";
import { loadProfileContent } from "@/content/load";
import { profileContentSchema } from "@/content/schema";

describe("profile content", () => {
  it("loads the authored profile with stable project slugs", () => {
    const content = loadProfileContent();
    expect(content.profile.name).toBeTruthy();
    expect(new Set(content.projects.map((project) => project.slug)).size)
      .toBe(content.projects.length);
  });

  it("rejects malformed external URLs", () => {
    expect(() => profileContentSchema.parse({
      profile: { name: "Test", headline: "Test", summary: "Test" },
      projects: [{ slug: "test", title: "Test", summary: "Test", links: [{ label: "Demo", url: "not-a-url" }] }],
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --run tests/unit/content.test.ts`
Expected: FAIL because the content schema and loader do not exist.

- [ ] **Step 3: Implement the schemas and authored content**

Define strict Zod schemas for required strings, ordered collections, stable slugs, publication status, URLs, project detail content, resume metadata, and asset alt text. Add representative authored content with complete values. `loadProfileContent` must parse the source module through the schema and throw an actionable error naming the invalid path.

- [ ] **Step 4: Implement validation and snapshot commands**

Add `content:validate` and `content:snapshot` scripts. Snapshot generation must create the parent directory, write deterministic formatted JSON, and fail on validation errors. Add the generated snapshot path to `.gitignore` while keeping `.gitkeep`.

- [ ] **Step 5: Run validation and tests**

Run: `npm run content:validate && npm run content:snapshot && npm test -- --run tests/unit/content.test.ts`
Expected: PASS; `src/generated/profile-snapshot.json` exists locally and contains validated content.

- [ ] **Step 6: Commit**

```bash
git add src/content src/generated/.gitkeep scripts package.json .gitignore tests/unit/content.test.ts
git commit -m "feat: add validated portfolio content model"
```

## Task 3: Add SQLite schema, migrations, and seed import

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `src/db/repository.ts`
- Create: `drizzle.config.ts`
- Create: `scripts/seed.ts`
- Create: `tests/integration/helpers.ts`
- Create: `tests/integration/repository.test.ts`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- `createDbClient(databasePath: string): DbClient`
- `seedProfile(db: DbClient, content: ProfileContent): Promise<void>`
- `getPublishedProfile(db: DbClient): Promise<ProfileContent | null>`
- `getPublishedProject(db: DbClient, slug: string): Promise<ProjectContent | null>`
- `createTestDatabase(): Promise<DbClient>` and `makeFixtureContent(): ProfileContent` are defined in `tests/integration/helpers.ts`; the helper creates an isolated schema and closes it after each test.

- [ ] **Step 1: Write failing repository contract tests**

```ts
import { describe, expect, it } from "vitest";
import { seedProfile, getPublishedProject } from "@/db/repository";
import { createTestDatabase, makeFixtureContent } from "./helpers";

describe("content repository", () => {
  it("returns only published projects by slug", async () => {
    const db = await createTestDatabase();
    const content = makeFixtureContent();
    await seedProfile(db, content);
    expect((await getPublishedProject(db, "published-project"))?.title)
      .toBe("Published project");
    expect(await getPublishedProject(db, "draft-project")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the integration test to verify the database boundary is missing**

Run: `npm test -- --run tests/integration/repository.test.ts`
Expected: FAIL because the schema, client, repository, and test database fixture do not exist.

- [ ] **Step 3: Define relational tables and typed repository reads**

Create normalized tables for the single profile, experiences, education, skill groups/items, projects, project technologies, project links, project media, and resume metadata. Enforce stable slugs, foreign keys, publication status, ordering, and uniqueness in the database. Keep SQL/ORM details inside `src/db`.

- [ ] **Step 4: Implement idempotent seeding**

Map validated `ProfileContent` into transactional upserts. Re-running the seed must not duplicate records and must remove or unpublish records no longer present in the authored content according to an explicit deterministic policy.

- [ ] **Step 5: Generate and apply the migration**

Run: `npx drizzle-kit generate`
Expected: A migration is created under `drizzle/` from the schema.

Run: `npm run db:migrate`
Expected: The migration applies using the configured SQLite file path.

- [ ] **Step 6: Run the repository tests against an isolated SQLite database**

Run: `npm test -- --run tests/integration/repository.test.ts`
Expected: PASS with published filtering, stable upserts, and relationship reads covered.

- [ ] **Step 7: Commit**

```bash
git add src/db drizzle drizzle.config.ts scripts/seed.ts tests/integration/repository.test.ts .env.example package.json README.md
git commit -m "feat: add postgres content persistence"
```

## Task 4: Implement database-first content service with snapshot fallback

**Files:**
- Create: `src/lib/content-service.ts`
- Create: `src/lib/logger.ts`
- Create: `tests/unit/content-service.test.ts`
- Create: `tests/unit/fixtures.ts`
- Modify: `src/content/load.ts`
- Modify: `package.json`

**Interfaces:**
- `getSiteContent(): Promise<{ content: ProfileContent; source: "database" | "snapshot" }>`
- `getProjectBySlug(slug: string): Promise<{ project: ProjectContent | null; source: "database" | "snapshot" }>`
- `SnapshotContentProvider` and `DatabaseContentProvider` remain internal to the service module.

- [ ] **Step 1: Write fallback behavior tests**

```ts
import { makeFixtureContent } from "./fixtures";

it("serves the snapshot when the database read fails", async () => {
  const content = makeFixtureContent();
  const service = createContentService({
    database: { getSiteContent: vi.fn().mockRejectedValue(new Error("connection refused")) },
    snapshot: content,
    logger: { warn: vi.fn() },
  });

  await expect(service.getSiteContent()).resolves.toEqual({
    content,
    source: "snapshot",
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --run tests/unit/content-service.test.ts`
Expected: FAIL because the service factory and fallback behavior do not exist.

- [ ] **Step 3: Implement database-first reads**

Load the generated snapshot at module initialization, attempt the database provider first, and fall back only for database availability/query failures. Preserve not-found semantics for an unknown slug. Emit a structured warning containing the route/content operation and error metadata without exposing database details to visitors.

- [ ] **Step 4: Cover edge cases**

Add tests for successful database reads, snapshot project reads, unknown projects, invalid/missing snapshot startup failure, and ensuring database content is preferred when both sources are available.

- [ ] **Step 5: Run the focused test**

Run: `npm test -- --run tests/unit/content-service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content-service.ts src/lib/logger.ts src/content/load.ts tests/unit/content-service.test.ts package.json
git commit -m "feat: add resilient content service"
```

## Task 5: Build accessible public pages and components

**Files:**
- Create: `src/components/site-header.tsx`
- Create: `src/components/profile-hero.tsx`
- Create: `src/components/project-card.tsx`
- Create: `src/components/project-detail.tsx`
- Create: `src/components/skills-section.tsx`
- Create: `src/components/resume-cta.tsx`
- Create: `src/components/contact-cta.tsx`
- Create: `src/app/projects/[slug]/page.tsx`
- Create: `src/app/resume/page.tsx`
- Create: `src/app/not-found.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/e2e/public-site.spec.ts`

**Interfaces:**
- Components consume typed `ProfileContent` or `ProjectContent`; they do not query the database directly.
- Route pages call `getSiteContent()` or `getProjectBySlug(slug)`.
- Dynamic project metadata is generated from project title, summary, and SEO fields.

- [ ] **Step 1: Write the public-flow browser tests**

```ts
test("recruiter can scan the profile and open a project", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /download resume/i })).toBeVisible();
  await page.getByRole("link", { name: /view project/i }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
```

- [ ] **Step 2: Run the browser test to verify the routes are absent**

Run: `npm run test:e2e -- tests/e2e/public-site.spec.ts`
Expected: FAIL because the public route structure and components are not implemented.

- [ ] **Step 3: Implement the shared shell and landing page**

Create semantic header/navigation, main/section landmarks, profile summary, experience, skills, selected project cards, resume download CTA, and external booking/contact CTA. Use responsive CSS with visible keyboard focus, readable contrast, and no interaction that depends on hover alone.

- [ ] **Step 4: Implement project detail and resume routes**

Render published project detail content by stable slug, return the deliberate not-found page for unknown/unpublished projects, and expose the resume PDF through both a dedicated resume page and a direct download link.

- [ ] **Step 5: Add metadata and accessibility assertions**

Set canonical/description/open-graph metadata from validated content, use descriptive link names and image alt text, ensure headings have a logical hierarchy, and add automated checks for keyboard navigation and mobile layout.

- [ ] **Step 6: Run browser and production checks**

Run: `npm run test:e2e && npm run build`
Expected: PASS with the landing page, project route, resume path, and not-found behavior covered.

- [ ] **Step 7: Commit**

```bash
git add src/app src/components tests/e2e
git commit -m "feat: add recruiter-facing portfolio pages"
```

## Task 6: Add assets, SEO, analytics boundary, and Azure VM deployment checks

**Files:**
- Create: `src/lib/assets.ts`
- Create: `src/lib/seo.ts`
- Create: `src/lib/analytics.ts`
- Create: `tests/unit/assets.test.ts`
- Create: `tests/unit/analytics.test.ts`
- Create: `public/resume.pdf`
- Create: `public/images/README.md`
- Create: `.github/workflows/ci.yml`
- Create: `Dockerfile`
- Create: `Caddyfile`
- Create: `scripts/backup-sqlite.ts`
- Modify: `scripts/generate-snapshot.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- `resolveAssetReference(reference: AssetReference): ResolvedAsset`
- `buildPageMetadata(input: SeoInput): Metadata`
- `trackOptional(event: AnalyticsEvent): void`

- [ ] **Step 1: Write unit tests for asset and analytics boundaries**

```ts
it("does not require an analytics provider", () => {
  expect(() => trackOptional({ name: "resume_download" })).not.toThrow();
});

it("rejects media without useful alternative text", () => {
  expect(() => resolveAssetReference({ url: "/images/project.png", alt: "" }))
    .toThrow(/alt/i);
});
```

- [ ] **Step 2: Run focused tests to verify boundaries are missing**

Run: `npm test -- --run tests/unit/assets.test.ts tests/unit/analytics.test.ts`
Expected: FAIL because the boundaries do not exist.

- [ ] **Step 3: Implement asset, metadata, and no-op analytics helpers**

Keep asset storage abstract, require non-empty alt text for images, generate consistent canonical and social metadata, and make analytics a no-op unless an explicit future provider is configured.

- [ ] **Step 4: Add repository assets and documentation**

Add the real resume PDF supplied for the profile, document image sizing/naming/alt-text rules, and update README instructions for content edits, snapshot generation, database setup, seeding, and external booking URL configuration.

- [ ] **Step 5: Add CI**

Configure GitHub Actions to install from the lockfile, run content validation, generate the snapshot, run type checks, lint, unit/integration tests, and production build. Build a Docker image and document deployment to an Azure VM through Docker Compose. Persist SQLite outside the container, configure Caddy for the custom domain and automated HTTPS, and schedule local SQLite copies with retention. Never commit credentials or TLS material.

- [ ] **Step 6: Run the complete validation**

Run: `npm run content:validate && npm test && npm run build && docker compose config`
Expected: PASS locally with no committed generated snapshot and no provider-specific analytics requirement.

- [ ] **Step 7: Commit**

```bash
git add src/lib public .github package.json README.md scripts
git commit -m "chore: add assets metadata and ci checks"
```

## Final Verification

- [ ] Run `git diff --check`.
- [ ] Run `npm run content:validate`.
- [ ] Run `npm test`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run build`.
- [ ] Verify a SQLite outage test serves the generated snapshot and logs an operator-visible warning.
- [ ] Verify the public profile, resume, and project pages remain usable with JavaScript disabled where the framework supports it.
- [ ] Verify `git status --short` contains only intentional changes before handoff.
