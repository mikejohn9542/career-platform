import fs from "node:fs";
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

export type SslOptions = { ca: string; rejectUnauthorized: true };

// RDS refuses unencrypted connections (rds.force_ssl is on by default from PostgreSQL 15).
// Railway's private network needed none, so TLS stays off unless DATABASE_CA_CERT_PATH names a
// certificate bundle, which keeps local development and the test suite exactly as they were.
export function sslOptionsFrom(env: Readonly<Record<string, string | undefined>>): SslOptions | undefined {
  const caPath = env.DATABASE_CA_CERT_PATH;
  if (!caPath) return undefined;
  try {
    return { ca: fs.readFileSync(caPath, "utf8"), rejectUnauthorized: true };
  } catch (error) {
    // Throw at construction rather than at query time: content-service.ts turns every query
    // error into the snapshot fallback, so a bad path would otherwise surface as a healthy-looking
    // site with an empty project list instead of a configuration error.
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`DATABASE_CA_CERT_PATH is set to "${caPath}" but could not be read: ${reason}`);
  }
}

// The pool connects lazily, on the first query.
export function createDbClient(connectionString: string, env: Readonly<Record<string, string | undefined>> = process.env): DbClient {
  const ssl = sslOptionsFrom(env);
  const pool = new Pool({ connectionString, ...POOL_OPTIONS, ...(ssl ? { ssl } : {}) });
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
