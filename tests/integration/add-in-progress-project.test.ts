import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import { MIGRATIONS_FOLDER, type Database, type DbClient } from "@/db/client";
import { getPublishedProfile, seedProfile } from "@/db/repository";
import { schema } from "@/db/schema";
import { makeFixtureContent } from "./helpers";

// scripts/sql/add-in-progress-project.sql is run by hand against the production
// database through Railway's query console, so it gets the same scrutiny as code:
// it runs here against a real Postgres engine before it runs against production.
const SQL_FILE = path.resolve(process.cwd(), "scripts/sql/add-in-progress-project.sql");

async function freshDatabase(): Promise<DbClient & { exec: (sql: string) => Promise<unknown> }> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return {
    db: db as unknown as Database,
    close: () => pglite.close(),
    exec: (sql: string) => pglite.exec(sql),
  };
}

describe("the in-progress project entry", () => {
  it("appears in the published projects, labelled in progress, with its stack, highlights and links", async () => {
    const client = await freshDatabase();
    try {
      await seedProfile(client, makeFixtureContent());
      await client.exec(readFileSync(SQL_FILE, "utf8"));

      const profile = await getPublishedProfile(client);
      const entry = profile?.projects.find((project) => project.slug === "michaeljportfolio-me");

      expect(entry).toBeDefined();
      expect(entry?.title).toContain("michaeljportfolio.me");
      expect(entry?.summary).toMatch(/in progress/i);
      expect(entry?.stack).toContain("PostgreSQL");
      expect(entry?.highlights.length).toBe(4);
      expect(entry?.highlights.some((line) => /in progress/i.test(line))).toBe(true);
      expect(entry?.links.map((link) => link.url)).toContain("https://michaeljportfolio.me");
    } finally {
      await client.close();
    }
  });

  it("sorts after the projects that already exist rather than colliding with them", async () => {
    const client = await freshDatabase();
    try {
      await seedProfile(client, makeFixtureContent());
      await client.exec(readFileSync(SQL_FILE, "utf8"));

      const profile = await getPublishedProfile(client);
      const slugs = profile?.projects.map((project) => project.slug) ?? [];

      // The fixture's published project keeps its place; the new entry goes last.
      expect(slugs[slugs.length - 1]).toBe("michaeljportfolio-me");
      expect(slugs).toContain("published-project");
    } finally {
      await client.close();
    }
  });

  it("changes nothing when run a second time, so a repeated run is safe", async () => {
    const client = await freshDatabase();
    try {
      await seedProfile(client, makeFixtureContent());
      const sql = readFileSync(SQL_FILE, "utf8");
      await client.exec(sql);
      const once = await getPublishedProfile(client);

      await client.exec(sql);
      const twice = await getPublishedProfile(client);

      expect(twice?.projects.length).toBe(once?.projects.length);
      const entry = twice?.projects.find((project) => project.slug === "michaeljportfolio-me");
      expect(entry?.highlights.length).toBe(4);
      expect(entry?.stack.length).toBe(6);
    } finally {
      await client.close();
    }
  });
});
