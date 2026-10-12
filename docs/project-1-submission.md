# Project 1 submission: Railway migration record

Site: **https://michaeljportfolio.me** · Repository: https://github.com/mikejohn9542/career-platform

## Records

| What | Where |
|---|---|
| Migration plan, with what ran and what each check showed | [docs/superpowers/plans/2026-10-08-railway-postgres-migration.md](superpowers/plans/2026-10-08-railway-postgres-migration.md) |
| VM backup and its verification | Plan → "Backup of the VM database" |
| Table-by-table comparison, VM vs Railway (redacted: counts and hashes only, no row contents or credentials) | Plan → Task 6, Step 4 result |
| Live results (domain, TLS, redirects, data source) | Plan → Task 6, Step 5 result and "Task 7 results" |
| Deploy migrations and runtime log review | Plan → Task 6, "Cause found" and "Runtime log review" |
| Write test and update test | Below |
| Rollback notes | [README → Rollback](../README.md#rollback) |
| Cost notes and the move recommendation | [README → Recommendation](../README.md#recommendation-should-a-three-developer-startup-on-an-azure-vm-move-to-railway) |
| Deviations from the class guide (`www`, SQLite, VM version) | [README → Deviations](../README.md#deviations-from-the-class-guide) |
| Earlier Azure records | [Azure migration](superpowers/plans/2026-09-24-azure-vm-migration.md), [operating the VM](superpowers/plans/2026-10-01-operate-the-vm.md), [Ex04 HTTPS write-up](how-this-site-is-secured.md) |

## Section 6 proofs

- **Railway CLI:** linked to project `vivacious-happiness`, service `earnest-clarity`, environment
  `production`. `railway domain list` → `michaeljportfolio.me`, custom, verified, certificate
  `VALID`, sync `ACTIVE`, port 8080.
- **Cloudflare CLI:** `cf dns records list --zone michaeljportfolio.me` → root `CNAME` to the
  Railway service domain (DNS only), `_railway-verify` TXT, `www` A `192.0.2.1` (proxied redirect).
- **Write test (2026-10-09):** added "SQL" to the Analytics skills through
  `railway run --service Postgres` (one transaction, TLS). It appeared on the live site with no
  redeploy, so the site reads and writes PostgreSQL on Railway.
- **Update test (2026-10-10 05:07 UTC):** pushed `c1b6ddd` ("say in the footer that the site runs on
  Railway and PostgreSQL"). Railway deployment `06e49d11` built that SHA and reached `SUCCESS` at
  05:08:16 UTC; the footer "Hosted on Railway · Data in PostgreSQL" is live.

## Status

- Railway trial ends about **2026-11-07**.
- Azure VM `vm-career-platform` stays running as the rollback target until the instructor says it
  can stop. It runs `3ec9e9c` on SQLite.
- Pending: remove the Postgres TCP proxy (Railway dashboard) now that laptop database work is done.
