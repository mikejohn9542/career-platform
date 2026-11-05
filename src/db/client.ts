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
  let ca: string;
  try {
    ca = fs.readFileSync(caPath, "utf8");
  } catch (error) {
    // Throw at construction rather than at query time: content-service.ts turns every query
    // error into the snapshot fallback, so a bad path would otherwise surface as a healthy-looking
    // site with an empty project list instead of a configuration error.
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`DATABASE_CA_CERT_PATH is set to "${caPath}" but could not be read: ${reason}`);
  }
  // An interrupted or 404'd download leaves an empty or HTML file. Node's TLS accepts a falsy or
  // unparseable `ca` and quietly falls back to the public root store, which does not contain
  // Amazon's RDS CA - so verification fails at the first query and the site renders an empty
  // project list. Checking the content here keeps that a configuration error.
  if (!ca.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error(
      `DATABASE_CA_CERT_PATH is set to "${caPath}" but the file does not contain a certificate ` +
        `(expected a PEM bundle beginning with -----BEGIN CERTIFICATE-----).`,
    );
  }
  return { ca, rejectUnauthorized: true };
}

// Query parameters that libpq understands and that pg-connection-string turns into an `ssl` object.
const TLS_URL_PARAMS = ["sslmode", "sslrootcert", "sslcert", "sslkey", "sslpassword"] as const;

// `pg` resolves a pool's TLS by applying parse(connectionString) OVER the explicit config
// (pg/lib/connection-parameters.js), so a URL carrying sslmode or sslrootcert silently replaces
// the CA we read and drops rejectUnauthorized. Worse, `sslmode=require` alone resolves to `{}`,
// which verifies against the public root store and therefore fails against RDS. Removing these
// params makes the code the single authority whenever DATABASE_CA_CERT_PATH is set. The env file
// keeps them in DATABASE_URL on purpose: psql and pg_restore read libpq's settings, not ours.
export function stripTlsParams(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  let removed = false;
  for (const param of TLS_URL_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      removed = true;
    }
  }
  return removed ? url.toString() : connectionString;
}

export type PoolConfig = { connectionString: string; ssl?: SslOptions };

// Exported so the tests can assert what `pg` resolves, rather than what we hand it.
export function poolConfigFrom(
  connectionString: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): PoolConfig {
  const ssl = sslOptionsFrom(env);
  // With no CA of our own, leave the URL untouched: its sslmode is then the only TLS instruction,
  // and stripping it would turn encryption off rather than on.
  if (!ssl) return { connectionString };
  return { connectionString: stripTlsParams(connectionString), ssl };
}

// The pool connects lazily, on the first query.
export function createDbClient(connectionString: string, env: Readonly<Record<string, string | undefined>> = process.env): DbClient {
  const pool = new Pool({ ...POOL_OPTIONS, ...poolConfigFrom(connectionString, env) });
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
