import { describe, expect, it, vi } from "vitest";
import { createContentService } from "@/lib/content-service";
import { makeFixtureContent, makeFixtureProject } from "./fixtures";

describe("content service", () => {
  it("serves the snapshot when the database read fails", async () => {
    const content = makeFixtureContent();
    const service = createContentService({
      database: {
        getSiteContent: vi.fn().mockRejectedValue(new Error("connection refused")),
        getProjectBySlug: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    await expect(service.getSiteContent()).resolves.toEqual({
      content,
      source: "snapshot",
    });
  });

  it("prefers database content when available", async () => {
    const content = makeFixtureContent();
    const databaseContent = { ...content, profile: { ...content.profile, name: "DB user" } };
    const service = createContentService({
      database: {
        getSiteContent: vi.fn().mockResolvedValue(databaseContent),
        getProjectBySlug: vi.fn().mockResolvedValue(makeFixtureProject()),
      },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    await expect(service.getSiteContent()).resolves.toEqual({
      content: databaseContent,
      source: "database",
    });
  });

  it("reads a project from the snapshot when the database is unavailable", async () => {
    const content = makeFixtureContent();
    const service = createContentService({
      database: {
        getSiteContent: vi.fn().mockRejectedValue(new Error("connection refused")),
        getProjectBySlug: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    await expect(service.getProjectBySlug("published-project")).resolves.toEqual({
      project: makeFixtureProject(),
      source: "snapshot",
    });
  });

  it("returns null for an unknown project slug", async () => {
    const content = makeFixtureContent();
    const service = createContentService({
      database: {
        getSiteContent: vi.fn().mockResolvedValue(content),
        getProjectBySlug: vi.fn().mockResolvedValue(null),
      },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    await expect(service.getProjectBySlug("missing-project")).resolves.toEqual({
      project: null,
      source: "snapshot",
    });
  });

  it("throws when no snapshot is available and the database is absent", () => {
    expect(() => createContentService({
      database: undefined,
      snapshot: null,
      logger: { warn: vi.fn() },
    })).toThrow(/snapshot/i);
  });
});
