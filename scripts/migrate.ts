import "dotenv/config";
import { createDbClient, migrateDb } from "@/db/client";

const databasePath = process.env.DATABASE_PATH ?? "data/career-platform.sqlite";
const client = createDbClient(databasePath);

async function main(): Promise<void> {
  try {
    await migrateDb(client);
  } finally {
    await client.close();
  }
}

void main();
