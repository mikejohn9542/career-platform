import { describe, expect, it } from "vitest";
import { loadProfileContent } from "@/content/load";
import { profileContentSchema } from "@/content/schema";

describe("profile content", () => {
  it("loads the authored profile with stable project slugs", () => {
    const content = loadProfileContent();
    expect(content.profile.name).toBeTruthy();
    expect(new Set(content.projects.map((project) => project.slug)).size)
      .toBe(content.projects.length);
  });

  it("rejects malformed external URLs", () => {
    expect(() => profileContentSchema.parse({
      profile: { name: "Test", headline: "Test", summary: "Test" },
      projects: [{ slug: "test", title: "Test", summary: "Test", links: [{ label: "Demo", url: "not-a-url" }] }],
    })).toThrow();
  });
});
