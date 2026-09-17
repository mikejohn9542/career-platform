import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { schema } from "./schema";

export type DbClient = {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
  close: () => void | Promise<void>;
};

export function createDbClient(databasePath: string): DbClient {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  }
  const sqlite = new Database(databasePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return {
    db,
    sqlite,
    close: () => {
      sqlite.close();
    },
  };
}

export async function migrateDb(client: DbClient, migrationsFolder = path.resolve(process.cwd(), "drizzle")): Promise<void> {
  migrate(client.db, { migrationsFolder });
}
