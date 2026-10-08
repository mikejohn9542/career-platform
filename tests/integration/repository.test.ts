import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getPublishedProfile, getPublishedProject, seedProfile } from "@/db/repository";
import { projects } from "@/db/schema";
import { createTestDatabase, makeFixtureContent } from "./helpers";

describe("content repository", () => {
  it("returns only published projects by slug", async () => {
    const db = await createTestDatabase();
    const content = makeFixtureContent();

    try {
      await seedProfile(db, content);
      expect((await getPublishedProject(db, "published-project"))?.title).toBe("Published project");
      expect(await getPublishedProject(db, "draft-project")).toBeNull();
    } finally {
      await db.close();
    }
  });

  it("reads the published profile and its ordered relationships", async () => {
    const db = await createTestDatabase();
    const content = makeFixtureContent();

    try {
      await seedProfile(db, content);
      const profile = await getPublishedProfile(db);

      expect(profile).toEqual({ ...content, projects: [content.projects[0]] });
    } finally {
      await db.close();
    }
  });

  it("replaces prior authored records when reseeded", async () => {
    const db = await createTestDatabase();
    const content = makeFixtureContent();

    try {
      await seedProfile(db, content);
      const updated = {
        ...content,
        projects: [content.projects[0]],
      };
      await seedProfile(db, updated);

      expect(await getPublishedProject(db, "draft-project")).toBeNull();
      expect(await getPublishedProfile(db)).toEqual(updated);
      const [{ count }] = await db.db.select({ count: sql<number>`count(*)::int` }).from(projects);
      expect(count).toBe(1);
    } finally {
      await db.close();
    }
  });
});
