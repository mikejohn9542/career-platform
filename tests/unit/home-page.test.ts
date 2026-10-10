import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeFixtureContent } from "./fixtures";

const getSiteContent = vi.fn();

vi.mock("@/lib/content-service", () => ({
  contentService: { getSiteContent },
}));

async function renderHomePage(): Promise<string> {
  const { default: HomePage } = await import("@/app/page");
  return renderToStaticMarkup(await HomePage());
}

describe("home page", () => {
  beforeEach(() => {
    getSiteContent.mockReset();
  });

  it("renders the profile, experience, projects, education, and skills from the content service", async () => {
    const content = makeFixtureContent();
    getSiteContent.mockResolvedValue({ content, source: "database" });

    const html = await renderHomePage();

    expect(html).toContain(content.profile.name);
    expect(html).toContain(content.profile.headline);
    for (const job of content.experience) expect(html).toContain(job.company);
    for (const project of content.projects) {
      if (project.status === "published") expect(html).toContain(project.title);
      else expect(html).not.toContain(project.title);
    }
    expect(content.projects.some((project) => project.status === "draft")).toBe(true);
    expect(html).toContain(content.education[0].school);
    expect(html).toContain(content.skills[0].items[0]);
    expect(html).toContain(content.contact.email);
  });

  it("never renders the phone number, even when the content has one", async () => {
    const content = makeFixtureContent();
    content.contact.phone = "+1 (555) 010-9999";
    getSiteContent.mockResolvedValue({ content, source: "database" });

    const html = await renderHomePage();

    expect(html).not.toContain("555) 010-9999");
  });

  it("says in the footer where the site is hosted", async () => {
    getSiteContent.mockResolvedValue({ content: makeFixtureContent(), source: "database" });

    const html = await renderHomePage();

    expect(html).toContain("Hosted on Railway · Data in PostgreSQL");
  });

  it("reads content on every request instead of prerendering at build time", async () => {
    const page = await import("@/app/page");

    expect(page.dynamic).toBe("force-dynamic");
  });
});
