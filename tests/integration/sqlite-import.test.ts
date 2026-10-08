import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPublishedProfile } from "@/db/repository";
import { experienceHighlights, experiences } from "@/db/schema";
import { compareRows, importRows, readSqliteRows } from "@/db/sqlite-import";
import { createTestDatabase } from "./helpers";
import { makeSqliteFixture } from "./sqlite-fixture";

describe("moving rows from the VM's SQLite backup", () => {
  let fixture: ReturnType<typeof makeSqliteFixture>;
  beforeEach(() => {
    fixture = makeSqliteFixture();
  });
  afterEach(() => fixture.cleanup());

  it("copies every row with its original id and the page reads the same profile", async () => {
    const db = await createTestDatabase();
    try {
      const rows = readSqliteRows(fixture.file);
      await importRows(db.db, rows);

      const report = await compareRows(db.db, rows);
      expect(report.every((entry) => entry.identical)).toBe(true);
      const [experience] = await db.db.select().from(experiences).where(eq(experiences.id, 7));
      expect(experience.current).toBe(true);
      const profile = await getPublishedProfile(db);
      expect(profile?.profile.name).toBe("Test Person");
      expect(profile?.skills[0].items).toEqual(["TypeScript", "SQL"]);
    } finally {
      await db.close();
    }
  });

  it("refuses to overwrite existing content unless replace is set", async () => {
    const db = await createTestDatabase();
    try {
      const rows = readSqliteRows(fixture.file);
      await importRows(db.db, rows);
      await expect(importRows(db.db, rows)).rejects.toThrow(/--replace/);
      await importRows(db.db, rows, { replace: true });
      const report = await compareRows(db.db, rows);
      expect(report.every((entry) => entry.identical)).toBe(true);
    } finally {
      await db.close();
    }
  });

  it("continues identity sequences after the moved ids", async () => {
    const db = await createTestDatabase();
    try {
      await importRows(db.db, readSqliteRows(fixture.file));
      const [inserted] = await db.db.insert(experienceHighlights)
        .values({ experienceId: 7, sortOrder: 1, value: "Added after the move." })
        .returning({ id: experienceHighlights.id });
      expect(inserted.id).toBeGreaterThan(11);
    } finally {
      await db.close();
    }
  });
});
