import "dotenv/config";
import { createDbClient, migrateDb } from "@/db/client";
import { loadProfileContent } from "@/content/load";
import { seedProfile } from "@/db/repository";

const databasePath = process.env.DATABASE_PATH ?? "data/career-platform.sqlite";
const client = createDbClient(databasePath);

async function main(): Promise<void> {
  try {
    await migrateDb(client);
    await seedProfile(client, loadProfileContent());
  } finally {
    await client.close();
  }
}

void main();
