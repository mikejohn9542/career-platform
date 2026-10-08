import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { createLogger } from "@/lib/logger";
import { schema } from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbClient = {
  db: Database;
  close: () => Promise<void>;
  pool?: Pool;
};

export const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

export const POOL_OPTIONS = {
  max: 5,
  connectionTimeoutMillis: 5_000,
  query_timeout: 10_000,
  idleTimeoutMillis: 30_000,
};

// The pool connects lazily, on the first query.
export function createDbClient(connectionString: string): DbClient {
  const pool = new Pool({ connectionString, ...POOL_OPTIONS });
  // An idle client that loses its connection emits "error"; without a listener Node would crash the server.
  const log = createLogger();
  pool.on("error", (error) => log.warn("pg_pool_error", { reason: error.message }));
  const db = drizzle(pool, { schema });
  return {
    db: db as unknown as Database,
    close: () => pool.end(),
    pool,
  };
}

export async function migrateDb(client: DbClient, migrationsFolder = MIGRATIONS_FOLDER): Promise<void> {
  // node-postgres and PGlite share the pg-core dialect, so one migrator call covers both clients.
  await migrate(client.db as Parameters<typeof migrate>[0], { migrationsFolder });
}
