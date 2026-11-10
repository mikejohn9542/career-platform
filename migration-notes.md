# Railway → AWS migration notes

Log of decisions, deviations, and evidence. Started 2026-11-03.

## Section 1 — Architecture decision

**Chosen:** EC2 (t3.micro, us-east-1) running the app + Single-AZ RDS PostgreSQL 18 (db.t3.micro, private).

> I chose EC2 + Single-AZ RDS over EC2 with local PostgreSQL because my top priority is
> least to operate, and I accept a second billable service at roughly $27/month instead
> of $13, and one more resource to provision.

Rejected, with reasons:

| Option | Why not |
| --- | --- |
| EC2 + local PostgreSQL | ~$13/mo, but app and DB share one failure domain and backups become manual. Also conflicts with section 8's "no PostgreSQL on the instance". |
| Lambda + API Gateway + RDS | `next start` needs an adapter; the module-level `pg.Pool` (max 5) multiplies across warm containers against db.t3.micro's ~112 connection ceiling; `force-dynamic` on every route means near-100% cold starts at this traffic level. Decisively, the `ISBA4775EC2Migration` policy allows only EC2, IAM, RDS, SSM and STS — Lambda and API Gateway cannot be provisioned as `isba-student`. |

Request path:

```
Browser → Cloudflare DNS (A → Elastic IP)
        → EC2 t3.micro, public subnet [:443 Nginx, TLS]
        → Nginx reverse proxy → next start on :3000 (localhost only)
        → pg.Pool (max 5) → RDS db.t3.micro, private, Single-AZ [:5432]
                             ← SG allows 5432 only from the EC2 SG
```

## Section 2 — Backup and tested restore

| Item | Value |
| --- | --- |
| Backup taken | 2026-11-03 14:09 PT |
| Source | Railway project `vivacious-happiness`, service `Postgres`, env `production` |
| Source version | PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) |
| Route | `railway connect Postgres --tunnel-only` (no TCP proxy enabled, no public exposure created) |
| Command | `pg_dump --format=custom --no-owner --no-privileges` |
| Client version | pg_dump 18.6 (local Windows install) |
| Artifact | `C:\Users\mjjoh\OneDrive\career-platform-backups\railway-20261103-1409.dump` |
| Size | 36,528 bytes (source DB 8,646 kB) |
| SHA-256 (first 32) | `03849f47575780415bed9ee33f6380f7…` |
| Location properties | Outside the Git repo; OneDrive-synced for an off-machine copy |
| Restore target | local `career_platform_restore`, PostgreSQL 18.6 |
| Restore verified | 2026-11-03 14:11 PT |
| Cold restore time | 1.03 s (createdb + pg_restore + verify query) |

Versions align end to end: Railway 18.6 → local client 18.6 → RDS 18 (section 7) → Ubuntu 26.04
client (section 8). No cross-version restore risk.

### Verification evidence

All 13 tables matched the live database exactly, 69 rows total:

| Table | Live | Restored | | Table | Live | Restored |
| --- | --- | --- | --- | --- | --- | --- |
| contacts | 1 | 1 | | project_media | 0 | 0 |
| education | 1 | 1 | | project_technologies | 16 | 16 |
| experience_highlights | 8 | 8 | | projects | 3 | 3 |
| experiences | 2 | 2 | | resume_metadata | 1 | 1 |
| profiles | 1 | 1 | | skill_groups | 3 | 3 |
| project_highlights | 9 | 9 | | skill_items | 20 | 20 |
| project_links | 4 | 4 | | **TOTAL** | **69** | **69** |

Beyond row counts, the app was booted against the restored database:

- `GET /api/health` → `200 {"status":"ok","source":"database"}`
- `GET /` → 200, 139,916 bytes, all three project titles present in the HTML

That is the stronger check: it proves the restored rows satisfy the Zod schema the pages read
through, which counts alone do not.

### Finding: production contains content not in the repo

The live database has a third published project, `michaeljportfolio-me`
("michaeljportfolio.me — this site"), plus its 6 technologies, 4 highlights and 2 links, and one
skill item — none of which exist in `src/content/profile.ts`, which declares only
`datathon-ems-dispatch` and `llm-manager`.

Consequences:

1. The backup captured it. It is not at risk from the migration itself.
2. **`npm run db:seed` must never be run against Railway or RDS.** `seedProfile()` opens with
   `tx.delete(profiles)` and rebuilds every table from `profile.ts`, which would destroy this
   project. This is section 9's warning, made concrete.
3. The build-time snapshot (`src/generated/profile-snapshot.json`, gitignored, generated from
   `profile.ts`) therefore does not represent production. It only matters in the degraded path,
   where the projects list is emptied entirely and labelled, so no wrong content is served — but
   the drift should be reconciled at some point.

### Backup frequency, retention, RPO and RTO

PROPOSED — confirm before this is treated as settled:

| Item | Proposal | Basis |
| --- | --- | --- |
| Frequency | Logical dump before and after each migration step; thereafter after every content publish | The DB has no runtime write path — `src/db/repository.ts` exposes only `seedProfile`, called from scripts. Data changes only on a deliberate publish, so time-based backups protect against almost nothing that a publish-triggered dump does not. |
| Retention | Keep every migration-window dump until 7 days post-cutover; then the 3 most recent | Dumps are ~36 KB. Retention costs nothing. |
| RPO | One content publish (effectively zero for migration purposes) | Nothing else writes. |
| RTO | 30 minutes | Restore itself is ~1 s. The number is dominated by standing up a replacement database (~10 min for RDS) plus DNS. |

Also recommended: enable Railway PITR on the Backups tab now, since its restore window only
begins after the first base backup. That covers the window before cutover at no effort.

## Cleanup owed

- [ ] Revoke the Railway SSH key (`isba4775-azure`) after cutover — registered 2026-11-03 to open the tunnel
- [ ] Update `src/middleware.ts` `PUBLIC_HOST` before cutover; it matches only `michaeljportfolio.me` and `*.up.railway.app`, so `aws.michaeljportfolio.me` falls through
- [ ] Local `career_platform_restore` database and the PostgreSQL 18 install are laptop-only; drop when finished

## Sections 3–4 — IAM user and CLI connection

| Item | Value |
| --- | --- |
| Date | 2026-11-03 |
| IAM user | `isba-student`, console access + MFA (authenticator app) |
| Initial policies | `SignInLocalDevelopmentAccess`, `AmazonEC2ReadOnlyAccess` (attached directly, not via group) |
| Access keys | None created — browser-based `aws login` only |
| AWS CLI | aws-cli/2.39.3 (installed via winget; minimum required 2.35.0) |
| Profile | `isba-4775`, region `us-east-1` |
| Account | `<AWS-ACCOUNT-ID>` |
| ARN | `arn:aws:iam::<AWS-ACCOUNT-ID>:user/isba-student` — confirmed not `:root` |
| Default VPC | `vpc-04969f461407cebb2` |
| Agent Toolkit | Installed; 24 AWS skills loaded |

Permission boundary verified before section 5:

| Check | Result | Expected? |
| --- | --- | --- |
| `ec2 describe-instances` | OK, 0 reservations | yes |
| `ec2 describe-vpcs` | OK | yes |
| `rds describe-db-instances` | AccessDenied | yes |
| `iam list-users` | AccessDenied | yes |
| `ec2 create-security-group` (dry run) | UnauthorizedOperation | yes |

Deviations / environment notes:

- The `aws-mcp` MCP server fails to connect (`CONNECTION_CLOSED`). The 24 skills loaded fine.
  Unresolved; the MCP server is only a secondary lookup path, so it is not blocking.
- Claude Code's Bash shell does not pick up the machine PATH change, so `aws` is invoked at
  `C:\Program Files\Amazon\AWSCLIV2\aws.exe`. Cosmetic.
- PostgreSQL 18.6 and AWS CLI were both installed on the laptop today; both are local-only and
  belong in final cleanup if desired.

## Section 5 — Deployment policy review (before creation)

`ISBA4775EC2Migration`, 12 statements: 4 Allow, 8 Deny. Reviewed from
`guides/aws-ec2-deployment-policy.json`.

**Allows (the grant)**

| Sid | What it permits |
| --- | --- |
| `CourseEC2AndRDSOperationsInNorthernVirginia` | 37 actions: 22 EC2 + 15 RDS, fenced to `aws:RequestedRegion = us-east-1` |
| `AllowRDSServiceLinkedRole` | `iam:CreateServiceLinkedRole`, only for `rds.amazonaws.com` |
| `AllowUbuntuImageLookup` | `ssm:GetParameter*`, only under `/aws/service/canonical/*` |
| `AllowDecodingDenials` | `sts:DecodeAuthorizationMessage` — lets the agent read why a request was refused |

**Denies (the fences; a deny always wins)**

| Sid | Effect on us |
| --- | --- |
| `DenyOtherLaunchSizes` | Instance must be `t3.micro` or `t3.small` |
| `RequireIMDSv2AtLaunch` | `RunInstances` must set `MetadataHttpTokens=required` explicitly, or it is denied |
| `DenyOtherDatabaseClasses` | DB must be `db.t3.micro` or `db.t4g.micro` |
| `DenyMultiAZ` | Single-AZ only |
| `DenyLargeStorage` | DB storage must be ≤ 20 GB |
| `DenyUnencryptedDatabase` | DB must be encrypted at create |
| `DenyPublicDatabaseAtCreate` | DB cannot be publicly accessible at create or restore |
| `DenyMakingDatabasePublic` | Nor made public later via `ModifyDBInstance` |

**Notes worth carrying into sections 7 and 8**

1. `ec2:CreateKeyPair` is **absent**; `ec2:ImportKeyPair` is present. The keypair must be generated
   locally with `ssh-keygen` and only the public half imported, so the private key never leaves the
   laptop. This is deliberate, per the guide.
2. Several denies use `IfExists` variants (`StringNotEqualsIfExists` on DatabaseClass,
   `BoolIfExists` on StorageEncrypted and PubliclyAccessible). If a request omits the key entirely,
   the deny does not fire. So set `--storage-encrypted`, `--no-publicly-accessible` and the class
   explicitly rather than relying on RDS defaults — do not treat the policy as a safety net that
   catches an omission.
3. `DenyUnencryptedDatabase` covers only `rds:CreateDBInstance`, not the two restore actions. A
   snapshot restore could therefore produce an unencrypted instance. Not our path — we restore with
   `pg_restore`, not from a snapshot — but worth knowing.
4. The grant includes destructive actions (`TerminateInstances`, `DeleteDBInstance`, `DeleteVolume`,
   `DeleteSecurityGroup`, `ReleaseAddress`) against **any** resource in us-east-1, not only
   course ones. The guide states this. Acceptable here because the account holds nothing else.
5. No Lambda or API Gateway actions anywhere in the policy — confirming the section 1 finding that
   the serverless option could not have been provisioned as `isba-student`.

### Section 5 — attached and verified live (2026-11-03)

`ISBA4775EC2Migration` created as root and attached to `isba-student`. Console permissions
summary matched the guide's checklist: explicit deny on EC2 + RDS; allow on EC2, IAM, RDS,
Systems Manager, STS, with `aws:RequestedRegion = us-east-1` on EC2 and RDS and
`iam:AWSServiceName = rds.amazonaws.com` on IAM.

Boundary re-tested from the CLI after attaching:

| Check | Before | After |
| --- | --- | --- |
| `rds describe-db-instances` | AccessDenied | OK, 0 instances |
| `ec2 create-security-group` (dry run) | UnauthorizedOperation | DryRunOperation (would succeed) |
| `ssm get-parameters-by-path` under `/aws/service/canonical/` | n/a | OK |
| `ssm get-parameter` for Amazon Linux AMI | n/a | AccessDenied (correctly out of scope) |
| `iam list-users` | AccessDenied | AccessDenied (never granted) |

Decoded the pre-policy denial with `sts:DecodeAuthorizationMessage`:
`CreateSecurityGroup`, `allowed=False`, `explicitDeny=False`, `matchedStatements=[]` — an implicit
deny from having no grant, not a fence.

Fences proven to fire, via `ec2 run-instances --dry-run`:

| Attempt | Outcome |
| --- | --- |
| `t3.large`, IMDSv2 required | DENIED — `DenyOtherLaunchSizes`, explicitDeny=true |
| `t3.micro`, `HttpTokens=optional` | DENIED — `RequireIMDSv2AtLaunch`, explicitDeny=true |
| `t3.micro`, `HttpTokens=required` | ALLOWED — would have succeeded |

Facts for later sections:

- Ubuntu 26.04 LTS AMI (us-east-1, amd64, ebs-gp3): `ami-0bfc5cae5711ffac8`
- SSM parameter: `/aws/service/canonical/ubuntu/server/26.04/stable/current/amd64/hvm/ebs-gp3/ami-id`
- Default VPC: `vpc-04969f461407cebb2`
- Shell note: Git Bash rewrites leading-slash SSM paths into Windows paths. Export
  `MSYS_NO_PATHCONV=1` for any AWS command taking a `/aws/service/...` argument.

## Section 6 — Plan and cost estimate (2026-11-03)

Branch `aws-migration` created. Plan written to `docs/aws-migration-plan.md`. Nothing created in AWS.

Interview decisions:

| Question | Answer |
| --- | --- |
| Build location | `t3.micro` + 2 GB swap; accept 3–8 minute builds; resize to `t3.small` only if builds prove painful |
| Third project missing from `profile.ts` | Defer until after the migration; never run `db:seed` |
| Scope today | Build and verify at `aws.michaeljportfolio.me`; no cutover |

Cost estimate, us-east-1:

| Component | Monthly | Source |
| --- | --- | --- |
| EC2 t3.micro | $7.59 | VERIFIED live: $0.0104/hr x 730 |
| EBS gp3 20 GB | ~$1.60 | from memory, unverified |
| Public IPv4 (Elastic IP, in use) | ~$3.65 | from memory, unverified |
| RDS db.t3.micro PostgreSQL Single-AZ | ~$13.14 | from memory, unverified |
| RDS gp3 storage 20 GB | ~$2.30 | from memory, unverified |
| Automated backups | $0 | free up to provisioned storage; DB is 8.6 MB |
| Data transfer out | $0 | under the 100 GB/month free allowance |
| **Total** | **~$28** | guide predicts ~$26 |

$100 of credits at ~$28/month is roughly 3.5 months. Still to do: confirm the unverified rows at
https://calculator.aws/ . The `isba-student` user cannot read credits or billing; only the account
owner's session shows the remaining balance.

Pricing method note: the AWS Pricing API is not in the `ISBA4775EC2Migration` policy
(`AccessDeniedException` on `pricing:GetProducts`), and the `aws-mcp` MCP server failed to connect,
so live figures came from the public pricing feed at `b0.p.awsstatic.com`. The EC2 feed resolved;
the RDS, EBS and VPC feed paths did not, hence the mixed sourcing above.

Facts for section 8: a public IPv4 address bills while attached AND while idle. Release it if the
instance is ever stopped for cost reasons.

## Section 7-8 build log (2026-11-03)

### Task 3 — Security groups

| Group | Id | Ingress |
| --- | --- | --- |
| `career-platform-web` | `sg-0e6c12e122022fe7a` | 22 from <OPERATOR-IP>/32; 80 and 443 from 0.0.0.0/0 |
| `career-platform-db` | `sg-076cfdca9bfa54b81` | 5432 from `sg-0e6c12e122022fe7a` only |

Verified: the database group has **no CIDR source at all** on 5432, so Postgres is reachable only
from the application instance — not from the internet and not from the laptop. No rule exists for
port 3000; the app is reachable only through Nginx on the loopback interface.

Note: the SSH rule pins the operator's current home address. If that address changes, SSH stops
working and the rule must be updated — this is expected, not a fault.

### Task 4 — RDS database

| Setting | Value | Matches guide section 7? |
| --- | --- | --- |
| Identifier | `career-platform-db` | — |
| Engine | PostgreSQL **18.6** | yes — exact match with Railway's 18.6 |
| Class | `db.t3.micro` | yes |
| Multi-AZ | false (Single-AZ) | yes |
| Storage | 20 GB gp3, encrypted, autoscaling off | yes |
| Publicly accessible | false | yes |
| Backup retention | **1 day** | **NO — guide asks for 7** |
| Subnet group | `career-platform-db-subnets` (all 6 default-VPC subnets) | — |
| Security group | `sg-076cfdca9bfa54b81` | yes |

**Deviation, needs the user's attention.** The guide specifies seven-day automated backup
retention. This account is on the AWS Free plan, which refuses it:

```
FreeTierRestrictionError: The specified backup retention period exceeds the maximum
available to free tier customers.
```

Retention of 7 and 3 were both refused; 1 was accepted. Created with 1, which keeps automated
backups **on** (0 would switch them off). The practical effect is that point-in-time recovery
reaches back 24 hours instead of 7 days. The independent logical dump from section 2 is unaffected
and remains the real recovery path, and because the application has no runtime write path, the
agreed RPO is "one content publish" rather than any number of days.

**Note on subnet placement.** The default VPC contains only public subnets (all six have
`MapPublicIpOnLaunch=true`), so the DB subnet group spans public subnets. "Not publicly
accessible" is satisfied by `--no-publicly-accessible` (no public address is assigned) together
with a security group that has zero CIDR sources — not by private subnet placement. The policy's
`DenyMakingDatabasePublic` prevents this being changed later.

### Task 5 — EC2 instance

| Setting | Value | Verified |
| --- | --- | --- |
| Instance | `i-0b9d23ee8a6ea7bb2` | — |
| AMI | `ami-0bfc5cae5711ffac8` (Ubuntu Server 26.04 LTS) | — |
| Type | `t3.micro` | PASS |
| IMDSv2 | required | PASS |
| State | running, `us-east-1a` | PASS |
| Storage | 20 GB gp3, encrypted | PASS |
| Security group | `career-platform-web` only | PASS |
| Key pair | `career-platform-aws` (ed25519) | PASS |
| Elastic IP | `34.232.68.183` (`eipalloc-0c5f1c946a21dd1d1`) | — |

The keypair was generated locally with `ssh-keygen`; only the public half was imported, because
`ec2:CreateKeyPair` is not granted by the policy. Imported fingerprint
`sBGCfGSElX2iKGw4C1CGNAy3LdyojGeFB1sztFmf2ak=` matches the local key. The private key lives at
`C:\Users\mjjoh\.ssh\career-platform-aws` and is not in Git.

The RDS master password is at `C:\Users\mjjoh\.career-platform-rds-password`, outside the repo,
with its Windows ACL restricted to the owner. **Move it into a password manager and delete that
file.** Note that `chmod 600` does not work on NTFS — it reported 644 — so `icacls` was used.

**RDS verification (Task 4 Step 6), instance available 2026-11-03:**

| Check | Value | Result |
| --- | --- | --- |
| Class | db.t3.micro | PASS |
| Multi-AZ | false | PASS |
| Storage | 20 GB | PASS |
| Encrypted | true | PASS |
| Publicly accessible | false | PASS |
| Engine version | 18.6 | PASS (matches Railway exactly) |
| Status | available | PASS |
| Backup retention | 1 day | deviation, see above |

Endpoint: `<RDS-ENDPOINT>:5432`

**Host key verification (Task 5 Step 6).** The AWS CLI cannot print console output on this
machine — it dies with `'charmap' codec can't encode character '\ufffd'`. Setting `PYTHONUTF8=1`
fixes it; without that the output looks empty when it is not. Fingerprints then matched exactly:

```
AWS console output : SHA256:02XryXlIZr68+xle7ACPooJDLE//Yrrj4FTDP2+wLuo (ED25519)
offered by 34.232.68.183: SHA256:02XryXlIZr68+xle7ACPooJDLE//Yrrj4FTDP2+wLuo
```

Added to `known_hosts` after comparing, so no blind fingerprint prompt was accepted.

Instance as found on first login: Ubuntu 26.04.1 LTS, kernel 7.0.0-1016-aws, **908 MiB RAM, 0 B
swap**, 19 GB disk with 17 GB free, no Node, **no PostgreSQL client**. The guide states Ubuntu
26.04 ships the PostgreSQL 18 client; on this AMI it is not preinstalled and must be apt-installed.

### Tasks 6-7 — Provision and restore

Installed: Node v22.23.4 (NodeSource), npm 10.9.9, nginx 1.28.3, certbot 4.0.0,
psql/pg_restore 18.6. Swap: 2 GiB at `/swapfile`, in `/etc/fstab`.

**Build:** 70 seconds, 52 MiB of swap used, 606 MiB RAM free afterwards, `.next` 73 MB. The plan
predicted 3-8 minutes; the real figure was far lower. Swap was still used, so it was not wasted.

**TLS to RDS — the predicted failure, confirmed.** An unencrypted connection is refused:

```
FATAL: no pg_hba.conf entry for host "172.31.14.34", user "postgres",
       database "postgres", no encryption
```

That is exactly the error the plan's Review Focus predicted, and it reads like a firewall problem.
With the CA bundle at `/etc/rds-ca.pem` and `sslmode=verify-full`, the connection succeeds over
**TLSv1.3 / TLS_AES_256_GCM_SHA384**. Note `rds.force_ssl` is not a recognised parameter on
PostgreSQL 18, so enforcement had to be proven by attempting `sslmode=disable` rather than read
from configuration.

**Restore:** `pg_restore` exit 0 in 355 ms. Row counts after restore, after migrations, and in the
original backup are all identical:

| | backup | restored | after `db:migrate` |
| --- | --- | --- | --- |
| total rows | 69 | 69 | 69 |
| projects | 3 | 3 | 3 |

All three slugs present: `datathon-ems-dispatch`, `llm-manager`, `michaeljportfolio-me`.
`db:seed` was never run.

**Health on the instance:** `GET /api/health` → `200 {"status":"ok","source":"database"}`.
Home page renders 55,209 bytes containing all three project titles.

**Finding fixed during the task.** The app was listening on `*:3000`, not loopback. The security
group blocks 3000 from the internet so it was not exposed, but it answered on the instance's
private address and the Nginx config comment claimed otherwise. Cause: `next start` defaults to
`0.0.0.0` and ignores `HOSTNAME` (that variable works only in standalone mode). Fixed by passing
`--hostname 127.0.0.1` in the systemd unit (commit `f6eb66a`). Verified afterwards: listener is
`127.0.0.1:3000`, and the private address refuses connections.

**Environment file note.** `DATABASE_URL` contains `&` before `sslrootcert`. systemd's
`EnvironmentFile` does not shell-parse, so it was always safe there, but sourcing the file in bash
truncated the value at the `&`. The value is now quoted so both readers handle it.

## Section 10 — Verification at the test subdomain (2026-11-05)

Scope: build and verify only. Railway served production for the whole of this section; the apex
record was never touched.

### Two blockers hit first

**The operator IP had changed** from `<OPERATOR-IP>` to a new address, so SSH timed out against the
section-8 security group rule. Replaced the single `/32` with the current address: added the new
rule, revoked the old one, and confirmed port 22 still lists exactly one source. The posture is
unchanged — one address, not a widened range.

**The AWS session had expired** overnight. On the first `aws login` the browser was signed in as
the account root, and the CLI offered to repoint the `isba-4775` profile at
`arn:aws:iam::<AWS-ACCOUNT-ID>:root`. That prompt was never answered (the command had no stdin and
exited), so nothing was overwritten. Re-authenticated as `isba-student` instead. Root was not used
at any point.

### DNS

`A` record `aws` → Elastic IP, proxy disabled. Resolves to the Elastic IP itself rather than a
Cloudflare proxy address via both `1.1.1.1` and `8.8.8.8`, which is what makes HTTP-01 validation
possible.

### Certificate

Installed `nginx-aws-bootstrap.conf` first, proved the challenge path answered from the public
internet (`/.well-known/acme-challenge/probe` → 200 from the laptop), then issued the certificate
with `certbot certonly --webroot`. Replaced it with `nginx-aws.conf`, `nginx -t` clean, reloaded.
The split-config ordering predicted in `deploy/README.md` was necessary exactly as written.

| Check | Result |
| --- | --- |
| Subject | `CN=aws.michaeljportfolio.me` |
| Issuer | Let's Encrypt |
| Valid | 2026-11-05 → 2027-02-03 |
| Trust | `curl` accepted it with no `-k`, so the chain validates against the system store |

Registered **without an email address** (`--register-unsafely-without-email`), so Let's Encrypt
has no contact address for this account and will not send expiry warnings. Renewal is automated by
the `certbot.timer` unit, so warnings are a backstop rather than the mechanism — but if automated
renewal ever breaks, nothing will tell you. Addable later with
`sudo certbot update_account --email <address>`.

### HTTPS and redirect

| Request | Result |
| --- | --- |
| `curl -sI http://aws.michaeljportfolio.me/` | `308 Permanent Redirect` |
| `curl -sIL http://aws.michaeljportfolio.me/` | 1 redirect, final `https://aws.michaeljportfolio.me/`, `200` |
| `curl -sI https://aws.michaeljportfolio.me/` | `200 OK` |

### Content, against production

| Check | AWS | Railway |
| --- | --- | --- |
| Home page size | 55,153 bytes | 55,153 bytes |
| `Datathon` | present | present |
| `LLM Manager` | present | present |
| `michaeljportfolio.me — this site` | present | present |
| `/api/health` | `200 {"status":"ok","source":"database"}` | — |
| `/privacy` | `200`, 24,592 bytes | — |
| `/michael-johnson-resume.pdf` | `200`, 91,150 bytes, `application/pdf`, starts `%PDF-` | — |

Identical page size on both hosts is the strongest single signal that the restored data renders the
same as production. `source":"database"` proves the app is reading RDS, not the bundled snapshot
fallback.

### Writes persist across an app restart

Row baseline before: 13 content tables, 69 rows (`__drizzle_migrations` excluded).

A dedicated `migration_write_test` table was used rather than inserting into a content table.
Inserting into `projects` or `project_media` would have changed what the page renders, and the
claim under test — that data lives in RDS and not in the app's own process — does not need a
content row to prove it.

Inserted one row, `systemctl restart career-platform`, row still present with its original
`created_at`, health still `200 source=database`. Table dropped afterwards; back to 13 tables and
69 rows, and `information_schema` confirms the probe table is gone.

### Reboot, unattended

`systemctl reboot`, then nothing but waiting.

| Check | Result |
| --- | --- |
| Boot id | changed (`aebe4b66…` → `58b77cad…`), so it really rebooted |
| `career-platform` | `active` |
| `nginx` | `active` |
| Both `is-enabled` | `enabled` — checked before the reboot, which is what makes the result meaningful |
| Swap | 2.0 GiB present from `/etc/fstab`, not a one-off |
| Listener | still `127.0.0.1:3000` only |
| App ready | 1,772 ms after the unit started |
| `/api/health` from the internet | `200 {"status":"ok","source":"database"}` |

During the boot window Nginx answered before the app was up, returning `502 Bad Gateway` for a few
seconds. Expected, and it cleared without intervention — but it means a reboot is not a zero-downtime
operation. Railway's rolling deploys hid this; on a single instance it is visible.

### Security posture

| Check | Result | How |
| --- | --- | --- |
| Database reachable from the laptop | No — connection timed out | TCP probe to port 5432 |
| Database has a public address | No (`PubliclyAccessible: false`) | `describe-db-instances` |
| Database only reachable from the app | Port 5432 allows one source *group*, no CIDR at all | `describe-security-groups` |
| SSH restricted | Port 22 allows exactly one `/32`, the current operator address | `describe-security-group-rules` |
| Instance | `t3.micro`, IMDSv2 `required`, 20 GB gp3, encrypted | `describe-instances`, `describe-volumes` |
| Database | `db.t3.micro`, PostgreSQL 18.6, Single-AZ, 20 GB, encrypted | `describe-db-instances` |
| Backup retention | **1 day** — free-plan ceiling, not the guide's 7 | `describe-db-instances` |

**Marked unverified:** "SSH refused from an address other than yours" was confirmed by reading the
rule — a single `/32` — not by attempting a connection from a second address, which this session
had no vantage point to do. The configuration permits no other source; that is weaker evidence
than a live refusal and is recorded as such.

**Still a deviation:** backup retention is 1 day, so the worst-case data loss from relying on
automated RDS backups alone is 24 hours rather than the 7-day window the guide asks for. The tested
logical dump in OneDrive remains the real recovery path.

### Certificate renewal

`sudo certbot renew --dry-run` → exit 0, `Congratulations, all simulated renewals succeeded`,
`no renewal failures`. The `certbot.timer` unit is active and scheduled. The renewal config records
`authenticator = webroot` with `webroot_path = /var/www/html`, which is the same path
`nginx-aws.conf` serves `/.well-known/acme-challenge/` from — so renewals keep working after the
switch to HTTPS, which the HTTP server block was written to allow.

### Section 10 result

Every check in the plan's Task 8 passed. Two things are recorded as caveats rather than passes:
the SSH restriction was verified by configuration rather than by a refused connection, and backup
retention is 1 day instead of 7.

Railway still serves production. The apex DNS record was not touched. Cutover (guide section 11) is
a separate decision and has not been made.

## Final whole-branch review and fix pass (2026-11-05)

A fresh reviewer with no part in building this read the whole branch: 2 Critical, 8 Important,
9 Minor, 9 items it declined to judge. I verified both Criticals myself before changing anything,
because a review is evidence, not a verdict.

### Critical 1 — `deploy.sh` could not complete, and had never been run

`npm run db:migrate` runs in the deploy script's own shell. The script never loaded
`/etc/career-platform.env`, and `scripts/migrate.ts` only reads `dotenv/config`, which looks for a
repo-root `.env` that is gitignored and therefore absent from the instance. So the script pulled,
installed, spent 70 seconds building — and then exited 1 on `DATABASE_URL is not set`, with
`set -euo pipefail` stopping it **before** the restart. New code on disk, old process still serving
it, and `git log` claiming the fix was deployed.

It was never caught because the first build was done by hand with `DATABASE_URL` exported in the SSH
session. The script inherited an assumption from a session that no longer existed.

Fixed: reads the env file with `grep`/`cut` (sourcing truncates the value at the `&` before
`sslrootcert`), checks the Node major version, stops the service before building, and retries the
health check for 40 seconds.

**Verified by running it:** exit 0, and the health check passed on attempt 2 — direct proof that the
old immediate check would have failed a deploy that worked.

**A further defect surfaced during that verification.** The first run still failed, and the reason
was not the fix: `git pull` replaced `deploy.sh` while bash was executing it, so the run continued
on the old logic and died on the error the fix had already removed. Bash reads a script by byte
offset, so a half-old, half-new script can execute. The script now hashes itself across the pull and
re-execs. The reviewer did not find this one; running the thing did.

### Critical 2 — `pg` was discarding the entire TLS change

`pg`'s `ConnectionParameters` applies `parse(connectionString)` **over** the explicit pool config.
Our documented `DATABASE_URL` carries `sslmode=verify-full` and `sslrootcert` for libpq's benefit,
so it replaced the CA the code had read and dropped `rejectUnauthorized`. Measured against this
repo's own `pg`:

| `DATABASE_URL` | what the code supplied | what actually reached TLS |
| --- | --- | --- |
| no ssl params | `{ca, rejectUnauthorized: true}` | same |
| `sslmode=verify-full&sslrootcert=...` (ours) | same | **the URL's CA; `rejectUnauthorized` undefined** |
| `sslmode=require` | same | **`{}`** |
| `sslmode=disable` | same | **`false`** |

Three consequences. The branch's only application code change was inert in production — it worked
solely because the URL independently named the same file. The `rejectUnauthorized: true` the tests
asserted never reached the handshake. And the failure mode this whole change was written to prevent
was still wide open: write the more commonly documented `?sslmode=require`, with
`DATABASE_CA_CERT_PATH` set perfectly correctly, and the effective config becomes `{}` → verify
against the public root store → Amazon's private RDS CA is absent → the first query fails →
`content-service.ts` swallows it → the site serves a page with **no projects**, `/api/health`
returns 503, and `systemctl is-active` still says `active`.

Fixed: `poolConfigFrom()` strips the TLS query parameters whenever `DATABASE_CA_CERT_PATH` is set,
making the code the single authority for the Node pool and leaving the URL intact for `psql` and
`pg_restore`. With no CA path set the URL is untouched, so Railway's parameterless URL still works.

**Verified on the live database, server-side:** `pg_stat_ssl` reports every application connection
as `TLSv1.3 / TLS_AES_256_GCM_SHA384`.

I declined one part of the suggested fix: an assert refusing to connect without TLS to a non-local
host. Railway's `DATABASE_URL` has no `sslmode` and a non-local host, so that assert would break
production the moment this branch merged.

### The highest-value fix: seeding is now guarded, not just commented against

`deploy.sh` carried a prose warning that `npm run db:seed` destroys `michaeljportfolio-me`, which
exists only in the database. A comment stops nobody. `assertSafeToSeed()` now refuses to seed a
database that already holds projects unless `--force`, and `scripts/seed.ts` calls it.

**Verified against the real RDS database, read-only** — the guard alone, never the seed:

```
GUARD FIRED: Refusing to seed: the target database already contains 3 project(s)
(datathon-ems-dispatch, llm-manager, michaeljportfolio-me). ...
```

Row count afterwards: 13 tables, 69 rows, unchanged.

I deliberately did **not** run `db:seed` against RDS to test this end to end. Testing a guard by
firing the destructive command at live data is the wrong trade, and the standing constraint forbids
it. The refusal path is proven on real Postgres in four integration tests and once against RDS
itself; the `--force` path is proven only in tests.

### Also fixed

- **A CA file that is empty or not a certificate now throws.** A truncated or failed download left a
  file `readFileSync` accepted and Node's TLS treated as "use the public root store" — the same
  silent empty-project outcome.
- **The tests now assert what `pg` resolves**, via `Client.connectionParameters`, instead of what we
  hand to the `Pool`. That is precisely why they passed against the broken behavior. The CA fixture
  is resolved from the test file rather than `process.cwd()`.
- **`deploy/README.md`**: `DATABASE_URL` is quoted, and the precedence claim now describes what `pg`
  actually does rather than the reverse.
- **The unit**: `Restart=always` (a clean `exit 0` is still an outage), plus `NoNewPrivileges`,
  `PrivateTmp`, `PrivateDevices`, `ProtectSystem=full`, `ProtectHome=read-only`,
  `ProtectKernelTunables`, `ProtectKernelModules`, `ProtectControlGroups`, `RestrictSUIDSGID`,
  `RestrictRealtime`. Confirmed live with `systemctl show`.

Tests: **49 passed**, up from 39. `tsc` clean, lint clean.

### Deferred, and why it matters

**The app still runs as `ubuntu`, which is in the sudo group.** Code execution in the Next.js
process therefore means root on the box. The sandboxing above removes the cheap escalation routes
but not this one; the real fix is a dedicated service account, which means re-chowning
`/opt/career-platform` and `.next/cache` and re-testing the whole build-and-reboot chain. The
instance is not serving production, so I deferred it — but it is a **blocker before any cutover**,
not a nice-to-have.

### Re-verification after the fix pass

Everything was re-checked, because the unit changed and a reboot test only means something if the
machine really rebooted.

| Check | Result |
| --- | --- |
| `deploy.sh` end to end | exit 0, healthy on attempt 2 |
| App connections encrypted | `TLSv1.3 / TLS_AES_256_GCM_SHA384` per `pg_stat_ssl` |
| Sandboxing live | `NoNewPrivileges=yes`, `PrivateTmp=yes`, `ProtectSystem=full`, `ProtectHome=read-only`, `Restart=always` |
| Listener | still `127.0.0.1:3000` only |
| Reboot | new boot id `a1035433...`, uptime 0 min, app + nginx `active`, swap 2.0 GiB |
| Health from the internet | `200 {"status":"ok","source":"database"}` |
| Home page | 55,153 bytes on AWS and on Railway — identical |
| All three projects | present on both |
| `/privacy`, resume PDF | `200`; PDF exactly 91,150 bytes |
| Seed guard | fires against real RDS data, naming all three projects |
| Rows | 13 tables, 69 rows |

**One false pass caught.** The first reboot re-test returned `200` about twenty seconds after
`systemctl reboot`, and the boot id I printed was the pre-reboot one — the old server simply had not
dropped yet. A reboot test that races the reboot proves nothing. Re-done by waiting for SSH and
reading the new boot id.

Railway still serves production. `main` is untouched. No cutover.

## Section 11 — Cutover (2026-11-09)

**Why now, and not as planned.** The Railway trial ended, so the apex was already broken before this
session started: `https://michaeljportfolio.me` returned `404` (101 bytes, Railway's "application not
found") because the apex `CNAME` still pointed at `hg6gwx8k.up.railway.app`. Cutover stopped being a
section-11 decision and became the repair. There was no "keep Railway serving until the checks pass"
option left to take — the checks had already passed on 2026-11-05, and Railway was gone.

Pre-flight state, confirmed before touching anything:

| Check | Result |
| --- | --- |
| Apex | `404`, resolving to `153.52.255.104` (Railway) |
| AWS copy | `200`, 55,209 bytes at `aws.michaeljportfolio.me` |
| EC2 `i-0b9d23ee8a6ea7bb2` | `running`, `t3.micro`, Elastic IP `34.232.68.183` |
| RDS `career-platform-db` | `available`, `PubliclyAccessible: false`, Single-AZ |
| `src/middleware.ts` | `PUBLIC_HOST` already matched the apex and `www.` — no code change needed |

**Found and fixed first: port 22 allowed two addresses, not one.** The current operator address and a
stale `/32` from the 2026-11-05 session. Section 10 recorded "exactly one `/32`", which was no longer
true. Revoked the stale rule before cutover rather than writing a claim the configuration did not
support.

### The DNS change

The apex was a `CNAME`, and a `CNAME` cannot hold an IP address, so this was a type change, not an
edit of the value. Done as a single `PUT` (`cf dns records update`) so the record was never absent:

| Field | Before | After |
| --- | --- | --- |
| Type | `CNAME` | `A` |
| Content | `hg6gwx8k.up.railway.app` | `34.232.68.183` |
| Proxied | false (DNS only) | false (DNS only) |
| TTL | auto | auto |

The pre-change record was saved to a file outside the repo first, so reverting to Railway's DNS stays
a one-command operation. Proxying stayed off, which keeps HTTP-01 renewal working the way section 10
established. Both `1.1.1.1` and `8.8.8.8` returned the Elastic IP before anything else was attempted.

`www` needed nothing: it is a proxied placeholder `A` record (`192.0.2.1`) with a Cloudflare redirect
rule in front, so it bounces to the apex and never reaches the origin. That is also why the
certificate did not need a `www` name.

### The certificate

The probe came first: the `default_server` block on port 80 already serves `/var/www/html` for any
unmatched host, so the ACME challenge path answered for the apex **before** nginx was touched
(`http://michaeljportfolio.me/.well-known/acme-challenge/apexprobe` → `200` from the laptop). That
removed a config edit from the risky window instead of assuming it was needed.

One certificate was issued for both names rather than a second lineage — one renewal to fail, not two:

| Item | Value |
| --- | --- |
| Lineage | `michaeljportfolio.me` |
| Subject | `CN=michaeljportfolio.me` |
| SANs | `michaeljportfolio.me`, `aws.michaeljportfolio.me` |
| Issuer | Let's Encrypt (`YE2`) |
| Valid | 2026-11-10 01:36 UTC → 2027-02-08 01:36 UTC |
| Method | `certbot certonly --webroot -w /var/www/html` |

`deploy/nginx-aws.conf` in the repo was edited first and then installed on the instance, so the live
config stays the tracked one; the previous file was backed up to `/root` and `nginx -t` passed before
the reload. The test subdomain was deliberately kept serving rather than redirected, because it is the
evidence artifact section 10 points at.

### Verification after cutover

| Check | Result |
| --- | --- |
| `http://michaeljportfolio.me/` | `308` → `https://michaeljportfolio.me/` |
| `https://michaeljportfolio.me/` | `200`, 55,209 bytes |
| `https://aws.michaeljportfolio.me/` | `200`, 55,209 bytes — identical |
| `https://www.michaeljportfolio.me/` | `200` after redirect to the apex (was `404`) |
| Certificate trust | `curl` accepted it with no `-k` |
| `/api/health` | `200 {"status":"ok","source":"database"}` — reading RDS, not the snapshot fallback |
| All three projects | present on the apex |
| `/privacy` | `200`, 24,592 bytes |
| `/michael-johnson-resume.pdf` | `200`, 91,150 bytes, `application/pdf` |
| `certbot renew --dry-run` | both lineages simulated successfully; `certbot.timer` active |
| Services | `career-platform` and `nginx` both `active` |

Identical byte counts on the apex and the test subdomain, plus `source":"database"`, are the same two
signals section 10 relied on: the apex is serving the same app against the same restored data.

**Leftover:** the old `aws.michaeljportfolio.me`-only certificate lineage still exists and still
renews. Nothing in `/etc/nginx` references it. Harmless, but it is one more renewal that can fail
noisily; removable with `certbot delete --cert-name aws.michaeljportfolio.me`.

**Still true after cutover:** Let's Encrypt has no contact address for this account
(`--register-unsafely-without-email` in section 10), so a broken renewal will not be announced.
`sudo certbot update_account --email <address>` fixes that, and now that the apex depends on this
certificate the backstop matters more than it did when only a test subdomain did.
