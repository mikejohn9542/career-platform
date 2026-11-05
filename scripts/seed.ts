import "dotenv/config";
import { loadProfileContent } from "@/content/load";
import { createDbClient, migrateDb } from "@/db/client";
import { assertSafeToSeed, seedProfile } from "@/db/repository";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = createDbClient(connectionString);

const force = process.argv.includes("--force");

async function main(): Promise<void> {
  const content = loadProfileContent();
  await migrateDb(client);
  // Migrations first so the projects table exists to be counted, then refuse to overwrite content
  // that is already there. See assertSafeToSeed for why this matters.
  await assertSafeToSeed(client, { force });
  await seedProfile(client, content);
  console.log(`Seeded profile content for ${content.profile.name}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
