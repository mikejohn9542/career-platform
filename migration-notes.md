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
