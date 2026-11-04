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
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> pulling"
git pull --ff-only

echo "==> installing dependencies"
npm ci

# On a t3.micro this takes 3-8 minutes and leans on swap. If the kernel kills it, check that
# swap is still active (`free -h`) before assuming the build itself is broken.
echo "==> building"
npm run build

echo "==> applying migrations (never seeding)"
npm run db:migrate

echo "==> restarting"
sudo systemctl restart career-platform
systemctl is-active career-platform

echo "==> health"
curl -fsS localhost:3000/api/health && echo
