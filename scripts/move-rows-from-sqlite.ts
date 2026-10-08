import "dotenv/config";
import { createDbClient } from "@/db/client";
import { compareRows, importRows, readSqliteRows } from "@/db/sqlite-import";

const args = process.argv.slice(2);
const backupPath = args.find((arg) => !arg.startsWith("--"));
const replace = args.includes("--replace");
const connectionString = process.env.DATABASE_URL;

if (!backupPath || !connectionString) {
  console.error("Usage: DATABASE_URL=<postgres url> npm run db:move-rows -- <backup.sqlite> [--replace]");
  process.exit(1);
}

const client = createDbClient(connectionString);

async function main(): Promise<void> {
  const rows = readSqliteRows(backupPath as string);
  await importRows(client.db, rows, { replace });
  const report = await compareRows(client.db, rows);
  console.table(report);
  if (!report.every((entry) => entry.identical)) throw new Error("Postgres rows do not match the backup.");
  console.log("All tables match the backup.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
