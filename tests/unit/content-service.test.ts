import { describe, expect, it, vi } from "vitest";
import { createContentService, createDefaultDatabaseProvider } from "@/lib/content-service";
import { makeFixtureContent, makeFixtureProject } from "./fixtures";

describe("content service", () => {
  it("marks projects unavailable and never substitutes them when the database read fails", async () => {
    const content = makeFixtureContent();
    const service = createContentService({
      database: {
        getSiteContent: vi.fn().mockRejectedValue(new Error("connection refused")),
        getProjectBySlug: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    const result = await service.getSiteContent();
    expect(result.projects).toBe("unavailable");
    expect(result.content.projects).toEqual([]);
    expect(result.content.profile).toEqual(content.profile);
  });

  it("logs the reason when the database is unreachable", async () => {
    const warn = vi.fn();
    const service = createContentService({
      database: {
        getSiteContent: vi.fn().mockRejectedValue(new Error("connection refused")),
        getProjectBySlug: vi.fn(),
      },
      snapshot: makeFixtureContent(),
      logger: { warn },
    });

    await service.getSiteContent();
    expect(warn).toHaveBeenCalledWith(
      "content_unavailable",
      expect.objectContaining({ reason: "connection refused" }),
    );
  });

  it("prefers database content and reports projects as available", async () => {
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
      projects: "available",
    });
  });

  it("treats an empty project list as a deliberate state, not a failure", async () => {
    const content = makeFixtureContent();
    const empty = { ...content, projects: [] };
    const service = createContentService({
      database: { getSiteContent: vi.fn().mockResolvedValue(empty), getProjectBySlug: vi.fn() },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    const result = await service.getSiteContent();
    expect(result.projects).toBe("available");
    expect(result.source).toBe("database");
    expect(result.content.projects).toEqual([]);
  });

  it("treats a missing profile row as unavailable rather than serving the snapshot projects", async () => {
    const content = makeFixtureContent();
    const warn = vi.fn();
    const service = createContentService({
      database: { getSiteContent: vi.fn().mockResolvedValue(null), getProjectBySlug: vi.fn() },
      snapshot: content,
      logger: { warn },
    });

    const result = await service.getSiteContent();
    expect(result.projects).toBe("unavailable");
    expect(result.content.projects).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      "content_unavailable",
      expect.objectContaining({ reason: "no published profile row" }),
    );
  });

  it("recovers on the next call once the database answers again", async () => {
    const content = makeFixtureContent();
    const getSiteContent = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValueOnce(content);
    const service = createContentService({
      database: { getSiteContent, getProjectBySlug: vi.fn() },
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    expect((await service.getSiteContent()).projects).toBe("unavailable");
    const recovered = await service.getSiteContent();
    expect(recovered.projects).toBe("available");
    expect(recovered.source).toBe("database");
  });

  it("renders from the snapshot without a database, which is not a degraded state", async () => {
    const content = makeFixtureContent();
    const service = createContentService({
      database: undefined,
      snapshot: content,
      logger: { warn: vi.fn() },
    });

    await expect(service.getSiteContent()).resolves.toEqual({
      content,
      source: "snapshot",
      projects: "available",
    });
  });

  it("reports an unavailable project lookup instead of falling back", async () => {
    const service = createContentService({
      database: {
        getSiteContent: vi.fn(),
        getProjectBySlug: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
      snapshot: makeFixtureContent(),
      logger: { warn: vi.fn() },
    });

    await expect(service.getProjectBySlug("published-project")).resolves.toEqual({
      project: null,
      source: "unavailable",
    });
  });

  it("returns null for an unknown project slug without falling back", async () => {
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
      source: "database",
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

describe("createDefaultDatabaseProvider", () => {
  it("returns undefined without DATABASE_URL, so the service serves the snapshot", () => {
    expect(createDefaultDatabaseProvider({})).toBeUndefined();
  });

  it("creates a provider when DATABASE_URL is set, without connecting yet", () => {
    const provider = createDefaultDatabaseProvider({ DATABASE_URL: "postgresql://user:pass@127.0.0.1:1/none" });
    expect(provider).toBeDefined();
    expect(typeof provider?.getSiteContent).toBe("function");
  });
});
