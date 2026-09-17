import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { profileContentSchema, type ProfileContent } from "./schema";
import { profileContent } from "./profile";

export function getGeneratedSnapshotPath(): string {
  return path.resolve(process.cwd(), "src/generated/profile-snapshot.json");
}

export function loadProfileContent(): ProfileContent {
  try {
    return profileContentSchema.parse(profileContent);
  } catch (error) {
    const invalidPath = path.resolve(process.cwd(), "src/content/profile.ts");
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid authored profile content in ${invalidPath}: ${details}`);
  }
}

export function loadProfileSnapshotFromFile(filePath = getGeneratedSnapshotPath()): ProfileContent {
  const resolvedPath = path.resolve(filePath);
  try {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    return profileContentSchema.parse(JSON.parse(raw));
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid snapshot content in ${resolvedPath}: ${details}`);
  }
}

export async function writeProfileSnapshot(outputPath: string): Promise<void> {
  const validatedContent = loadProfileContent();
  const resolvedPath = path.resolve(outputPath);
  await fsPromises.mkdir(path.dirname(resolvedPath), { recursive: true });
  const serialized = `${JSON.stringify(validatedContent, null, 2)}\n`;
  await fsPromises.writeFile(resolvedPath, serialized, "utf8");
}
