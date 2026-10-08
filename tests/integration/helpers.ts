import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { MIGRATIONS_FOLDER, type Database, type DbClient } from "@/db/client";
import { schema } from "@/db/schema";
import type { ProfileContent } from "@/content/schema";

// A real Postgres engine in-process: no Docker, no network, fresh per test.
export async function createTestDatabase(): Promise<DbClient> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return {
    db: db as unknown as Database,
    close: () => pglite.close(),
  };
}

export function makeFixtureContent(): ProfileContent {
  return {
    profile: {
      name: "Test Person",
      headline: "Product engineer",
      summary: "Builds useful software.",
      location: "Remote",
      pronouns: "they/them",
    },
    experience: [
      {
        company: "Example Co",
        role: "Engineer",
        location: "Remote",
        startDate: "2024-01",
        current: true,
        summary: "Built products.",
        highlights: ["Shipped features."],
      },
    ],
    education: [
      {
        school: "Example University",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2020-09",
        endDate: "2024-06",
        summary: "Studied software.",
      },
    ],
    skills: [{ name: "Languages", items: ["TypeScript", "SQL"] }],
    projects: [
      {
        slug: "published-project",
        title: "Published project",
        summary: "A published project.",
        description: "A detailed published project.",
        status: "published",
        stack: ["TypeScript"],
        highlights: ["Delivered value."],
        links: [{ label: "Demo", url: "https://example.com/published" }],
      },
      {
        slug: "draft-project",
        title: "Draft project",
        summary: "A draft project.",
        description: "A detailed draft project.",
        status: "draft",
        stack: ["TypeScript"],
        highlights: ["Still in progress."],
        links: [{ label: "Repo", url: "https://example.com/draft" }],
      },
    ],
    resume: {
      fileName: "resume.pdf",
      publishedAt: "2026-09-15T00:00:00.000Z",
      status: "published",
      pdfUrl: "https://example.com/resume.pdf",
      summary: "A resume.",
    },
    contact: {
      email: "test@example.com",
      linkedin: "https://linkedin.com/in/test",
      github: "https://github.com/test",
      location: "Remote",
    },
  };
}
