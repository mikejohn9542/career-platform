import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DbClient } from "@/db/client";
import { assertSafeToSeed, seedProfile } from "@/db/repository";
import { createTestDatabase, makeFixtureContent } from "./helpers";

// seedProfile() opens with `tx.delete(profiles)` and rebuilds every table from src/content/profile.ts.
// Production holds a project that file does not declare, so seeding a populated database destroys
// published content. A comment in deploy.sh is not a guard; this is.
describe("assertSafeToSeed", () => {
  let client: DbClient;

  beforeEach(async () => {
    client = await createTestDatabase();
  });

  afterEach(async () => {
    await client.close();
  });

  it("allows seeding an empty database", async () => {
    await expect(assertSafeToSeed(client)).resolves.toBeUndefined();
  });

  it("refuses to seed a database that already holds projects", async () => {
    await seedProfile(client, makeFixtureContent());
    await expect(assertSafeToSeed(client)).rejects.toThrow(/already contains 2 project\(s\)/);
  });

  it("names the override in the refusal so the operator does not have to guess", async () => {
    await seedProfile(client, makeFixtureContent());
    await expect(assertSafeToSeed(client)).rejects.toThrow(/--force/);
  });

  it("proceeds on a populated database when the operator passes force", async () => {
    await seedProfile(client, makeFixtureContent());
    await expect(assertSafeToSeed(client, { force: true })).resolves.toBeUndefined();
  });
});
