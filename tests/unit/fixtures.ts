import type { ProfileContent, ProjectContent } from "@/content/schema";

export function makeFixtureContent(): ProfileContent {
  return {
    profile: {
      name: "Alex Morgan",
      headline: "Senior product engineer",
      summary: "Product engineer shipping resilient digital experiences.",
      location: "Seattle, WA",
      pronouns: "he/him",
    },
    experience: [
      {
        company: "Northstar Labs",
        role: "Senior Product Engineer",
        location: "Seattle, WA",
        startDate: "2022-01",
        current: true,
        summary: "Led platform delivery and product analytics.",
        highlights: ["Shipped resilient analytics platform", "Mentored engineers"],
      },
    ],
    education: [
      {
        school: "University of Washington",
        degree: "B.S. in Computer Science",
        field: "Computer Science",
        startDate: "2014-09",
        endDate: "2018-06",
        summary: "Focused on distributed systems and HCI.",
      },
    ],
    skills: [
      {
        name: "Languages",
        items: ["TypeScript", "JavaScript", "SQL"],
      },
    ],
    projects: [
      {
        slug: "published-project",
        title: "Published project",
        summary: "A valid published sample project.",
        description: "Detailed description of the project.",
        status: "published",
        stack: ["TypeScript", "Next.js"],
        highlights: ["Improved product velocity", "Simplified decision making"],
        links: [
          { label: "Demo", url: "https://example.com/demo" },
          { label: "Repo", url: "https://github.com/example/demo" },
        ],
        heroImage: {
          src: "https://example.com/demo.png",
          alt: "Demo screenshot",
        },
      },
      {
        slug: "draft-project",
        title: "Draft project",
        summary: "This draft should stay hidden in database queries.",
        description: "Draft details",
        status: "draft",
        stack: ["TypeScript"],
        highlights: ["Work in progress"],
        links: [{ label: "Repo", url: "https://github.com/example/draft" }],
      },
    ],
    resume: {
      fileName: "alex-morgan-resume.pdf",
      publishedAt: "2026-09-15T00:00:00.000Z",
      status: "published",
      pdfUrl: "https://example.com/resume.pdf",
      summary: "Resume summary",
    },
    contact: {
      email: "alex@example.com",
      linkedin: "https://www.linkedin.com/in/alexmorgan",
      github: "https://github.com/alexmorgan",
      location: "Seattle, WA",
    },
  };
}

export function makeFixtureProject(slug = "published-project"): ProjectContent {
  const content = makeFixtureContent();
  return content.projects.find((project) => project.slug === slug) ?? content.projects[0];
}
