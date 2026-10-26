# Project 1 submission index

| | |
|---|---|
| **Live site** | **https://michaeljportfolio.me** |
| **Repository** | https://github.com/mikejohn9542/career-platform |
| **Final commit SHA** | `5f42272ce21961ae33b9267757b4736c41f63920` completes the work. The commits after it touch this file only, because a row recording the final commit cannot name its own commit. **Submit the head of `main`**, so that a checkout has this row filled in — `git log -1 --format=%H` on `main` prints it. |

Every requirement below links to the record that answers it. Records written after the fact say so.

**Verified live on 2026-10-26, immediately before submission** (commands run, output as shown):

```
https://michaeljportfolio.me/           -> HTTP 200
http://michaeljportfolio.me/            -> 301  https://michaeljportfolio.me/
http://www.michaeljportfolio.me/        -> 301  https://michaeljportfolio.me/
https://www.michaeljportfolio.me/       -> 301  https://michaeljportfolio.me/
https://michaeljportfolio.me/privacy    -> HTTP 200
https://michaeljportfolio.me/api/health -> HTTP 200  {"status":"ok","source":"database"}

apex certificate: subject=CN=michaeljportfolio.me
                  issuer=C=US, O=Let's Encrypt, CN=YE1
                  notBefore=Oct  8 21:28:46 2026 GMT   notAfter=Jan  6 21:28:45 2027 GMT

repository, origin/main and the deployed commit all in agreement
33 tests pass  |  tsc --noEmit clean  |  eslint clean  |  working tree clean
```

The `"source":"database"` in that health response is the application reporting that it served the
request from PostgreSQL rather than from the build-time snapshot.

## 1. The application, its spec, and its plans

| What | Where |
|---|---|
| README: what the site does, how to set it up, update it, and roll it back | [README.md](../README.md) |
| Original design spec (2026-09-15, before any code) | [specs/2026-09-15-personal-resume-career-platform-design.md](superpowers/specs/2026-09-15-personal-resume-career-platform-design.md) |
| Original implementation plan | [plans/2026-09-15-personal-resume-career-platform.md](superpowers/plans/2026-09-15-personal-resume-career-platform.md) |
| Product context | [PRODUCT.md](../PRODUCT.md) · Design system: [DESIGN.md](../DESIGN.md) |
| Projects read from PostgreSQL per request | `src/app/page.tsx` (`dynamic = "force-dynamic"`), `src/db/repository.ts` |
| A clearly labelled entry for this site as a project in progress, added 2026-10-26 | https://michaeljportfolio.me/#projects · statement: [`scripts/sql/add-in-progress-project.sql`](../scripts/sql/add-in-progress-project.sql) · tests: [`tests/integration/add-in-progress-project.test.ts`](../tests/integration/add-in-progress-project.test.ts) |
| Database-failure behaviour: profile stays, "Projects temporarily unavailable", unhealthy status, recovery without a restart | [README → Database failure behaviour](../README.md#database-failure-behaviour) · test: [evidence/db-outage-test.md](evidence/db-outage-test.md) |
| Live proof the page reads PostgreSQL per request: `/api/health` → `200 {"source":"database"}` | https://michaeljportfolio.me/api/health · [evidence/db-outage-test.md](evidence/db-outage-test.md#deployed-and-verified-live-2026-10-26) |
| **Both halves verified in production**: a real failed query gave `503 {"status":"projects_unavailable","source":"snapshot"}` with the projects list labelled and the profile unaffected, then recovery to `200` with no code change | [evidence/db-outage-test.md](evidence/db-outage-test.md#the-degraded-half-observed-in-production-2026-10-26) |

## 2. Architecture diagrams, including email and analytics

| What | Where |
|---|---|
| Railway architecture: locations, protocols, ports, plus the email and analytics paths | [README → How it runs today](../README.md#how-it-runs-today-railway) |
| Azure VM architecture, same detail | [README → History: Azure VM](../README.md#history-azure-vm-septoct-2026) |
| Request-path walkthrough for both deployments | [practice.md](../practice.md) |

## 3. Migration: plan, comparison, cutover, rollback

| What | Where |
|---|---|
| Migration plan, **written before the deployment changed** (commit `ef47cdd`, before the first code commit `f1a6dc6`) | [plans/2026-10-08-railway-postgres-migration.md](superpowers/plans/2026-10-08-railway-postgres-migration.md) |
| VM backup and its verification | Plan → "Backup of the VM database" |
| Table-by-table comparison, VM vs Railway: 13 tables, 55 rows, 268 cells, 0 differences (redacted: counts and hashes only) | Plan → Task 6, Step 4 result |
| Deploy, pre-deploy migrations, runtime log review | Plan → Task 6, "Cause found" and "Runtime log review" |
| Cutover and post-cutover checks | Plan → "Task 7 results" |
| What Git moved vs what needed another method, and the data change that rules out seeding | [README → How the migration kept the data](../README.md#how-the-migration-kept-the-data) |
| Rollback, including data written after cutover, and schema rollback | [README → Rollback](../README.md#rollback) |
| Who owns what on Azure vs Railway, item by item | [README → Who owns what](../README.md#who-owns-what) |

## 4. Azure deployment and DNS/HTTPS verification

| What | Where |
|---|---|
| VM build: size, image, addresses, SSH key, firewall rule, auto-shutdown | [evidence/ex03.md](evidence/ex03.md) · [plans/2026-09-24-azure-vm-migration.md](superpowers/plans/2026-09-24-azure-vm-migration.md) |
| Two app copies under systemd, nginx in front, app on loopback only | [plans/2026-10-01-operate-the-vm.md](superpowers/plans/2026-10-01-operate-the-vm.md) → Sections 1 and 2 |
| Site answers over the internet with port 8000 closed | Same → Section 4, Step 1 |
| **Controlled restart**: boot time changes, services start themselves 9 s later, site answers with the data | Same → Section 6, Step 1 |
| Crash tests: kill one copy, kill both, stop the service | Same → Section 6, Steps 2-4 |
| Ports, private and public addresses, NSG inbound rules | Same → "Record" |
| HTTPS on the VM: certificate, renewal, ports (Ex04, written by me) | [how-this-site-is-secured.md](how-this-site-is-secured.md) |
| Final DNS and HTTPS on Railway: records, `www` redirect, both certificates | Plan → "Task 7 results" · zone before mail: [evidence/dns-before-zoho.md](evidence/dns-before-zoho.md) |

**Re-verified live on 2026-10-22 from a home network** (commands run, output as shown):

```
https://michaeljportfolio.me/        -> HTTP/1.1 200 OK
http://michaeljportfolio.me/         -> 301  location: https://michaeljportfolio.me/
http://www.michaeljportfolio.me/     -> 301  Location: https://michaeljportfolio.me/   Server: cloudflare
https://www.michaeljportfolio.me/    -> 301  Location: https://michaeljportfolio.me/   Server: cloudflare
following www                        -> final HTTP 200 at https://michaeljportfolio.me/ after 1 redirect

apex certificate: subject=CN=michaeljportfolio.me  issuer=Let's Encrypt YE1
                  notBefore=Oct  8 21:28:46 2026 GMT   notAfter=Jan  6 21:28:45 2027 GMT
www  certificate: subject=CN=michaeljportfolio.me  issuer=Let's Encrypt YE1
                  notBefore=Oct  1 21:02:10 2026 GMT   notAfter=Dec 30 21:02:09 2026 GMT
```

Both certificates are current, the apex is served by Railway and `www` by Cloudflare's edge, and
every `www` entry point lands on the root over HTTPS — the same behaviour recorded on 2026-10-09,
confirmed again today rather than assumed.

## 5. A reviewed change published through Railway

| What | Where |
|---|---|
| GitHub → Railway, build, pre-deploy migrate, healthcheck, then traffic | [README → Updating the site](../README.md#updating-the-site) · `railway.json` |
| Commit `c1b6ddd` → Railway deployment `06e49d11`, `SUCCESS` 2026-10-10 05:08:16 UTC, footer live | [Reviewed changes](#reviewed-changes) below |
| Secrets kept out of the repository | `.gitignore` (`.env`, `data/`), Railway variables |
| How to restore a previous version, code and data | [README → Rollback](../README.md#rollback) |

## 6. Zoho email

| What | Where |
|---|---|
| Send, receive, and reply from `michaelj@michaeljportfolio.me`, with times and outcomes | [evidence/ex06.md](evidence/ex06.md) §1 |
| MX, SPF, DKIM, DMARC: the records, verified live against `8.8.8.8` | [evidence/ex06.md](evidence/ex06.md) §2 |
| Receiving server's verdict: `spf=pass`, `dkim=pass`, `dmarc=pass`, all aligned | [evidence/zoho-header-check.md](evidence/zoho-header-check.md) |
| Independent corroboration: mail-tester 10/10, Microsoft DMARC aggregate reports | [evidence/ex06.md](evidence/ex06.md) §2 + screenshot |
| Why managed email rather than self-hosted | [README → Decisions](../README.md#2-managed-email-zoho-rather-than-self-hosted-mail) |
| **Not done:** the pre-MX delivery test, marked unverified | [README → Limitations](../README.md#limitations) |

## 7. Google Analytics 4

| What | Where |
|---|---|
| Tag install, measurement ID, how browser activity reaches Google | [README → Analytics](../README.md#analytics-ga4) · `src/app/layout.tsx` |
| `page_view` verified in Realtime (screenshot) | [evidence/ex06.md](evidence/ex06.md) §3 |
| Outbound `click` verified with its destination parameters (screenshot) | Same §3 |
| What the click shows and what it does not | Same §3 |
| Privacy page, linked from the footer | `src/app/privacy/page.tsx` · https://michaeljportfolio.me/privacy |

## 8. Failures, decisions, reflection, costs, limitations

| What | Where |
|---|---|
| Failure A — application/database dependency: the build passed but PostgreSQL had no tables | [README → Two investigated failures](../README.md#two-investigated-failures) |
| Failure B — network/DNS: `www` still resolved to the retired VM after cutover | Same |
| Deliberate lab failure (supplied simulation, labelled): stale A record causing a TLS name mismatch | [evidence/ex05.md](evidence/ex05.md) |
| Azure-era application/database failure: two different database paths, fixed in `cf8324b` | [evidence/ex03.md](evidence/ex03.md) §3 |
| Decision 1 — Azure VM vs Railway, with alternatives | [README → Decisions](../README.md#1-move-from-an-azure-vm-to-railway) |
| Decision 2 — managed email vs self-hosted | [README → Decisions](../README.md#2-managed-email-zoho-rather-than-self-hosted-mail) |
| Reflection, marked as written afterwards | [README → Retrospective](../README.md#retrospective) |
| Costs, credits, expiry dates, cleanup plan | [README → Costs, credits, and cleanup](../README.md#costs-credits-and-cleanup) |
| Limitations and everything marked unverified | [README → Limitations](../README.md#limitations) |
| Failure C — a provider security incident: deploys paused for days, then every credential rotated | [README → Third-party security incident](../README.md#third-party-security-incident-october-2026) |
| Outstanding work | [TASKS.md](../TASKS.md) |

## Reviewed changes

- **Railway CLI:** linked to project `vivacious-happiness`, service `earnest-clarity`, environment
  `production`. `railway domain list` → `michaeljportfolio.me`, custom, verified, certificate
  `VALID`, sync `ACTIVE`, port 8080.
- **Cloudflare CLI:** `cf dns records list --zone michaeljportfolio.me` → root `CNAME` to the
  Railway service domain (DNS only), `_railway-verify` TXT, `www` A `192.0.2.1` (proxied redirect).
- **Content write through the dashboard (2026-10-26):** ran
  `scripts/sql/add-in-progress-project.sql` in the raw-query box on the Postgres service’s Data tab,
  the laptop having no route to the database since the TCP proxy was removed. The statement is
  idempotent and was run against PGlite, a real Postgres engine, by three tests before it was run
  against production: the entry reads back whole, it sorts after the existing projects instead of
  colliding with the unique `(profile_id, sort_order)` index, and a second run changes nothing.
  Verified afterwards on the live site: one entry, last in the list, carrying 4 highlights, 6
  technologies and 2 links, and it appeared **with no redeploy**.
- **Write test (2026-10-09):** added "SQL" to the Analytics skills through
  `railway run --service Postgres` (one transaction, TLS). It appeared on the live site with no
  redeploy, so the site reads and writes PostgreSQL on Railway.
- **Update test (2026-10-10 05:07 UTC):** pushed `c1b6ddd` ("say in the footer that the site runs on
  Railway and PostgreSQL"). Railway deployment `06e49d11` built that SHA and reached `SUCCESS` at
  05:08:16 UTC; the footer "Hosted on Railway · Data in PostgreSQL" is live.
- **Database-failure change (2026-10-26 00:19 PDT):** pushed `0313103`, which carried the
  content-service change that stops substituting snapshot content for a failed query. Railway
  deployment `5fb3597c-295e-467d-8df7-d25cf3e48e67` built that SHA and reached `SUCCESS`;
  `/api/health` then answered `200` with `"source":"database"`. Local review before the push: 30
  tests pass, `tsc --noEmit` clean. This change had waited since 2026-10-22 because Railway paused
  deploys after its security incident.

## Status

- Railway trial ends about **2026-11-07**.
- **Azure VM `vm-career-platform` was deleted on 2026-10-22** (`az vm show` → `ResourceNotFound`).
  It had been running `3ec9e9c` on SQLite as the rollback target. The project says the VM stays
  running "until the instructor says otherwise", and **the instructor told the class the VM could
  be deleted**, so the requirement was released rather than missed. Noted in
  [README → Limitations](../README.md#limitations) with its effect on rollback. The VNET, public IP, and network security group
  survive in `rg-career-platform`; the NSG rules were read back from Azure on 2026-10-22 and are in
  [operating the VM](superpowers/plans/2026-10-01-operate-the-vm.md) → Record.
- Rolling back to Azure now means rebuilding the VM from the plans: [README → Rollback](../README.md#rollback).
- The Postgres TCP proxy is gone: the database service has no `DATABASE_PUBLIC_URL` and no proxy
  variable, so PostgreSQL is reachable only on the project's private network (checked 2026-10-26).
- **Railway security incident, 2026-10-21.** Customer environment variables may have been decrypted
  and read, and deploys were paused platform-wide for several days as a result. This project keeps
  one secret on Railway, the database password, and the database has no public endpoint. Background,
  exposure, and the rotation procedure:
  [README → Third-party security incident](../README.md#third-party-security-incident-october-2026).
  Railway's preliminary report, received 2026-10-23, states that this workspace does not meet the
  criteria for a higher-risk workspace, while noting that this does not rule out compromise.
  Provider activity was reviewed on 2026-10-26: GitHub has a single collaborator, no deploy keys,
  and no commit or branch that is not the author's own; no API token exists outside this repository.
  The password was rotated on 2026-10-26 and the application verified afterwards. The rotation
  briefly produced the database-failure behaviour on the live site, which is recorded in
  [evidence/db-outage-test.md](evidence/db-outage-test.md#the-degraded-half-observed-in-production-2026-10-26).
