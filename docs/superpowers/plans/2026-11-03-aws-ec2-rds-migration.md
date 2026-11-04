# AWS EC2 + RDS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve michaeljportfolio.me's content from an EC2 `t3.micro` running `next start` behind Nginx, backed by a private Single-AZ RDS PostgreSQL 18 database, verified end to end at `aws.michaeljportfolio.me` while Railway continues to serve production untouched.

**Architecture:** Two AWS resources in `us-east-1`. RDS holds the 13 content tables, restored from the verified Railway dump, reachable only from the EC2 security group on 5432. EC2 runs Node 22, builds the Next.js app on-box (2 GB swap covers the 1 GB RAM shortfall), and runs it under a systemd unit on `127.0.0.1:3000`. Nginx terminates TLS on 443 and reverse-proxies to it. The one application change is SSL: RDS ships `rds.force_ssl=1`, and the current `pg.Pool` sends no SSL options at all, so `createDbClient` gains CA-verified TLS driven by an environment variable, with local development behaviour unchanged when that variable is absent. Cutover is explicitly out of scope.

**Tech Stack:** Next.js 15.5.27, React 19.1.0, TypeScript 5.5.4, Drizzle ORM 0.45 (`drizzle-orm/node-postgres`), `pg` 8.23, Vitest 2.1.9, Ubuntu Server 26.04 LTS (`ami-0bfc5cae5711ffac8`), PostgreSQL 18, Nginx, systemd, certbot, AWS CLI 2.39.3, Cloudflare DNS.

**Spec:** `docs/aws-migration-plan.md` (the plain-language design doc this plan implements), the course guide *Migrate your site from Railway to AWS* sections 7–10 (local copy: `C:\Users\mjjoh\AppData\Local\Temp\claude\378e581ddd56bc29\f355038b-ce96-4be0-891a-2affeb8fc85d\scratchpad\aws-migration-guide.md`), and the interview decisions recorded in `migration-notes.md` § Section 6. Background: `docs/superpowers/plans/2026-10-08-railway-postgres-migration.md`.

## What exists today (inspected 2026-11-03)

| Area | Today | After this plan |
|---|---|---|
| Hosting | Railway service `earnest-clarity`, project `vivacious-happiness` | Unchanged. EC2 runs a parallel copy at `aws.michaeljportfolio.me` |
| Database | Railway PostgreSQL 18.6, private network, no SSL from the app | RDS PostgreSQL 18, private, **SSL required** |
| DB connection | `createDbClient(connectionString)` → `new Pool({ connectionString, ...POOL_OPTIONS })`, no `ssl` key | Same signature plus CA-verified TLS when `DATABASE_CA_CERT_PATH` is set |
| Process supervision | Railway `restartPolicyType: ON_FAILURE`, 5 retries, healthcheck `/` | systemd unit with `Restart=on-failure` |
| Migrations | `railway.json` `preDeployCommand: ["npm run db:migrate"]` | Explicit step in `deploy/deploy.sh` |
| TLS | Terminated by Railway's proxy | Nginx + certbot on the instance |
| HTTP→HTTPS redirect | `src/middleware.ts`, host-matched | Nginx on the test subdomain; middleware regex updated for cutover |
| Server config | None in the repo | `deploy/` holds the systemd unit, Nginx site, and deploy script |
| Node version | Unpinned (no `engines` field); laptop runs 22.20.0 | Node 22 on the instance; `engines` field added |
| Content drift | DB has a third project, `michaeljportfolio-me`, absent from `src/content/profile.ts` | Unchanged — deferred by decision; `db:seed` must never run |

## Global Constraints

- Branch is `aws-migration`. **Never commit to `main`** — Railway redeploys from it.
- Region `us-east-1` only. Every AWS CLI call passes `--profile isba-4775`. Export `MSYS_NO_PATHCONV=1` for any command taking a `/aws/service/...` argument, or Git Bash rewrites it to a Windows path.
- AWS CLI is not on this shell's PATH; invoke it as `"/c/Program Files/Amazon/AWSCLIV2/aws.exe"`.
- Policy fences (`ISBA4775EC2Migration`, a deny always wins): instance type `t3.micro` or `t3.small`; `RunInstances` must set `HttpTokens=required` explicitly or it is denied; RDS must be `db.t3.micro`/`db.t4g.micro`, Single-AZ, ≤20 GB, encrypted, not publicly accessible.
- `ec2:CreateKeyPair` is **not** granted; only `ImportKeyPair`. Generate the keypair locally; the private key never leaves the laptop and never enters Git.
- Node.js 22. `next` stays pinned at `15.5.27`.
- **Never run `npm run db:seed` or `npm run db:move-rows`** against Railway or RDS. `seedProfile()` opens with `tx.delete(profiles)` and would destroy the `michaeljportfolio-me` project, which exists only in the database.
- No secrets in Git. The RDS master password lives in a chmod-600 file on the instance and in the user's password manager — never in the repo, never in chat.
- Railway stays running and untouched throughout. **No cutover in this plan.** Only one new Cloudflare record (`aws`, DNS-only); the apex and mail records are not touched.
- Verified backup: `C:\Users\mjjoh\OneDrive\career-platform-backups\railway-20261103-1409.dump`, 36,528 bytes, SHA-256 begins `03849f47575780415bed9ee33f6380f7`. Expected content: 69 rows across 13 tables, 3 projects.
- Known account facts: account `<AWS-ACCOUNT-ID>`, default VPC `vpc-04969f461407cebb2`, AMI `ami-0bfc5cae5711ffac8`.

Shorthand used below (laptop, Git Bash, from the repo root):

```bash
cd "/c/Users/mjjoh/OneDrive/Desktop/ISBA Projects/career-platform"
export AWS_PAGER="" MSYS_NO_PATHCONV=1
AWS="/c/Program Files/Amazon/AWSCLIV2/aws.exe"
P="--profile isba-4775"
```

## Review Focus

- **RDS refuses an unencrypted connection.** `rds.force_ssl=1` is the default from PostgreSQL 15 on. The app currently sends no SSL options, so the first connection fails with a `pg_hba.conf`/SSL-off error that reads like a firewall problem. (Task 1 tests: SSL config present when the CA path is set.)
- **A misconfigured CA silently degrades instead of failing loudly.** `content-service.ts` catches every database error and renders the snapshot with `projects: "unavailable"`. A broken TLS setup would therefore look like a working site with no projects, and `/api/health` returning 503 is the only signal. (Task 1 test: unreadable CA path raises at client construction, not at query time.)
- **Local development must keep working with no CA and no SSL.** Developers run with `DATABASE_URL` unset or pointed at a local Postgres. Adding SSL must not make the local path require certificates. (Task 1 test: no `ssl` key when the variable is absent.)
- **The test subdomain is not in the middleware's host list.** `PUBLIC_HOST` matches only `michaeljportfolio.me` and `*.up.railway.app`, so `aws.michaeljportfolio.me` falls through `middleware()` and gets no HTTPS redirect. Nginx must own the redirect, and the regex must be fixed before any future cutover. (Task 2 tests.)
- **The instance must survive a reboot unattended.** Railway restarted the app invisibly. Section 10 requires a reboot test, and nothing restarts `next start` unless a systemd unit is enabled. (Task 6 verification; Task 8 reboot test.)

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/db/client.ts` | Add `sslOptionsFrom(env)`; thread SSL into the `Pool` | 1 |
| `tests/unit/db-client.test.ts` | Extend with SSL cases | 1 |
| `src/middleware.ts` | Add the AWS test subdomain to `PUBLIC_HOST` | 2 |
| `tests/unit/middleware.test.ts` | Extend with the subdomain case | 2 |
| `package.json` | Add the `engines` field | 2 |
| `deploy/career-platform.service` | systemd unit: run `next start`, restart on failure, load env file | 2 |
| `deploy/nginx-aws.conf` | Nginx site: TLS, HTTP→HTTPS redirect, proxy to `127.0.0.1:3000` | 2 |
| `deploy/deploy.sh` | Pull, `npm ci`, build, **migrate only**, restart the unit | 2 |
| `deploy/README.md` | What each file is and where it lands on the instance | 2 |
| `migration-notes.md` | Running log; every deviation recorded | all |

---

## Task 1: Teach the database client to use TLS

**Files:**
- Modify: `src/db/client.ts`
- Test: `tests/unit/db-client.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `createDbClient(connectionString: string, env?: NodeJS.ProcessEnv): DbClient` — unchanged first parameter, new optional second defaulting to `process.env`. `sslOptionsFrom(env: NodeJS.ProcessEnv): { ca: string; rejectUnauthorized: true } | undefined`, exported for tests. Task 6 relies on `DATABASE_CA_CERT_PATH` being the variable name.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { createDbClient, sslOptionsFrom } from "@/db/client";

const UNREACHABLE = "postgresql://user:pass@127.0.0.1:1/none";

describe("sslOptionsFrom", () => {
  it("returns undefined when no CA path is configured", () => {
    expect(sslOptionsFrom({})).toBeUndefined();
  });

  it("reads the CA file and demands verification when a path is set", () => {
    const options = sslOptionsFrom({ DATABASE_CA_CERT_PATH: "tests/fixtures/fake-ca.pem" });
    expect(options?.rejectUnauthorized).toBe(true);
    expect(options?.ca).toContain("BEGIN CERTIFICATE");
  });

  it("throws immediately when the CA path is set but unreadable", () => {
    expect(() => sslOptionsFrom({ DATABASE_CA_CERT_PATH: "no/such/ca.pem" })).toThrow(/DATABASE_CA_CERT_PATH/);
  });
});

describe("createDbClient SSL wiring", () => {
  it("leaves ssl unset for local development", async () => {
    const client = createDbClient(UNREACHABLE, {});
    const options = (client.pool as unknown as { options: Record<string, unknown> }).options;
    expect(options.ssl).toBeUndefined();
    await client.close();
  });

  it("passes the CA through to the pool", async () => {
    const client = createDbClient(UNREACHABLE, { DATABASE_CA_CERT_PATH: "tests/fixtures/fake-ca.pem" });
    const options = (client.pool as unknown as { options: { ssl?: { rejectUnauthorized: boolean } } }).options;
    expect(options.ssl?.rejectUnauthorized).toBe(true);
    await client.close();
  });
});
```

Create `tests/fixtures/fake-ca.pem` containing a syntactically valid PEM block (any self-signed certificate text; it is never used to connect).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/db-client.test.ts`
Expected: FAIL — `sslOptionsFrom` is not exported.

- [ ] **Step 3: Implement `sslOptionsFrom` and thread it into `createDbClient` in `src/db/client.ts`**

Read the file with `fs.readFileSync(path, "utf8")`. On `ENOENT` (or any read error), rethrow with a message naming `DATABASE_CA_CERT_PATH` and the path, so a misconfiguration fails at startup rather than degrading into the snapshot fallback. Spread the result into the `Pool` options only when defined, so the local path keeps today's exact behaviour.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/db-client.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the whole suite to confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS — the existing `createDbClient` tests still pass unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/db/client.ts tests/unit/db-client.test.ts tests/fixtures/fake-ca.pem
git commit -m "feat(db): support CA-verified TLS for RDS connections"
```

---

## Task 2: Repository-side deployment assets

**Files:**
- Modify: `src/middleware.ts`, `package.json`
- Create: `deploy/career-platform.service`, `deploy/nginx-aws.conf`, `deploy/deploy.sh`, `deploy/README.md`
- Test: `tests/unit/middleware.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the systemd unit `career-platform.service`, which reads `/etc/career-platform.env` and is installed in Task 6. `deploy/deploy.sh` is for *subsequent* deploys — the first build (Task 6 Step 7) runs before the database is restored, so it cannot include the migrate-and-restart steps that `deploy.sh` performs.

- [ ] **Step 1: Write the failing middleware test**

```ts
it("redirects plain HTTP on the AWS test subdomain to HTTPS", () => {
  const response = middleware(request("http://aws.michaeljportfolio.me/privacy", { host: "aws.michaeljportfolio.me", "x-forwarded-proto": "http" }));
  expect(response.status).toBe(308);
  expect(response.headers.get("location")).toBe("https://aws.michaeljportfolio.me/privacy");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/middleware.test.ts`
Expected: FAIL — the response is `next()`, not a 308.

- [ ] **Step 3: Extend `PUBLIC_HOST` in `src/middleware.ts` to match the `aws.` subdomain**

Keep `healthcheck.railway.app` and `localhost` excluded. Nginx will also redirect, so this is defence in depth and a prerequisite for cutover, not the mechanism relied on in Task 8.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/middleware.test.ts`
Expected: PASS — including the three pre-existing cases.

- [ ] **Step 5: Add the `engines` field to `package.json`**

`"engines": { "node": ">=22 <23" }` — the repo currently states no Node requirement, so nothing catches a wrong version on the instance.

- [ ] **Step 6: Write `deploy/career-platform.service`**

A systemd unit running `npm run start` as a non-root user from the app directory, `Restart=on-failure`, `RestartSec=5`, `EnvironmentFile=/etc/career-platform.env`, `After=network-online.target`, and `WantedBy=multi-user.target` so it survives reboot.

- [ ] **Step 7: Write `deploy/nginx-aws.conf`**

Two servers: port 80 redirecting everything to HTTPS, and port 443 with the certbot certificate paths, proxying to `http://127.0.0.1:3000` with `proxy_set_header Host`, `X-Forwarded-Proto $scheme`, `X-Forwarded-Host`, and `X-Forwarded-For`. The forwarded-proto header matters: `src/middleware.ts` reads it to decide whether to redirect.

- [ ] **Step 8: Write `deploy/deploy.sh`**

`set -euo pipefail`; `git pull`; `npm ci`; `npm run build`; `npm run db:migrate`; `sudo systemctl restart career-platform`. Add a comment stating that `db:seed` and `db:move-rows` must never appear in this file and why.

- [ ] **Step 9: Write `deploy/README.md`**

One table: each file, where it is copied to on the instance, and the command that installs it.

- [ ] **Step 10: Run the whole suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/middleware.ts tests/unit/middleware.test.ts package.json deploy/
git commit -m "feat(deploy): add systemd, nginx and deploy assets; pin node; cover aws subdomain"
```

---

## Task 3: Security groups

Two groups, created before anything that references them. The database group's rule points at the web group, so the database is reachable only from the instance.

- [ ] **Step 1: Find the caller's public address**

Run: `curl -s https://checkip.amazonaws.com`
Record it; the SSH rule is restricted to this `/32`.

- [ ] **Step 2: Create the web security group**

```bash
"$AWS" ec2 create-security-group $P --group-name career-platform-web \
  --description "EC2 web tier for career-platform" --vpc-id vpc-04969f461407cebb2
```
Expected: a `GroupId`. Record it.

- [ ] **Step 3: Authorise 22 from your address only, and 80/443 from anywhere**

Three `authorize-security-group-ingress` calls. Port 22 uses `<your-ip>/32`. Ports 80 and 443 use `0.0.0.0/0`. **No rule for 3000** — the app is reachable only through Nginx on the loopback interface.

- [ ] **Step 4: Create the database security group**

```bash
"$AWS" ec2 create-security-group $P --group-name career-platform-db \
  --description "RDS tier for career-platform" --vpc-id vpc-04969f461407cebb2
```

- [ ] **Step 5: Allow 5432 only from the web group**

Use `--source-group` (the web group's id), not a CIDR. This is the control that makes the database private in practice.

- [ ] **Step 6: Verify both groups**

Run: `"$AWS" ec2 describe-security-groups $P --filters Name=group-name,Values=career-platform-web,career-platform-db --query 'SecurityGroups[].{Name:GroupName,Id:GroupId,In:IpPermissions}'`
Expected: web shows 22/80/443 with 22 scoped to one `/32`; db shows a single 5432 rule whose source is the web group id and **no** `IpRanges` entry.

- [ ] **Step 7: Record both group ids in `migration-notes.md`**

---

## Task 4: Create the RDS database

**Interfaces:**
- Consumes: the database security group id from Task 3.
- Produces: the RDS endpoint hostname, used by Tasks 6 and 7 in `DATABASE_URL`.

- [ ] **Step 1: Choose the engine version**

Run: `"$AWS" rds describe-db-engine-versions $P --engine postgres --query 'DBEngineVersions[?starts_with(EngineVersion,`18.`)].EngineVersion' --output text`
Pick the newest 18.x. Railway is 18.6, and the restore target must be the same major or newer.

- [ ] **Step 2: Confirm a DB subnet group exists**

Run: `"$AWS" rds describe-db-subnet-groups $P --query 'DBSubnetGroups[].DBSubnetGroupName' --output text`
If none, create one spanning at least two default-VPC subnets with `rds:CreateDBSubnetGroup` (the policy allows it).

- [ ] **Step 3: Generate the master password and store it outside Git**

Generate 32 random characters. Write it to the user's password manager. It is passed to the create call via `--master-user-password` read from a shell variable, never echoed.

- [ ] **Step 4: Create the instance**

```bash
"$AWS" rds create-db-instance $P \
  --db-instance-identifier career-platform-db \
  --db-instance-class db.t3.micro \
  --engine postgres --engine-version <from step 1> \
  --master-username postgres --master-user-password "$PGPW" \
  --allocated-storage 20 --storage-type gp3 --storage-encrypted \
  --no-multi-az --no-publicly-accessible \
  --backup-retention-period 7 \
  --db-subnet-group-name <from step 2> \
  --vpc-security-group-ids <db group id>
```

Every one of `--storage-encrypted`, `--no-publicly-accessible`, `--no-multi-az` and the instance class is passed explicitly. Three of the policy's denies use `IfExists` conditions, so an omitted key means the fence does not fire — the policy is not a safety net for an omission.

- [ ] **Step 5: Wait for it to become available**

Run: `"$AWS" rds wait db-instance-available $P --db-instance-identifier career-platform-db`
Expected: returns after roughly 5–10 minutes.

- [ ] **Step 6: Verify the settings against the spec**

Run: `"$AWS" rds describe-db-instances $P --db-instance-identifier career-platform-db --query 'DBInstances[0].{Class:DBInstanceClass,MultiAZ:MultiAZ,Storage:AllocatedStorage,Encrypted:StorageEncrypted,Public:PubliclyAccessible,Retention:BackupRetentionPeriod,Endpoint:Endpoint.Address,Version:EngineVersion}'`
Expected: `db.t3.micro`, `MultiAZ: false`, `20`, `Encrypted: true`, `Public: false`, `Retention: 7`. Record the endpoint.

- [ ] **Step 7: Record the endpoint and settings in `migration-notes.md`**

---

## Task 5: Create the EC2 instance

**Interfaces:**
- Consumes: the web security group id from Task 3.
- Produces: the instance id and the Elastic IP, used by Tasks 6 and 8.

- [ ] **Step 1: Generate the keypair locally**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/career-platform-aws -C career-platform-aws -N ""
```
The private key stays at `~/.ssh/career-platform-aws` and never enters Git.

- [ ] **Step 2: Import only the public half**

```bash
"$AWS" ec2 import-key-pair $P --key-name career-platform-aws \
  --public-key-material "fileb://$HOME/.ssh/career-platform-aws.pub"
```
`ec2:CreateKeyPair` is deliberately not granted, so import is the only path.

- [ ] **Step 3: Pick a public subnet in the default VPC**

Run: `"$AWS" ec2 describe-subnets $P --filters Name=vpc-id,Values=vpc-04969f461407cebb2 Name=map-public-ip-on-launch,Values=true --query 'Subnets[].{Id:SubnetId,AZ:AvailabilityZone}'`
Record one subnet id.

- [ ] **Step 4: Launch the instance**

```bash
"$AWS" ec2 run-instances $P \
  --image-id ami-0bfc5cae5711ffac8 --instance-type t3.micro --count 1 \
  --key-name career-platform-aws \
  --security-group-ids <web group id> --subnet-id <from step 3> \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3","Encrypted":true,"DeleteOnTermination":true}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=career-platform}]'
```

`HttpTokens=required` is mandatory — `RequireIMDSv2AtLaunch` denies the call without it. This was proven by dry run on 2026-11-03.

- [ ] **Step 5: Wait for it to be running, then allocate and attach an Elastic IP**

`ec2 wait instance-running`, then `allocate-address --domain vpc`, then `associate-address`. The fixed address is what the `aws` DNS record will point at, and it survives stop/start.

- [ ] **Step 6: Compare the SSH host key with the console output before connecting**

Run: `"$AWS" ec2 get-console-output $P --instance-id <id> --output text | grep -A6 "BEGIN SSH HOST KEY FINGERPRINTS"`
Compare against the fingerprint `ssh` shows on first connection. This is the only defence against connecting to the wrong host; do not type `yes` before comparing.

- [ ] **Step 7: Verify the instance against the spec**

Run: `"$AWS" ec2 describe-instances $P --instance-ids <id> --query 'Reservations[0].Instances[0].{Type:InstanceType,IMDS:MetadataOptions.HttpTokens,SG:SecurityGroups,Vol:BlockDeviceMappings,IP:PublicIpAddress}'`
Expected: `t3.micro`, `HttpTokens: required`, the web group only.

- [ ] **Step 8: Record the instance id and Elastic IP in `migration-notes.md`**

---

## Task 6: Provision the server

All steps run over SSH on the instance unless stated.

- [ ] **Step 1: Add 2 GB of swap**

`fallocate`, `chmod 600`, `mkswap`, `swapon`, and an `/etc/fstab` entry so it survives reboot.
Verify: `free -h` shows 2.0Gi of swap.

Without this, `next build` is killed by the kernel on a 1 GB instance and leaves a half-written `.next`.

- [ ] **Step 2: Install Node 22, Nginx, certbot and the PostgreSQL 18 client**

Ubuntu 26.04 ships the PostgreSQL 18 client, which the Task 7 restore needs.
Verify: `node --version` reports v22.x; `pg_restore --version` reports 18.x.

- [ ] **Step 3: Clone the repository on the `aws-migration` branch**

Into `/opt/career-platform`, owned by a non-root user.

- [ ] **Step 4: Download the RDS CA bundle**

Fetch the `us-east-1` bundle from AWS's public trust-store URL to `/etc/rds-ca.pem`. Task 1's `DATABASE_CA_CERT_PATH` points here.

- [ ] **Step 5: Write `/etc/career-platform.env`, chmod 600, root-owned**

Contains `DATABASE_URL` (RDS endpoint, `sslmode=verify-full`), `DATABASE_CA_CERT_PATH=/etc/rds-ca.pem`, `NODE_ENV=production`, `PORT=3000`. This file is the only place the database password exists on the instance.

- [ ] **Step 6: Install the systemd unit and enable it**

Copy `deploy/career-platform.service` to `/etc/systemd/system/`, then `daemon-reload` and `enable`. Do not start it yet — the database is still empty.

- [ ] **Step 7: Build the app**

Run: `cd /opt/career-platform && npm ci && npm run build`
Expected: completes in 3–8 minutes. If the kernel kills it, confirm swap is active; the agreed fallback is resizing to `t3.small` (stop, `modify-instance-attribute`, start).

- [ ] **Step 8: Record build wall time and peak memory in `migration-notes.md`**

---

## Task 7: Restore the data into RDS

**Interfaces:**
- Consumes: the RDS endpoint (Task 4), a provisioned instance (Task 6).

- [ ] **Step 1: Copy the dump to the instance**

```bash
scp -i ~/.ssh/career-platform-aws \
  "/c/Users/mjjoh/OneDrive/career-platform-backups/railway-20261103-1409.dump" \
  ubuntu@<elastic-ip>:/tmp/
```

- [ ] **Step 2: Verify the dump survived the copy**

Run `sha256sum` on the instance and compare the first 32 characters against `03849f47575780415bed9ee33f6380f7`.
Expected: identical. A truncated dump that restores partially is worse than one that fails outright.

- [ ] **Step 3: Confirm the target database is empty**

Run: `psql "$DATABASE_URL" -tAc "select count(*) from information_schema.tables where table_schema='public'"`
Expected: `0`. If not, stop — something has already written to it.

This also proves TLS works end to end. If it fails with an SSL or `pg_hba.conf` error, the cause is Task 1's configuration or the CA path, not the security group.

- [ ] **Step 4: Restore**

```bash
pg_restore --no-owner --no-privileges -d "$DATABASE_URL" /tmp/railway-20261103-1409.dump
```
Expected: exit 0.

- [ ] **Step 5: Verify the row counts match the backup exactly**

Expected, per table: `contacts` 1, `education` 1, `experience_highlights` 8, `experiences` 2, `profiles` 1, `project_highlights` 9, `project_links` 4, `project_media` 0, `project_technologies` 16, `projects` 3, `resume_metadata` 1, `skill_groups` 3, `skill_items` 20. **Total 69.**

- [ ] **Step 6: Confirm the three project slugs are present**

Expected: `datathon-ems-dispatch`, `llm-manager`, `michaeljportfolio-me`. The third exists only in the database and is the one at risk from `db:seed`.

- [ ] **Step 7: Run migrations — and only migrations**

Run: `cd /opt/career-platform && npm run db:migrate`
Expected: no pending migrations, data untouched. **Do not run `npm run db:seed`.**

- [ ] **Step 8: Re-run the Step 5 count**

Expected: still 69. This catches a migration that unexpectedly rewrote data.

- [ ] **Step 9: Start the app**

Run: `sudo systemctl start career-platform && systemctl is-active career-platform`
Expected: `active`.

- [ ] **Step 10: Check health locally on the instance**

Run: `curl -s localhost:3000/api/health`
Expected: `{"status":"ok","source":"database",...}` with HTTP 200. `source` must be `database`, not `snapshot` — `snapshot` means the app could not read RDS and is silently degrading.

- [ ] **Step 11: Delete the dump from `/tmp` and record results**

---

## Task 8: Verify at the test subdomain

- [ ] **Step 1: Create the Cloudflare DNS record**

An `A` record named `aws` pointing at the Elastic IP, **DNS only** (grey cloud). Do not touch the apex record or any mail record. The user performs this step in the Cloudflare dashboard.

- [ ] **Step 2: Confirm it resolves to the Elastic IP**

Run: `nslookup aws.michaeljportfolio.me 1.1.1.1`
Expected: the Elastic IP, not a Cloudflare proxy address.

- [ ] **Step 3: Install the Nginx site and obtain a certificate**

Copy `deploy/nginx-aws.conf` into `/etc/nginx/sites-available/`, symlink it, `nginx -t`, reload, then run certbot for `aws.michaeljportfolio.me`. HTTP-01 validation works because the record is DNS-only.

- [ ] **Step 4: Verify HTTPS and the redirect**

Run: `curl -sI http://aws.michaeljportfolio.me/` → expect a 301/308 to `https://`.
Run: `curl -sI https://aws.michaeljportfolio.me/` → expect 200 with a valid certificate.

- [ ] **Step 5: Verify the content matches production**

- `/api/health` returns 200 with `"source":"database"`
- `/` contains all three project titles, including `michaeljportfolio.me — this site`
- `/privacy` returns 200
- `/michael-johnson-resume.pdf` downloads and is 91,150 bytes

- [ ] **Step 6: Prove writes persist across an app restart**

Insert a test row, `systemctl restart career-platform`, confirm the row is still there. Record the row's identity so Step 9 can remove it.

- [ ] **Step 7: Reboot the instance and confirm everything returns unattended**

Run: `sudo reboot`, wait, then re-check `/api/health`, `systemctl is-active career-platform nginx`, and `free -h` for swap.
Expected: all three recover with no manual intervention. This is the test that fails if the systemd unit was never enabled.

- [ ] **Step 8: Confirm certificate renewal works**

Run: `sudo certbot renew --dry-run`
Expected: success.

- [ ] **Step 9: Confirm the security posture and clean up the test row**

- SSH refused from an address other than yours
- The RDS endpoint is unreachable from the laptop (it is private)
- Instance is `t3.micro`, database is `db.t3.micro`, both 20 GB and encrypted
- Delete the test row from Step 6

- [ ] **Step 10: Record every check with its evidence in `migration-notes.md`, marking anything unverified**

- [ ] **Step 11: Commit the notes**

```bash
git add migration-notes.md
git commit -m "docs: record AWS build and verification evidence"
```

---

## Out of scope

Guide section 11 (cutover) and section 12 (recording what was built) are deliberately excluded, by the decision recorded in `migration-notes.md` § Section 6: build and verify only, with Railway serving production throughout. Reconciling the `michaeljportfolio-me` project into `src/content/profile.ts` is likewise deferred until after the migration.

Resources created by this plan bill from the moment they exist. If the project pauses for more than a few days, release the Elastic IP and delete the RDS instance with a final snapshot — stopped RDS instances restart themselves after seven days.
