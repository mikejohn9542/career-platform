# Database outage test

**Run 2026-10-22.** What the site does when PostgreSQL cannot answer, and what it does when it can.
Written the same day as the run, from the run's own output.

The behaviour under test is in `src/lib/content-service.ts` (it marks projects `unavailable` and
strips the project array rather than substituting the snapshot), `src/app/page.tsx` (renders the
message), and `src/app/api/health/route.ts` (returns 503).

## How the outage was produced

A `next dev` server was started with `DATABASE_URL` pointing at `127.0.0.1:15432`, where **nothing
was listening**. Every connection attempt is refused, which is what an unreachable database looks
like to the application: the same code path as a dropped network, a stopped server, or a wrong host.

## 1. Database unreachable

```
GET /                -> HTTP 200
GET /api/health      -> HTTP 503   {"status":"projects_unavailable","source":"snapshot"}
profile rendered                    : true
"Projects temporarily unavailable"  : true
real project from the database      : false
```

What this shows, line by line:

- **The profile survives the outage.** The name and the rest of the authored profile still render,
  from `src/generated/profile-snapshot.json`.
- **The project list is empty and labelled.** The page says "Projects temporarily unavailable". The
  check for a real project title (`LLM Manager`) is **false**, which is the important one: no
  project content was substituted from anywhere. The service returns `projects: []` so the page has
  nothing to fall back to.
- **`/api/health` returns 503.** It runs the same query the page runs, so it is a real check and not
  a ping.
- **Nothing crashed.** The request completed normally and the server stayed up.

The server log shows the cause rather than swallowing it:

```
content_unavailable {
  operation: 'getSiteContent',
  reason: 'Failed query: select ... from "profiles" ...'
}
```

## 2. Healthy

Verified against the **live site** rather than locally — see the limitation below.

```
2026-10-22 12:25 PDT, from a home network
GET https://michaeljportfolio.me/          -> HTTP 200
  profile rendered                          : yes
  real project from PostgreSQL ("LLM Manager"): yes
  "Projects temporarily unavailable"         : absent
```

The live site reads its projects from PostgreSQL and renders them, which is the healthy case. Note
that at the time of this check the live site was running commit `347b069`, which predates the
change described here — so this confirms the healthy path end to end, not the new outage handling.
See "Deployment status" below.

## 3. Recovery without a restart

Covered by a unit test rather than an HTTP demonstration:
`tests/unit/content-service.test.ts` → *"recovers on the next call once the database answers
again"*. It drives one content service whose database fails on the first call and succeeds on the
second, and asserts that the second call reports `projects: "available"` with
`source: "database"` — no new process, no restart. The page is `dynamic = "force-dynamic"` and the
`pg` pool reconnects on the next query, so a refresh is all that is needed.

## Limitations of this test

- **The healthy half could not be run locally.** The laptop cannot reach Railway's PostgreSQL: the
  public TCP proxy that made that possible was being removed, and a direct connection from the
  laptop failed on every query. Docker is not installed on this machine either, so no local
  PostgreSQL was available. The healthy half is therefore verified against the live site, where the
  web service reaches PostgreSQL over Railway's private network.
- **Recovery was proven at the service level, not over HTTP**, for the same reason: with no
  reachable PostgreSQL there was no database to bring back in front of a running server.
- **The outage half ran against a development server** (`next dev`), not a production build. The
  code path is the same; the production build is what was deployed and checked live.
- **The HTML document returns 200 during the outage, not 503.** A Next.js App Router page cannot set
  its own status code, so the 503 is served by `/api/health`. This gap is recorded in the
  [README limitations](../../README.md#limitations).

## Deployment status: blocked for four days by a Railway security incident

**As of 2026-10-22 12:35 PDT the live site ran commit `347b069` (2026-10-20), not this change.**
The cause was outside this repository and unrelated to the trial's usage. Railway disclosed a
security incident on 2026-10-21 — an unauthorised party reached the systems holding customer
environment variables — and paused deployments platform-wide as part of its response. The status
page presented this as a Major Outage, which is how it was first recorded here; the security notice
is the actual cause:

- Railway's deployment history shows the last build as `347b069`, `SUCCESS`, 2026-10-20 15:13 PDT.
  Six pushes on 2026-10-22 produced **no deployment at all**.
- `railway up --detach` answers: `Deploys have been paused temporarily`.
- [status.railway.com](https://status.railway.com/) at 12:36 PDT (19:36 UTC) reports an active
  **Major Outage**, state "Identified", last updated 19:06 UTC: builds are running for Pro and
  Enterprise, **still unavailable for Hobby**, and **not yet re-enabled for Free and Trial**, which
  is this project's plan. Signups are paused. Next update expected 19:45 UTC.
- The running container is healthy and serving traffic throughout, so the site never went down.

What that means for the behaviour described in this file: it is implemented, unit-tested (30 tests
pass), type-checked, linted, built cleanly as a production build locally, and verified against a
running server for the outage case. It is **not yet observable on the live site**. The live check of
`https://michaeljportfolio.me/api/health` returns `404` until a build runs, because the route does
not exist in `347b069`.

| Check | Result (2026-10-22) |
|---|---|
| `GET https://michaeljportfolio.me/` | **200**, profile and projects rendered from PostgreSQL |
| `GET https://michaeljportfolio.me/api/health` | **404** — route not in the deployed commit |
| Deployed commit | `347b069` (2026-10-20) |
| Reason the deploy is blocked | Railway platform outage; Trial builds disabled |
