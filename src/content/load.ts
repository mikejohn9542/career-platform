import fs from "node:fs/promises";
import path from "node:path";
import { profileContentSchema, type ProfileContent } from "./schema";
import { profileContent } from "./profile";

export function loadProfileContent(): ProfileContent {
  try {
    return profileContentSchema.parse(profileContent);
  } catch (error) {
    const invalidPath = path.resolve(process.cwd(), "src/content/profile.ts");
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid authored profile content in ${invalidPath}: ${details}`);
  }
}

export async function writeProfileSnapshot(outputPath: string): Promise<void> {
  const validatedContent = loadProfileContent();
  const resolvedPath = path.resolve(outputPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  const serialized = `${JSON.stringify(validatedContent, null, 2)}\n`;
  await fs.writeFile(resolvedPath, serialized, "utf8");
}
