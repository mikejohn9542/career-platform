import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { schema } from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbClient = {
  db: Database;
  close: () => Promise<void>;
};

export const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

// The pool connects lazily, on the first query.
export function createDbClient(connectionString: string): DbClient {
  const pool = new Pool({ connectionString, max: 5 });
  const db = drizzle(pool, { schema });
  return {
    db: db as unknown as Database,
    close: () => pool.end(),
  };
}

export async function migrateDb(client: DbClient, migrationsFolder = MIGRATIONS_FOLDER): Promise<void> {
  // node-postgres and PGlite share the pg-core dialect, so one migrator call covers both clients.
  await migrate(client.db as Parameters<typeof migrate>[0], { migrationsFolder });
}
