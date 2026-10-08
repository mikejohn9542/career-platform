# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters and hiring managers screening Michael Johnson for internships and entry-level roles. Analytics comes first: business analytics, financial analysis, and data roles. Technical roles (software, full-stack, data engineering) are a strong second audience. They arrive from a resume, LinkedIn, or a direct link and usually give the page a short scan before deciding whether to dig deeper or reach out.

## Product Purpose

A public, recruiter-facing resume and portfolio at https://michaeljportfolio.me. It lets a recruiter quickly understand who Michael is and whether he fits, then see project evidence and contact him. Success means a recruiter can judge fit within a short scan and knows how to reach him.

## Positioning

A rare mix of business and technical: real finance and operations work (mortgage file analysis at CP Financial, operations logistics at Bel-Air Country Club) alongside hands-on full-stack and data skills (LLM Manager app, first-place regional datathon). The site should leave a recruiter remembering that combination, not only one side of it.

## Operating Context

- Recruiters scan quickly, often on a laptop between other candidates and sometimes on a phone.
- The page is server-rendered by Next.js from a SQLite database (`src/content/profile.ts` is the authored source, seeded into the DB). A snapshot (`src/generated/profile-snapshot.json`) is the fallback if the DB is unavailable.
- Deployed on an Azure VM behind nginx over HTTPS. A later migration to Railway is planned.

## Capabilities and Constraints

- Single public profile, read-only. No accounts, admin UI, stored messages, or built-in booking (spec non-goals).
- Recruiter actions to support: email (`mailto`), open LinkedIn, open GitHub, and download a resume PDF.
- The resume PDF lives at `public/michael-johnson-resume.pdf` and is served at `/michael-johnson-resume.pdf`. It includes Michael's phone number, which he chose to publish. **Open:** `resume.pdfUrl` in `src/content/profile.ts` still points to LinkedIn. It must be an absolute URL (e.g. `https://michaeljportfolio.me/michael-johnson-resume.pdf`), and the live site only picks up the change after the VM's database is re-seeded.
- Content comes from the content service. Design work must not change the content, schema, database, routes, environment, or deployment.
- Analytics is intentionally undecided.

## Evidence on Hand

- Profile, two experience entries, education (LMU, B.S. Information Systems & Business Analytics, GPA 3.86, Beta Gamma Sigma, Excel Associate certification), and skill groups in `src/content/profile.ts`.
- Projects: "Datathon" (first-place regional finish; presentation at `public/projects/ems-meal-break-presentation.pptx`) and "LLM Manager" (GitHub: mikejohn9542/LLM-Manager).
- Quantified outcomes stated in the content: 20+ active loan files, 20% reduction in file errors/delays, 100+ club members.
- No headshot, logo, testimonials, or employer endorsements. Don't invent any.

## Product Principles

1. Recruiter speed first: the fit should be clear from the first screen, with depth available but never in the way.
2. Show both halves: business impact and technical skill get equal standing.
3. Evidence over claims: every claim on the page comes from real content, and metrics are never invented.
4. Content is data: the page renders whatever the content service returns, so design must hold up as entries are added or removed.

## Accessibility & Inclusion

Semantic markup, keyboard-accessible links, visible focus states, sufficient contrast, responsive layout from phone to desktop, and meaningful page metadata (from the project spec).
