import type { ProfileContent } from "./schema";

export const profileContent: ProfileContent = {
  profile: {
    name: "Michael Johnson",
    headline: "Information Systems & Business Analytics student at Loyola Marymount University",
    summary:
      "Information Systems & Business Analytics student at LMU (GPA 3.86) who turns operational and financial data into decisions. Experience spans mortgage lending file analysis, operations logistics, and full-stack development, with a first-place regional datathon finish.",
    location: "Los Angeles, CA",
  },
  experience: [
    {
      company: "CP Financial and CP Realty Inc.",
      role: "File Analyst Intern",
      location: "Los Angeles, CA",
      startDate: "2026-06",
      current: true,
      summary: "Mortgage lending file analysis and loan-lifecycle support for a Los Angeles lender and realty firm.",
      highlights: [
        "Managed end-to-end file processing and tracking for 20+ active mortgage loan files, partnering with loan officers to maintain data accuracy and compliance across property records in FirstAm IgniteRE throughout the loan lifecycle.",
        "Supported underwriting and risk analysis by reviewing borrower and property documentation, identifying discrepancies, and helping assess loan-level risk prior to closing, contributing to a 20% reduction in file errors/delays.",
        "Coordinated with title and escrow agents to open title insurance and escrow accounts for client transactions.",
        "Built and analyzed operating budgets and conducted financial reporting, while fully compiling and closing out client files for physical and digital recordkeeping.",
      ],
    },
    {
      company: "Bel-Air Country Club",
      role: "Bagroom Logistics Manager/Outside Services",
      location: "Los Angeles, CA",
      startDate: "2025-07",
      current: true,
      summary: "Operations data and logistics for a private club serving 100+ members.",
      highlights: [
        "Manage high-volume operational data related to 100+ members, including inventory tracking, service logistics, and scheduling, ensuring accuracy and consistency across daily operations.",
        "Utilize Excel and spreadsheet-based tracking systems to monitor golf bag inventory, cart usage, and forecasted daily cart demand, supporting real-time operational decision-making.",
        "Coordinate logistics for high volume equipment deliveries while ensuring accuracy, timeliness, and client satisfaction.",
        "Partner with supervisors to translate operational insights into process improvements and service enhancements.",
      ],
    },
  ],
  education: [
    {
      school: "Loyola Marymount University",
      degree: "Bachelor of Science",
      field: "Information Systems & Business Analytics",
      startDate: "2023-08",
      endDate: "2027-05",
      summary:
        "GPA: 3.86. Relevant courses: Computer Programming & Lab, Statistics, Finance, Managerial Accounting, Analytics in Operations & Supply Chain Management, Data Structures, Database Management Systems, Algorithms & Analysis. Beta Gamma Sigma International Business Honor Society (March 2025 - present). Microsoft Office Specialist: Excel Associate (Excel 2019), October 2024.",
    },
  ],
  skills: [
    {
      name: "Languages",
      items: ["Python", "SQL", "JavaScript", "Java", "HTML"],
    },
    {
      name: "Analytics",
      items: [
        "Financial Analysis",
        "Data Cleaning & Validation",
        "KPI Tracking & Reporting",
        "Exploratory Data Analysis",
        "Performance Benchmarking",
        "Dashboard Development",
        "Tableau",
      ],
    },
    {
      name: "Tools",
      items: [
        "Docker",
        "React",
        "Git",
        "Microsoft Access",
        "Microsoft PowerPoint",
        "Microsoft Word",
        "FirstAm IgniteRE",
      ],
    },
  ],
  projects: [
    {
      slug: "datathon-ems-dispatch",
      title: "Datathon",
      summary:
        "First-place regional datathon analysis of emergency medical dispatch performance and meal break compliance (March 2026).",
      description:
        "Analyzed 1,732 emergency medical dispatch records across 21 California bases to brief a board on response time performance, shift utilization, and projected meal break violation rates under proposed California labor law.",
      status: "published",
      stack: ["SQL", "Python"],
      highlights: [
        "Analyzed 1,732 emergency medical dispatch records across 21 California bases leveraging SQL and Python.",
        "Translated raw EMS dispatch data into actionable Board-level insights on response time performance, shift utilization, and projected meal break violation rates under proposed California labor law.",
        "Presented findings to judges in a regional competition and won first place.",
      ],
      links: [
        {
          label: "Presentation (PowerPoint)",
          url: "https://github.com/mikejohn9542/career-platform/blob/main/public/projects/ems-meal-break-presentation.pptx",
        },
      ],
    },
    {
      slug: "llm-manager",
      title: "LLM Manager",
      summary: "Full-stack web app for deploying and managing LLMs locally with vLLM as the backend (August - December 2025).",
      description:
        "A full-stack web application for deploying and managing large language models locally, using vLLM as the serving backend.",
      status: "published",
      stack: ["Python", "SQLAlchemy", "Docker", "React", "TypeScript", "SQLite", "Postgres", "vLLM"],
      highlights: [
        "Built a full-stack web app for deploying and managing LLMs locally using vLLM as a backend.",
        "Implemented Python, SQLAlchemy, Docker / Docker Compose, React, TypeScript, SQLite/Postgres, and Git.",
      ],
      links: [{ label: "GitHub", url: "https://github.com/mikejohn9542/LLM-Manager" }],
    },
  ],
  resume: {
    fileName: "michael-johnson-resume.pdf",
    publishedAt: "2026-10-01T00:00:00.000Z",
    status: "published",
    pdfUrl: "https://www.linkedin.com/in/michael-johnson-285334331",
    summary: "Resume highlights data analytics, mortgage lending operations, and full-stack development.",
  },
  contact: {
    email: "mjohn184@lion.lmu.edu",
    linkedin: "https://www.linkedin.com/in/michael-johnson-285334331",
    github: "https://github.com/mikejohn9542",
    location: "Los Angeles, CA",
  },
};
