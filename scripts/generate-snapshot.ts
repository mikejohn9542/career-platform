import path from "node:path";
import { writeProfileSnapshot } from "../src/content/load";

const outputPath = path.resolve(process.cwd(), "src/generated/profile-snapshot.json");

writeProfileSnapshot(outputPath)
  .then(() => {
    console.log(`Wrote profile snapshot to ${outputPath}`);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
