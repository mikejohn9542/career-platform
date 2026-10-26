# Project 1 gap checklist

Gaps found by auditing this repository against
[Project 1: Own your corner of the internet](https://github.com/LMU-ISBA/isba-4775-fa26/blob/main/projects/own-your-corner-of-the-internet.md)
on **2026-10-20**, worked through on **2026-10-22**. Each line names the file that closes it.

## 1. Personal application (15 pts)

- [x] Return an unhealthy status with the profile still visible and "Projects temporarily unavailable" when the database fails → `src/app/page.tsx`, `src/app/api/health/route.ts` (503)
- [x] Stop substituting `profile-snapshot.json` for a failed query → `src/lib/content-service.ts`
- [x] Handle an empty projects table deliberately, as a healthy state with its own message → `src/lib/content-service.ts`, `src/app/page.tsx`
- [x] Record an outage test: profile kept, message shown, 503, recovery without a restart → [`docs/evidence/db-outage-test.md`](docs/evidence/db-outage-test.md)
- [ ] **Open, decision not yet made:** the HTML document still returns 200 during an outage; the 503 is on `/api/health`. An App Router page cannot set a status code → would need Node-runtime middleware. Observed live on 2026-10-26 during the credential rotation. Recorded in [README → Limitations](README.md#limitations)
- [x] Added a clearly labelled project entry describing this site as a project in progress (2026-10-26). Ran [`scripts/sql/add-in-progress-project.sql`](scripts/sql/add-in-progress-project.sql) through the raw-query box on the Postgres service’s **Data** tab — the laptop cannot reach the database. Verified on the live site: one entry, last in the list, with 4 highlights, 6 technologies and 2 links, and it appeared without a redeploy → [submission index §1](docs/project-1-submission.md)
- [x] Explain why SQLite was the initial database engine → [README → Decisions](README.md#3-sqlite-as-the-initial-engine-postgresql-on-railway)

## 2. Azure deployment (20 pts)

- [x] Add an Azure architecture diagram with locations, protocols, and ports → [README → History: Azure VM](README.md#history-azure-vm-septoct-2026)
- [x] Recorded the port 443 inbound rule, read back from the surviving NSG on 2026-10-22 → `docs/superpowers/plans/2026-10-01-operate-the-vm.md` Record
- [x] Addressed the post-restart database question honestly: inferred, not separately captured → `docs/superpowers/plans/2026-10-01-operate-the-vm.md` Section 6 Step 1

## 4. Railway and PostgreSQL migration (25 pts)

- [x] Label the pre-migration data divergence as the change that rules out seeding → [README → How the migration kept the data](README.md#how-the-migration-kept-the-data)
- [x] State what Git moved and what needed another method → same section
- [x] Itemize who owns OS, runtime, entry point, TLS, code, configuration, database software, data, and DNS → [README → Who owns what](README.md#who-owns-what)

## 5. Reviewed change (5 pts)

- [x] Tie a commit to its Railway deployment and to the live behaviour → [submission index → Reviewed changes](docs/project-1-submission.md#reviewed-changes)
- [x] Recorded the local review and test run for the change, now that the deployment id exists: 30 tests pass and `tsc --noEmit` is clean before the push, deployment `5fb3597c` built `0313103` → [submission index → Reviewed changes](docs/project-1-submission.md#reviewed-changes)

## 6. Zoho email (15 pts)

- [x] Record the before-MX test as unverified rather than inventing it → [`docs/evidence/ex06.md`](docs/evidence/ex06.md) §1
- [x] Link `ex06.md` and `zoho-header-check.md` from the README → [README → Domain email](README.md#domain-email-zoho)

## 7. Google Analytics (10 pts)

- [x] Link the GA4 evidence and the privacy page from the README, and explain how events reach Google → [README → Analytics](README.md#analytics-ga4)

## 8. Engineering record (20 pts)

- [x] Add a Zoho email section covering the mail path → `README.md`
- [x] Add a GA4 section covering the analytics path → `README.md`
- [x] Show the email and analytics paths on the architecture diagrams → `README.md`
- [x] Name the two investigated failures and write each as symptom, checks, diagnosis, repair, repeated verification → [README → Two investigated failures](README.md#two-investigated-failures)
- [x] Add a second decision with alternatives and reasons: managed versus self-hosted email → [README → Decisions](README.md#decisions)
- [x] Itemize service costs and credits with expiration dates and a cleanup plan → [README → Costs](README.md#costs-credits-and-cleanup)
- [x] Link all eight required records from the submission index → [`docs/project-1-submission.md`](docs/project-1-submission.md)
- [x] Mark retrospective explanations as written afterward and flag anything unverified → [README → Retrospective](README.md#retrospective), [Limitations](README.md#limitations)
- [x] Refresh the stale claims about SQLite, the Azure VM, and undecided analytics → `PRODUCT.md`
- [ ] **Open:** add the final commit SHA → [`docs/project-1-submission.md`](docs/project-1-submission.md)

## Re-checks before submitting

- [x] Confirm the live site answers and renders projects from PostgreSQL (2026-10-22) → [`docs/evidence/db-outage-test.md`](docs/evidence/db-outage-test.md)
- [x] Confirmed the deployment reached `SUCCESS` and `/api/health` answers 200 — deployment `5fb3597c` built `0313103` on 2026-10-26 00:19 PDT, and `/api/health` returns `{"status":"ok","source":"database"}` → [`docs/evidence/db-outage-test.md`](docs/evidence/db-outage-test.md#deployed-and-verified-live-2026-10-26)
- [x] Re-ran the live DNS, HTTPS, and certificate checks on 2026-10-22 → [submission index §4](docs/project-1-submission.md)
- [x] ~~Confirm the Azure VM is running and still serves `3ec9e9c` on SQLite~~ — not applicable: the VM was deleted on 2026-10-22 with the instructor's authorisation → [README → Limitations](README.md#limitations)
- [x] Remove the Railway Postgres TCP proxy — confirmed gone on 2026-10-26: the Postgres service has no `DATABASE_PUBLIC_URL` and no TCP proxy variable, so the database is reachable only on the private network

## Security incident response (Railway, 2026-10-21)

Railway disclosed that customer environment variables may have been decrypted and read. Background
and this project's exposure: [README → Third-party security incident](README.md#third-party-security-incident-october-2026).

- [x] Rotated the PostgreSQL password on 2026-10-26 with **Regenerate**, found under the Postgres
      service's **Database → Config → Connection** section, not the Variables tab. Not possible from
      the CLI — the public GraphQL API exposes no such mutation, and `railway ssh` would mean
      registering an SSH key. Railway's own guidance rules out hand-editing `POSTGRES_PASSWORD` and
      running `ALTER USER` alike, because each changes only one side and leaves the variable and the
      database out of sync. Verified afterwards: `/api/health` answers 200 with `"source":"database"`
      → [`docs/evidence/db-outage-test.md`](docs/evidence/db-outage-test.md#the-degraded-half-observed-in-production-2026-10-26)
- [x] Confirmed the web service picked up the new credential: Railway created deployment `9d01887a` when the referenced `DATABASE_URL` changed, so no manual redeploy was needed, and `/api/health` answered 200 with `"source":"database"` at 07:48:50Z
- [x] Checked the Zoho mailbox (`michaelj@michaeljportfolio.me`) on 2026-10-26: **no mail from Railway at all**, searching `Railway`, `sender:railway.com` and `security` with spam and trash included. This is the expected result rather than a clear one — Railway’s account email is the LMU address, so a notice would arrive there
- [ ] **Open:** check `mjohn184@lion.lmu.edu`, the Railway account address, for the affected-customer notice and record the outcome either way
      either way
- [ ] **Open:** reissue any Railway API or project token in use — every token created before the
      incident was invalidated. None is referenced by this repository.
- [x] Confirm no credential is committed: `.env` and `data/` are gitignored and the database
      password has never been in the repository
- [x] Confirm the blast radius: the only secret this project keeps in Railway is the PostgreSQL
      password, and the database has no public endpoint
