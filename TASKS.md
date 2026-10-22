# Project 1 gap checklist

Gaps found by auditing this repository against
[Project 1: Own your corner of the internet](https://github.com/LMU-ISBA/isba-4775-fa26/blob/main/projects/own-your-corner-of-the-internet.md)
on **2026-10-20**, worked through on **2026-10-22**. Each line names the file that closes it.

## 1. Personal application (15 pts)

- [x] Return an unhealthy status with the profile still visible and "Projects temporarily unavailable" when the database fails → `src/app/page.tsx`, `src/app/api/health/route.ts` (503)
- [x] Stop substituting `profile-snapshot.json` for a failed query → `src/lib/content-service.ts`
- [x] Handle an empty projects table deliberately, as a healthy state with its own message → `src/lib/content-service.ts`, `src/app/page.tsx`
- [x] Record an outage test: profile kept, message shown, 503, recovery without a restart → [`docs/evidence/db-outage-test.md`](docs/evidence/db-outage-test.md)
- [ ] **Open:** the HTML document still returns 200 during an outage; the 503 is on `/api/health`. An App Router page cannot set a status code → would need Node-runtime middleware. Recorded in [README → Limitations](README.md#limitations)
- [ ] **Open:** add a clearly labelled project entry describing this site as a project in progress → a row in Railway's PostgreSQL (needs database access that the laptop currently lacks)
- [x] Explain why SQLite was the initial database engine → [README → Decisions](README.md#3-sqlite-as-the-initial-engine-postgresql-on-railway)

## 2. Azure deployment (20 pts)

- [x] Add an Azure architecture diagram with locations, protocols, and ports → [README → History: Azure VM](README.md#history-azure-vm-septoct-2026)
- [ ] **Open:** record the inbound rule for port 443, or confirm it in the portal — currently marked unverified → [README → Limitations](README.md#limitations)
- [ ] **Open:** state that the post-restart page was read from the database, not the snapshot → `docs/superpowers/plans/2026-10-01-operate-the-vm.md` Section 6 Step 1

## 4. Railway and PostgreSQL migration (25 pts)

- [x] Label the pre-migration data divergence as the change that rules out seeding → [README → How the migration kept the data](README.md#how-the-migration-kept-the-data)
- [x] State what Git moved and what needed another method → same section
- [x] Itemize who owns OS, runtime, entry point, TLS, code, configuration, database software, data, and DNS → [README → Who owns what](README.md#who-owns-what)

## 5. Reviewed change (5 pts)

- [x] Tie a commit to its Railway deployment and to the live behaviour → [submission index → Reviewed changes](docs/project-1-submission.md#reviewed-changes)
- [ ] **Open:** record the local review and test run for the 2026-10-22 change (tests, lint, typecheck and a local build all passed before the push; add the result once the deployment id is known)

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
- [ ] **Open:** confirm the 2026-10-22 deployment reached `SUCCESS` in Railway and `/api/health` answers 200
- [ ] **Open:** re-run the live DNS, HTTPS, and certificate checks and record the date (newest recorded: 2026-10-09)
- [ ] **Open:** confirm the Azure VM is running and still serves `3ec9e9c` on SQLite
- [ ] **Open:** remove the Railway Postgres TCP proxy (it appears to be gone already — the laptop can no longer reach the database)
