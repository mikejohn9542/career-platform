import "dotenv/config";
import { createDbClient, migrateDb } from "@/db/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = createDbClient(connectionString);

migrateDb(client)
  .then(() => console.log("Migrations applied."))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
