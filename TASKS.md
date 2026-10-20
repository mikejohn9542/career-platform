# Project 1 gap checklist

Gaps found by auditing this repository against
[Project 1: Own your corner of the internet](https://github.com/LMU-ISBA/isba-4775-fa26/blob/main/projects/own-your-corner-of-the-internet.md)
on **2026-10-20**. Each line names the file to change or the check to run that closes it.
Written after the fact from the repository alone; nothing live was inspected.

## 1. Personal application (15 pts)

- [ ] Return HTTP 503 with the profile still visible and "Projects temporarily unavailable" when the database fails → `src/app/page.tsx`, `src/lib/content-service.ts`
- [ ] Stop substituting `profile-snapshot.json` on a failed query, which the requirement forbids → `src/lib/content-service.ts:62-107`
- [ ] Handle an empty projects table deliberately instead of falling back to the snapshot → `src/lib/content-service.ts:67`
- [ ] Add a clearly labeled project entry describing this site as a project in progress → database row, `src/content/profile.ts`
- [ ] Explain why SQLite was the initial database engine → `README.md`
- [ ] Record an outage test: 200 healthy, 503 with the database down, projects back on refresh without a restart → new evidence file under `docs/evidence/`

## 2. Azure deployment (20 pts)

- [ ] Record the inbound rule for port 443, or mark it unverified (the rules table predates TLS) → `docs/superpowers/plans/2026-10-01-operate-the-vm.md` Record section
- [ ] Add an Azure architecture diagram with locations, protocols, and ports → `README.md`
- [ ] State that the post-restart page was read from the database, not the snapshot → `docs/superpowers/plans/2026-10-01-operate-the-vm.md` Section 6 Step 1

## 4. Railway and PostgreSQL migration (25 pts)

- [ ] Label the pre-migration data divergence (`resume_metadata.pdf_url`) as the real change that rules out seeding → `docs/superpowers/plans/2026-10-08-railway-postgres-migration.md:819`
- [ ] State what Git moved and what needed another method → `README.md` "How the migration kept the data"
- [ ] Itemize who owns OS, runtime, web entry point, TLS, code, configuration, database software, data, and DNS → `README.md` "Who owns what"

## 5. Reviewed change (5 pts)

- [ ] Record the local diff review and test run that preceded `c1b6ddd` → `docs/project-1-submission.md` "Update test"

## 6. Zoho email (15 pts)

- [ ] Add the before-MX line: external message sent to the custom address before any mail record existed, and what happened → `docs/evidence/ex06.md`
- [ ] Link `ex06.md` and `zoho-header-check.md` from the README → `README.md`

## 7. Google Analytics (10 pts)

- [ ] Link the GA4 evidence and the privacy page from the README → `README.md`

## 8. Engineering record (20 pts)

- [ ] Add a Zoho email section covering the mail path → `README.md`
- [ ] Add a GA4 section covering the analytics path → `README.md`
- [ ] Show the email and analytics paths on both architecture diagrams → `README.md`
- [ ] Name the two investigated failures and write each as symptom, checks, diagnosis, repair, repeated verification → `README.md`, `docs/evidence/ex03.md`, `docs/evidence/ex05.md`
- [ ] Add a second decision with alternatives and reasons: managed versus self-hosted email → `README.md`
- [ ] Itemize service costs and credits with expiration dates and a cleanup plan → `README.md`
- [ ] Add the final commit SHA alongside the repository and live URLs → `docs/project-1-submission.md`
- [ ] Link all eight required records, including the spec, the 2026-09-15 plan, both diagrams, Azure HTTP and restart evidence, and final DNS/HTTPS verification → `docs/project-1-submission.md`
- [ ] Link `ex03.md`, `ex05.md`, and `zoho-header-check.md` from the submission index → `docs/project-1-submission.md`
- [ ] Mark retrospective explanations as written afterward and flag anything unverified → `README.md`, `docs/project-1-submission.md`
- [ ] Refresh or caveat the stale claims about SQLite, the Azure VM, and undecided analytics → `PRODUCT.md`

## Re-checks before submitting

- [ ] Re-run the live DNS, HTTPS, and certificate checks and record the date (newest recorded: 2026-10-09) → `docs/project-1-submission.md`
- [ ] Confirm the Azure VM is running and still serves `3ec9e9c` on SQLite as the rollback target → `README.md` Rollback
- [ ] Confirm the live site holds the "project in progress" entry once it is added → `https://michaeljportfolio.me`
- [ ] Remove the Railway Postgres TCP proxy, listed as pending → `docs/project-1-submission.md` Status
