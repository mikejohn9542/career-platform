import fs from "node:fs";
import { profileContentSchema, type ProfileContent, type ProjectContent } from "@/content/schema";
import { getGeneratedSnapshotPath } from "@/content/load";
import { createDbClient } from "@/db/client";
import { getPublishedProfile, getPublishedProject } from "@/db/repository";
import { createLogger, type Logger } from "./logger";

export interface DatabaseContentProvider {
  getSiteContent(): Promise<ProfileContent | null>;
  getProjectBySlug(slug: string): Promise<ProjectContent | null>;
}

export interface ContentServiceOptions {
  database?: DatabaseContentProvider;
  snapshot?: ProfileContent | null;
  logger?: Logger;
}

// "unavailable" means the database could not answer. The project list is then empty and the caller
// must say so, never fill it from somewhere else: substituting content would hide a real outage,
// which is exactly how a failed deploy once passed for a healthy one.
export type ProjectsState = "available" | "unavailable";

export interface SiteContentResult {
  content: ProfileContent;
  source: "database" | "snapshot";
  projects: ProjectsState;
}

const startupSnapshot = (() => {
  try {
    const resolvedPath = getGeneratedSnapshotPath();
    const raw = fs.readFileSync(resolvedPath, "utf8");
    return profileContentSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
})();

function resolveSnapshot(snapshot: ProfileContent | null | undefined): ProfileContent | null {
  if (snapshot === undefined) return startupSnapshot;
  return snapshot;
}

// Migrations run once per deploy (Railway pre-deploy), never per request.
export function createDefaultDatabaseProvider(env: Readonly<Record<string, string | undefined>> = process.env): DatabaseContentProvider | undefined {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) return undefined;

  const client = createDbClient(connectionString);
  return {
    getSiteContent: () => getPublishedProfile(client),
    getProjectBySlug: (slug) => getPublishedProject(client, slug),
  };
}

export function createContentService({
  database,
  snapshot,
  logger,
}: ContentServiceOptions): {
  getSiteContent(): Promise<SiteContentResult>;
  getProjectBySlug(slug: string): Promise<{ project: ProjectContent | null; source: "database" | "snapshot" | "unavailable" }>;
} {
  const fallbackSnapshot = resolveSnapshot(snapshot);
  const log = logger ?? createLogger();

  if (!fallbackSnapshot && !database) {
    throw new Error("No valid content snapshot is available and no database provider is configured.");
  }

  // The profile is authored content and is safe to render from the snapshot. The projects are not:
  // they live only in the database, so an outage leaves the list empty and labelled.
  function degraded(reason: string): SiteContentResult {
    log.warn("content_unavailable", { operation: "getSiteContent", reason });
    if (!fallbackSnapshot) {
      throw new Error("Content snapshot is missing and the database is unavailable.");
    }
    return {
      content: { ...fallbackSnapshot, projects: [] },
      source: "snapshot",
      projects: "unavailable",
    };
  }

  return {
    async getSiteContent(): Promise<SiteContentResult> {
      if (!database) {
        // Local development with no DATABASE_URL. Nothing failed, so this is not a degraded render.
        if (!fallbackSnapshot) {
          throw new Error("Content snapshot is missing and no database source is available.");
        }
        return { content: fallbackSnapshot, source: "snapshot", projects: "available" };
      }

      try {
        const content = await database.getSiteContent();
        // An empty project table is a deliberate state, not a failure: the page renders its own
        // empty message and the request still succeeds.
        if (content) return { content, source: "database", projects: "available" };
        return degraded("no published profile row");
      } catch (error) {
        return degraded(error instanceof Error ? error.message : String(error));
      }
    },
    async getProjectBySlug(slug: string): Promise<{ project: ProjectContent | null; source: "database" | "snapshot" | "unavailable" }> {
      if (!database) {
        if (!fallbackSnapshot) {
          throw new Error("Content snapshot is missing and no database source is available.");
        }
        const project = fallbackSnapshot.projects.find((entry) => entry.slug === slug) ?? null;
        return { project, source: "snapshot" };
      }

      try {
        const project = await database.getProjectBySlug(slug);
        return { project, source: "database" };
      } catch (error) {
        log.warn("content_unavailable", {
          operation: "getProjectBySlug",
          slug,
          reason: error instanceof Error ? error.message : String(error),
        });
        return { project: null, source: "unavailable" };
      }
    },
  };
}

export const contentService = createContentService({
  database: createDefaultDatabaseProvider(),
  snapshot: startupSnapshot ?? undefined,
  logger: createLogger(),
});
