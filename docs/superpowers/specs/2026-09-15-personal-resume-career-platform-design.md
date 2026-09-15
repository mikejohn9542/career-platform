# Personal Resume and Career Platform Foundation

## Status

Draft for user review. This document describes the first release only; implementation
must not begin until the user approves this spec.

## Goals

The first release will provide a public, recruiter-facing portfolio that:

- Presents a polished technical-modern personal brand.
- Lets recruiters quickly understand the professional profile and fit.
- Showcases projects with both concise summaries and deeper evidence.
- Provides an accessible, downloadable resume.
- Makes it easy to reach an external booking or contact destination.
- Establishes a maintainable database-backed foundation without prematurely
  implementing a broader career platform.

Success is balanced across credible public presence, recruiter conversion,
content flexibility, and a sound technical foundation, with recruiter usability
slightly prioritized.

## Non-goals

The first release will not include:

- A public admin CMS or web-based content editor.
- User accounts or authentication.
- Multiple professional profiles.
- Messaging or stored contact inquiries.
- Jobs, gigs, opportunity matching, or referrals.
- Community discussions or publishing workflows.
- Built-in booking, calendar, or contact management.
- A committed analytics provider or detailed analytics dashboard.

The architecture may leave clear extension points for these capabilities, but
they must not shape the initial user experience or add unnecessary operational
complexity.

## Recommended architecture

Use a TypeScript full-stack application with a modern full-stack framework,
deployed through a GitHub-centric workflow and backed by serverless PostgreSQL.
The exact framework and provider should be selected during implementation based
on current repository conventions, ecosystem support, preview deployments, and
the lowest reliable operational burden.

The public site should use server-rendered or statically optimized pages so
that it has strong performance, search indexing, social previews, and
shareability. The initial route model is hybrid:

- A concise landing page for recruiter scanning.
- Dedicated project detail pages.
- A dedicated resume view/download path.

Structured content will be authored in version-controlled files and imported
or seeded into PostgreSQL during deployment. PostgreSQL is the runtime source
of truth after import. This preserves code review, rollback, and a
repo-driven workflow while establishing durable relational data boundaries for
future growth.

The deployment must also generate a validated, versioned content snapshot from
the same repository-authored inputs. Public profile pages should read from
PostgreSQL when it is available, but fall back to this snapshot when the
database is unavailable. The fallback must contain enough published profile,
resume, skills, and project-summary data to keep the core portfolio visible;
it must not require a live database connection.

## Content and data model

The initial domain model should support one professional profile and related
records:

- Profile and about/summary content.
- Work experience.
- Education.
- Skills grouped by category.
- Projects.
- Project technologies.
- Project links.
- Project media references.
- Resume metadata and downloadable asset reference.

Relevant content records should support stable slugs, display ordering, and
publication status. Publicly indexed entities should support SEO metadata where
appropriate. Projects must support both:

1. A concise recruiter-oriented summary for the landing page.
2. Detailed content for a dedicated project page, including context, role,
   outcomes, technologies, links, and media when available.

The content import process must validate the input shape and relationships
before writing to the database. It should fail explicitly on invalid required
fields, duplicate stable identifiers, broken references, or malformed URLs
rather than silently producing incomplete published content.

## Assets

Use a hybrid asset strategy:

- Keep the resume PDF and small, stable assets in the repository where
  practical.
- Support object-storage or external URL references for larger project media.

Asset references must be validated and should expose meaningful alternative text
or equivalent accessibility metadata for public media.

## Public experience

The landing page should prioritize:

- A clear professional summary.
- A fast-scanning overview of experience, skills, and selected projects.
- A prominent resume download.
- Clear project navigation and calls to review project details.
- A clear external booking/contact call to action.

Dedicated project pages should provide enough depth to demonstrate decision
making, technical execution, outcomes, and relevant links without requiring a
recruiter to navigate an opaque interface.

The visual direction is technical-modern: crisp, structured, product-oriented,
and restrained enough to keep content legible. The implementation must use
semantic markup, keyboard-accessible interactions, responsive layouts, useful
focus states, sufficient contrast, and meaningful document/page metadata.

## Contact and analytics

Version one will link to an external booking or contact destination. It will
not accept, store, or process contact messages in the application.

Analytics are intentionally undecided. The application should provide a small,
provider-neutral instrumentation boundary so optional privacy-friendly events
can be added later without coupling core pages to an analytics vendor. No
analytics provider or detailed tracking requirement is part of the first
release.

## Deployment and content workflow

The deployment workflow should be GitHub-centric:

1. Content and code changes are proposed through version control.
2. Pull requests run validation and produce a preview when supported.
3. Migrations and seed/import data are versioned with the application.
4. A production build runs only after type checks, tests, and content/schema
   validation pass.
5. Deployment applies the required database migration/import steps explicitly.

There is no web admin surface in version one. Updating a project or profile
section means changing the versioned content, reviewing the diff, and
re-running the import/deployment workflow.

## Error handling

The application must handle these conditions explicitly:

- Missing, unpublished, or malformed content.
- Duplicate slugs or stable identifiers.
- Broken project links or invalid URL metadata.
- Missing or unavailable media references.
- Database connection or query failures.
- Unavailable external booking/contact destinations.

Public pages should not silently present invalid or partial content as
successful. Build-time content errors should fail the deployment with an
actionable message. If PostgreSQL is unavailable, the application should serve
the last validated snapshot and expose an observable warning to operators
without showing an outage state to visitors. If neither the database nor a
validated snapshot is available, runtime infrastructure failures should use a
deliberate error state and appropriate logging consistent with the selected
framework.

## Quality gates

The first release is complete when:

- A recruiter can understand the profile and find selected projects quickly.
- The core published profile remains visible during a PostgreSQL outage by
  using the validated deployment snapshot.
- The resume can be viewed and downloaded reliably.
- Project detail pages expose meaningful evidence and links.
- Content can be updated through reviewed repository changes without schema
  restructuring.
- Public pages are responsive, accessible, indexable, and performant.
- Database migrations and content imports are repeatable and validated.
- Pull-request and production checks cover type safety, automated behavior,
  content validation, and production builds.

## Future extension boundaries

Keep these boundaries explicit so the system can grow without committing to
future features prematurely:

- Database access behind typed repository/service functions.
- Content import and validation independent from page rendering.
- Snapshot generation and fallback reads independent from the live database
  connection.
- Asset references independent from asset storage implementation.
- Optional analytics instrumentation independent from vendor code.
- Profile/content entities modeled so multiple profiles could be added later,
  without exposing multi-profile behavior in version one.
