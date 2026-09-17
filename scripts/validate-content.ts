import { loadProfileContent } from "../src/content/load";

try {
  const content = loadProfileContent();
  console.log(`Validated profile content for ${content.profile.name}.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
