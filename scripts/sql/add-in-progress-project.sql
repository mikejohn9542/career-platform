-- Adds the "this site" entry to the projects list, labelled as in progress.
--
-- Run it in the Railway dashboard: the Postgres service -> Data -> Query.
-- It is idempotent: running it twice changes nothing, so a half-finished run
-- is safe to repeat. The profile id is 1, fixed in src/db/repository.ts.
--
-- Afterwards the row appears on https://michaeljportfolio.me/ with no redeploy,
-- because the page reads PostgreSQL on every request.

BEGIN;

-- The project itself. sort_order goes after whatever is already there, so this
-- cannot collide with the unique (profile_id, sort_order) index.
INSERT INTO projects (
  profile_id, slug, title, summary, description, status, sort_order, created_at, updated_at
)
SELECT
  1,
  'michaeljportfolio-me',
  'michaeljportfolio.me — this site',
  'In progress. The site you are reading: a resume and project platform I build, deploy, and operate myself, on my own domain.',
  'A Next.js application that reads my resume content from PostgreSQL on every request, rather than baking it into the build. It began on an Ubuntu virtual machine on Azure, running two copies of the app under systemd behind nginx with a Let''s Encrypt certificate, and moved to Railway with managed TLS and migrations that run before each deployment takes traffic. All 55 rows moved across engines, from SQLite to PostgreSQL, without loss. The domain is mine: DNS at Cloudflare, mail through Zoho with SPF, DKIM, and DMARC all aligned and passing, and analytics through GA4 with a privacy page. Still in progress — the next pieces are a project detail page per entry and an editing path that does not involve writing SQL by hand.',
  'published',
  COALESCE((SELECT MAX(sort_order) FROM projects WHERE profile_id = 1), 0) + 1,
  to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE profile_id = 1 AND slug = 'michaeljportfolio-me'
);

INSERT INTO project_technologies (project_id, sort_order, value)
SELECT p.id, v.sort_order, v.value
FROM projects p
CROSS JOIN (VALUES
  (1, 'Next.js'),
  (2, 'TypeScript'),
  (3, 'PostgreSQL'),
  (4, 'Drizzle ORM'),
  (5, 'Railway'),
  (6, 'Cloudflare DNS')
) AS v(sort_order, value)
WHERE p.profile_id = 1 AND p.slug = 'michaeljportfolio-me'
  AND NOT EXISTS (SELECT 1 FROM project_technologies t WHERE t.project_id = p.id);

INSERT INTO project_highlights (project_id, sort_order, value)
SELECT p.id, v.sort_order, v.value
FROM projects p
CROSS JOIN (VALUES
  (1, 'Moved from a self-managed Azure virtual machine to Railway, SQLite to PostgreSQL, with all 55 rows verified cell by cell against the backup.'),
  (2, 'A database outage degrades one section instead of hiding the failure: the projects list is labelled unavailable, the rest of the page is unaffected, and /api/health answers 503 so the failure is visible.'),
  (3, 'Runs on my own domain end to end: DNS at Cloudflare, mail at Zoho with SPF, DKIM, and DMARC passing and aligned, and HTTPS certificates for both the apex and www.'),
  (4, 'In progress: next are a detail page per project and a way to edit content without writing SQL.')
) AS v(sort_order, value)
WHERE p.profile_id = 1 AND p.slug = 'michaeljportfolio-me'
  AND NOT EXISTS (SELECT 1 FROM project_highlights h WHERE h.project_id = p.id);

INSERT INTO project_links (project_id, sort_order, label, url)
SELECT p.id, v.sort_order, v.label, v.url
FROM projects p
CROSS JOIN (VALUES
  (1, 'Live site', 'https://michaeljportfolio.me'),
  (2, 'Source', 'https://github.com/mikejohn9542/career-platform')
) AS v(sort_order, label, url)
WHERE p.profile_id = 1 AND p.slug = 'michaeljportfolio-me'
  AND NOT EXISTS (SELECT 1 FROM project_links l WHERE l.project_id = p.id);

COMMIT;

-- Check what landed:
--   SELECT id, slug, status, sort_order FROM projects WHERE profile_id = 1 ORDER BY sort_order;
