import { describe, expect, it, vi } from "vitest";
import { createContentService, createDefaultDatabaseProvider } from "@/lib/content-service";
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
  it("logs a fallback when the database is reachable but empty", async () => {
    const content = makeFixtureContent();
    const warn = vi.fn();
    const service = createContentService({
      database: { getSiteContent: vi.fn().mockResolvedValue(null), getProjectBySlug: vi.fn() },
      snapshot: content,
      logger: { warn },
    });

    await expect(service.getSiteContent()).resolves.toEqual({ content, source: "snapshot" });
    expect(warn).toHaveBeenCalledWith("content_service_fallback", expect.objectContaining({ reason: "empty" }));
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
