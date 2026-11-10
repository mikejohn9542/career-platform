#!/usr/bin/env bash
#
# Deploy a code change to an already-provisioned EC2 instance.
# Run on the instance:  bash /opt/career-platform/deploy/deploy.sh
#
# NEVER add `npm run db:seed` or `npm run db:move-rows` to this script.
# seedProfile() in src/db/repository.ts opens with `tx.delete(profiles)` and rebuilds every table
# from src/content/profile.ts. That file declares two projects; the live database has three. The
# third, `michaeljportfolio-me`, exists ONLY in the database, so a seed would silently destroy
# published content. `db:migrate` is the only database command that belongs in a deploy.
# The real protection is assertSafeToSeed() in src/db/repository.ts, which refuses to seed a
# database that already holds projects. This comment is a reminder, not the guard.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=/etc/career-platform.env
SERVICE=career-platform
HEALTH_URL=http://127.0.0.1:3000/api/health
HEALTH_ATTEMPTS=40

# systemd reads ENV_FILE itself, but `npm run db:migrate` runs in THIS shell, and scripts/migrate.ts
# only loads `dotenv/config` - which looks for a repo-root .env that is gitignored and therefore
# absent from the instance. Without this block the migration aborts and `set -e` stops the script
# BEFORE the restart, leaving new code on disk and the old process still serving it.
#
# Read with grep/cut rather than `source`: DATABASE_URL contains an unquoted `&` before
# sslrootcert in some hand-written env files, and bash would read that as a background-job
# operator and truncate the value.
read_env_var() {
  local name="$1" raw
  raw="$(sudo grep -m1 "^${name}=" "$ENV_FILE" | cut -d= -f2-)"
  # Strip one layer of surrounding single or double quotes, if present.
  raw="${raw%$'\r'}"
  if [[ "$raw" == \"*\" || "$raw" == \'*\' ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  printf '%s' "$raw"
}

if [[ ! -r /dev/stdin ]] || ! sudo test -r "$ENV_FILE"; then
  echo "Cannot read $ENV_FILE (needs sudo). Aborting before touching anything." >&2
  exit 1
fi

DATABASE_URL="$(read_env_var DATABASE_URL)"
DATABASE_CA_CERT_PATH="$(read_env_var DATABASE_CA_CERT_PATH)"
export DATABASE_URL DATABASE_CA_CERT_PATH

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is empty in $ENV_FILE. Aborting before touching anything." >&2
  exit 1
fi

# package.json pins node >=22 <23, but npm only warns about that unless engine-strict is set.
# Check it here, where a wrong version would otherwise surface as a confusing build failure.
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$NODE_MAJOR" != "22" ]]; then
  echo "Node 22 is required (package.json engines); found $(node -v). Aborting." >&2
  exit 1
fi

# `git pull` can replace this very file while bash is still reading it, which makes the rest of
# the run a mix of old and new logic. (That is exactly what happened the first time the env-loading
# fix was deployed: the pull brought the new script in but the old one kept executing and failed on
# a missing DATABASE_URL.) Compare the script's own hash across the pull and re-exec if it moved.
SELF="$(readlink -f "$0")"
if [[ "${1:-}" != "--already-pulled" ]]; then
  SELF_BEFORE="$(sha256sum "$SELF" | cut -d" " -f1)"
  echo "==> pulling"
  git pull --ff-only
  SELF_AFTER="$(sha256sum "$SELF" | cut -d" " -f1)"
  if [[ "$SELF_BEFORE" != "$SELF_AFTER" ]]; then
    echo "==> deploy.sh itself changed in that pull; re-executing the new version"
    exec bash "$SELF" --already-pulled
  fi
else
  echo "==> pull already done by the previous version of this script"
fi

echo "==> installing dependencies"
npm ci

# Stop before building. `npm run build` replaces .next in place while the running server is still
# serving out of it: for the whole build window the live site has a new BUILD_ID on disk and its
# old static chunks deleted, so browsers get 404s on chunk requests and broken pages. Stopping
# first means Nginx returns a clean 502 for the build window, which is at least honest.
echo "==> stopping $SERVICE for the build"
sudo systemctl stop "$SERVICE"

# On a t3.micro this leans on swap. If the kernel kills it, check that swap is still active
# (`free -h`) before assuming the build itself is broken. Measured: 70s, 52 MiB of swap.
echo "==> building"
npm run build

echo "==> applying migrations (never seeding)"
npm run db:migrate

# npm ci and next build create files owned by `ubuntu` with group `ubuntu`, so without this the
# careerplat service account loses read access to the new code and the app fails to start after
# every deploy. Re-apply the split that the unit depends on:
#   - group careerplat, read+execute, so the app can read the code it runs
#   - no group write anywhere, so the app cannot modify its own code or node_modules
#   - .next/cache owned by careerplat, the one path Next.js writes to at runtime
echo "==> handing the build to the service account"
sudo chgrp -R careerplat .
sudo chmod -R g-w,g+rX .
sudo chown -R careerplat:careerplat .next/cache

echo "==> starting $SERVICE"
sudo systemctl start "$SERVICE"
systemctl is-active "$SERVICE"

# `systemctl start` returns when the process is spawned, not when it is listening - the app needs
# about 1.8s to become ready. Checking immediately would fail a deploy that actually worked.
echo "==> waiting for health"
for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "healthy after ${attempt}s"
    curl -fsS "$HEALTH_URL" && echo
    exit 0
  fi
  sleep 1
done

echo "Still unhealthy after ${HEALTH_ATTEMPTS}s. Recent logs:" >&2
sudo journalctl -u "$SERVICE" -n 40 --no-pager >&2
exit 1
