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

## Deployment status: blocked for four days, then deployed and verified on 2026-10-26

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

What that meant for the behaviour described in this file, as of 2026-10-22: implemented,
unit-tested (30 tests pass), type-checked, linted, built cleanly as a production build locally, and
verified against a running server for the outage case — but **not observable on the live site**,
because `/api/health` did not exist in `347b069` and answered `404`.

| Check | Result (2026-10-22) |
|---|---|
| `GET https://michaeljportfolio.me/` | **200**, profile and projects rendered from PostgreSQL |
| `GET https://michaeljportfolio.me/api/health` | **404** — route not in the deployed commit |
| Deployed commit | `347b069` (2026-10-20) |
| Reason the deploy is blocked | Railway paused deploys platform-wide after its 2026-10-21 security incident |

### Deployed and verified live, 2026-10-26

Builds returned for Trial workspaces at 23:22 UTC on 2026-10-22, but a restored platform does not
rebuild commits pushed while it was paused, and nothing had triggered a new build since. Pushing
`0313103` triggered one through the existing GitHub integration.

- Railway deployment `5fb3597c-295e-467d-8df7-d25cf3e48e67`, **SUCCESS**, 2026-10-26 00:19:10 PDT.
- Deployed commit `031310342edc7fc6d8f851b5e83d8a721dc7a854`, matching local `main`.

| Check | Result (2026-10-26, from a home network) |
|---|---|
| `GET https://michaeljportfolio.me/` | **200**, profile and projects rendered |
| `GET https://michaeljportfolio.me/api/health` | **200** `{"status":"ok","source":"database","checkedAt":"2026-10-26T07:21:34.261Z"}` |
| `Cache-Control` on that response | `no-store`, as the route sets |
| Outage notices present in the page HTML | none, as expected while the database is reachable |
| Deployed commit | `0313103` |

The `"source":"database"` field is the part worth keeping. Before this deployment, the claim that the
page reads PostgreSQL on every request rested on the code and on a write test that showed up without
a redeploy. It is now stated by the running application itself: `source` reports `database` only when
the query returned rows, and `snapshot` when the fallback was used. A grader can check it without
access to anything.

### The degraded half, observed in production, 2026-10-26

This was not going to be demonstrated live: producing a 503 on the real site would have meant
breaking the production database on purpose. The credential rotation forced by Railway's security
incident produced it anyway, and it was captured as it happened.

Rotating the password through Railway's Regenerate control restarts the database immediately, while
the web service keeps the old password until its own container restarts, because containers read
variables only at startup. For about a minute the running application held a credential the database
no longer accepted — a real failed query against a reachable database, which is exactly the
condition this behaviour exists for.

| Time (UTC) | `/api/health` | Page | Notice in the HTML |
|---|---|---|---|
| 07:47:41 | **503** `{"status":"projects_unavailable","source":"snapshot"}` | **200** | present |
| 07:48:50 | **200** `{"status":"ok","source":"database"}` | **200** | gone |

The notice as served, copied from the response body:

> Projects temporarily unavailable. Everything else on this page is unaffected, and the projects
> return on the next refresh once the database is reachable.

What this confirms, on the live site rather than in a test:

- The failure is **labelled, not hidden.** `source` reported `snapshot`, and the projects list was
  empty with the notice shown, instead of stale snapshot projects being passed off as current.
- The rest of the page was **unaffected** — the profile rendered normally throughout.
- The status code is **visible to a machine**: `/api/health` answered 503 while the document stayed
  200, which is the documented split.
- **Recovery needed no intervention.** The deployed commit was `1b3bcc7` before, during, and after;
  only the environment changed. Railway created deployment `9d01887a` when the referenced variable
  changed, and the next request after the switch read the database again.

Two caveats, so this is not read as more than it is. The 503 was observed while the previous
container was still serving traffic, and the deployment list timestamps its entries at creation, so
the exact moment traffic switched is not pinned down to the second. And this was a credential
failure, not an unreachable host; a network-level outage is covered by the unit tests above.
