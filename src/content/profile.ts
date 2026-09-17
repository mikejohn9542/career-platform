import type { ProfileContent } from "./schema";

export const profileContent: ProfileContent = {
  profile: {
    name: "Alex Morgan",
    headline: "Senior product engineer designing resilient digital experiences",
    summary:
      "I build data-rich product experiences for teams that need dependable software, clear communication, and measurable outcomes. My work bridges product strategy, architecture, and delivery across customer-facing platforms.",
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
      summary:
        "Led design and delivery of the customer analytics platform for a B2B growth company, tightening instrumentation and improving decision speed across product and marketing teams.",
      highlights: [
        "Reduced report generation latency by 62% through query optimization and a new caching layer.",
        "Shipped a customer health dashboard that improved cross-functional handoff quality and lifecycle planning.",
        "Mentored two engineers and introduced architecture reviews for shared platform services.",
      ],
    },
    {
      company: "Fieldstone Commerce",
      role: "Full-Stack Engineer",
      location: "Remote",
      startDate: "2018-07",
      endDate: "2021-12",
      summary:
        "Built storefront experiences and internal tooling for a multi-brand commerce platform supporting rapid campaign launches and partner onboarding.",
      highlights: [
        "Created reusable commerce components that accelerated launch cycles across seven brands.",
        "Improved integration reliability by automating deployment checks and payment testing.",
        "Partnered with designers to ship accessible, conversion-focused product pages.",
      ],
    },
  ],
  education: [
    {
      school: "University of Washington",
      degree: "B.S. in Computer Science",
      field: "Computer Science",
      startDate: "2014-09",
      endDate: "2018-06",
      summary: "Focused on distributed systems, human-computer interaction, and software engineering practices.",
    },
  ],
  skills: [
    {
      name: "Languages",
      items: ["TypeScript", "JavaScript", "Python", "SQL", "Go"],
    },
    {
      name: "Frameworks",
      items: ["Next.js", "React", "Node.js", "Express", "Prisma"],
    },
    {
      name: "Platforms",
      items: ["AWS", "Docker", "GitHub Actions", "PostgreSQL", "Redis"],
    },
  ],
  projects: [
    {
      slug: "atlas-copilot",
      title: "Atlas Copilot",
      summary: "An AI-assisted planning workspace for product teams tracking roadmap work and launch risks.",
      description:
        "Atlas Copilot combines a lightweight strategy board with AI summaries, stakeholder notes, and weekly planning prompts so teams can move from discussion to execution without losing context.",
      status: "published",
      stack: ["TypeScript", "Next.js", "OpenAI", "PostgreSQL"],
      highlights: [
        "Aggregated project signals from product, support, and engineering into a single operating view.",
        "Reduced weekly planning prep time from hours to minutes by synthesizing meeting notes automatically.",
      ],
      links: [
        { label: "Live demo", url: "https://example.com/atlas-copilot" },
        { label: "GitHub", url: "https://github.com/example/atlas-copilot" },
      ],
      heroImage: {
        src: "https://images.example.com/atlas-copilot-dashboard.png",
        alt: "Atlas Copilot dashboard showing roadmap cards and notes",
      },
    },
    {
      slug: "signal-harbor",
      title: "Signal Harbor",
      summary: "A customer health and churn intelligence dashboard for SaaS teams with nuanced account scoring.",
      description:
        "Signal Harbor unifies product usage, support records, and revenue signals so account teams can act earlier on churn risk and expansion opportunities.",
      status: "published",
      stack: ["TypeScript", "React", "D3", "Node.js"],
      highlights: [
        "Modeled customer health scores from usage and support signals with explainable scoring logic.",
        "Enabled account teams to triage interventions from a single dashboard instead of fragmented exports.",
      ],
      links: [
        { label: "Case study", url: "https://example.com/signal-harbor" },
        { label: "Repository", url: "https://github.com/example/signal-harbor" },
      ],
      heroImage: {
        src: "https://images.example.com/signal-harbor-overview.png",
        alt: "Signal Harbor analytics dashboard with health trends and account signals",
      },
    },
  ],
  resume: {
    fileName: "alex-morgan-resume.pdf",
    publishedAt: "2026-09-15T00:00:00.000Z",
    status: "published",
    pdfUrl: "https://example.com/resume/alex-morgan-resume.pdf",
    summary: "Resume highlights product engineering, platform work, and cross-functional systems design.",
  },
  contact: {
    email: "alex.morgan@example.com",
    phone: "+1 (206) 555-0147",
    linkedin: "https://www.linkedin.com/in/alexmorgan",
    github: "https://github.com/alexmorgan",
    website: "https://alexmorgan.dev",
    location: "Seattle, WA",
  },
};
