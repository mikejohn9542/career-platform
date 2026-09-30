import fs from "node:fs";
import path from "node:path";
import { profileContentSchema, type ProfileContent, type ProjectContent } from "@/content/schema";
import { getGeneratedSnapshotPath } from "@/content/load";
import { createDbClient, migrateDb } from "@/db/client";
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

function createDefaultDatabaseProvider(): DatabaseContentProvider | undefined {
  const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/career-platform.sqlite");

  try {
    const client = createDbClient(databasePath);
    void migrateDb(client);
    return {
      async getSiteContent(): Promise<ProfileContent | null> {
        await migrateDb(client);
        return getPublishedProfile(client);
      },
      async getProjectBySlug(slug: string): Promise<ProjectContent | null> {
        await migrateDb(client);
        return getPublishedProject(client, slug);
      },
    };
  } catch {
    return undefined;
  }
}

export function createContentService({
  database,
  snapshot,
  logger,
}: ContentServiceOptions): {
  getSiteContent(): Promise<{ content: ProfileContent; source: "database" | "snapshot" }>;
  getProjectBySlug(slug: string): Promise<{ project: ProjectContent | null; source: "database" | "snapshot" }>;
} {
  const fallbackSnapshot = resolveSnapshot(snapshot);
  const log = logger ?? createLogger();

  if (!fallbackSnapshot && !database) {
    throw new Error("No valid content snapshot is available and no database provider is configured.");
  }

  return {
    async getSiteContent(): Promise<{ content: ProfileContent; source: "database" | "snapshot" }> {
      if (database) {
        try {
          const content = await database.getSiteContent();
          if (content) return { content, source: "database" };
        } catch (error) {
          log.warn("content_service_fallback", {
            operation: "getSiteContent",
            source: "database",
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!fallbackSnapshot) {
        throw new Error("Content snapshot is missing and no database source is available.");
      }

      return { content: fallbackSnapshot, source: "snapshot" };
    },
    async getProjectBySlug(slug: string): Promise<{ project: ProjectContent | null; source: "database" | "snapshot" }> {
      if (database) {
        try {
          const project = await database.getProjectBySlug(slug);
          if (project !== null) {
            return { project, source: "database" };
          }
          return { project: null, source: "database" };
        } catch (error) {
          log.warn("content_service_fallback", {
            operation: "getProjectBySlug",
            source: "database",
            slug,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!fallbackSnapshot) {
        throw new Error("Content snapshot is missing and no database source is available.");
      }

      const project = fallbackSnapshot.projects.find((entry) => entry.slug === slug) ?? null;
      return { project, source: "snapshot" };
    },
  };
}

export const contentService = createContentService({
  database: createDefaultDatabaseProvider(),
  snapshot: startupSnapshot ?? undefined,
  logger: createLogger(),
});
