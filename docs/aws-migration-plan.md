# Plan: moving michaeljportfolio.me from Railway to AWS

Written 2026-11-03, on the `aws-migration` branch. Nothing has been created in AWS yet.

## What we're building

Right now one company, Railway, runs everything: your website and your database. We're replacing
that with two pieces from Amazon that talk to each other.

- **EC2** is a rented computer in an Amazon data centre. Your website runs on it.
- **RDS** is a database that Amazon looks after for you — they handle the backups and repairs.

The database is **private**, which means it has no address on the public internet. Only your EC2
computer is allowed to reach it. People visiting your site never touch it directly.

How a visit works:

```
Someone's browser
   |
Cloudflare  (looks up your domain name and says "the site is at this address")
   |
EC2 computer, port 443  (the secure-web port)
   |  Nginx — handles the padlock/encryption, then hands the request on
   |
Your Next.js app, running on port 3000, only reachable from inside the machine
   |
RDS database, port 5432, private
```

Both pieces live in Northern Virginia (`us-east-1`), because that's where your permissions allow
you to build.

## Decisions you made

| Question | Your answer | What it means |
| --- | --- | --- |
| Where to build the site | `t3.micro` with 2 GB of swap | Swap is spare hard-disk space the computer borrows when it runs out of memory. Builds will take 3–8 minutes instead of under a minute. Keeps the cost at about $26/month. |
| The third project missing from your code | Deal with it after the migration | It's in the backup and moves across safely. We just never run `db:seed`. |
| How far to go today | Build and test only | The practice address `aws.michaeljportfolio.me` gets the new site. Your real address keeps pointing at Railway. Switching over is a separate decision later. |

## What already exists

From sections 2–5, done earlier today:

- A tested backup: `C:\Users\mjjoh\OneDrive\career-platform-backups\railway-20261103-1409.dump`,
  36,528 bytes, restored successfully into a local database and checked.
- AWS user `isba-student` with the `ISBA4775EC2Migration` permissions attached and verified.
- Account `<AWS-ACCOUNT-ID>`, default network `vpc-04969f461407cebb2`.
- The Ubuntu system image we'll use: `ami-0bfc5cae5711ffac8`.

## The steps

### Step 1 — Create the database (guide section 7)

Settings, all required by your permissions:

| Setting | Value |
| --- | --- |
| Engine | PostgreSQL 18 |
| Size | `db.t3.micro` |
| Copies | Single-AZ (one copy, in one data centre) |
| Storage | 20 GB, gp3, encrypted |
| Storage autogrow | Off |
| Public access | **No** |
| Automatic backups | On, kept 7 days |

A note on "Single-AZ": a data centre is called an Availability Zone, and Northern Virginia has six.
Single-AZ means your database lives in exactly one of them. If that building has a problem, your
database is down until it comes back. The alternative costs twice as much, and for a portfolio
site it isn't worth it.

The database gets its own firewall rule that allows connections on port 5432 **only** from the EC2
computer — not from the internet, and not from your laptop.

### Step 2 — Create the server (guide section 8)

| Setting | Value |
| --- | --- |
| Operating system | Ubuntu Server 26.04 LTS |
| Size | `t3.micro` |
| Storage | 20 GB, gp3, encrypted |
| IMDSv2 | Required (a security setting your permissions insist on) |
| Network | The default network, in a part of it that can reach the internet |
| Firewall | Port 22 (remote login) open only to your home address; ports 80 and 443 open to everyone; nothing else |
| Address | An Elastic IP — a fixed address that stays yours even if the computer restarts |

**The login key.** Your permissions deliberately do *not* let Amazon create this for you. I'll
generate it on your laptop with `ssh-keygen` and upload only the public half. The private half —
the part that actually proves it's you — never leaves your machine and never goes into Git.

### Step 3 — Set up the server and move the data (guide section 9)

In order:

1. Add 2 GB of swap, so the build doesn't run out of memory.
2. Install Node.js 22, to match what you build with locally. Your project doesn't state which
   version it needs, so we pick one and write it down.
3. Install Nginx (the program that handles the padlock and passes requests to your app).
4. Copy your code onto the server and run `npm ci && npm run build`.
5. Restore the backup into the empty RDS database.
6. Run `npm run db:migrate` — **and never `npm run db:seed`**, which would wipe the restored data.
7. Create a systemd service so the app starts automatically and restarts if it crashes. Railway
   did this for you invisibly; on AWS nobody does it unless we write it.

### Step 4 — Test at the practice address (guide section 10)

Add a DNS record named `aws` pointing at the Elastic IP, set up the certificate for
`aws.michaeljportfolio.me`, then check:

- Every page loads, including `/privacy`
- `/api/health` returns a 200 with `"source":"database"`
- All three projects appear, including `michaeljportfolio-me`
- The PDF résumé downloads
- Adding a test record, restarting the app, and seeing it survive
- Rebooting the whole machine and seeing the site, database and Nginx all come back
- Certificate renewal works
- Remote login is restricted, the database is private, sizes match the tables above

Nothing gets switched over until all of these pass.

### Step 5 — Stop (your decision)

The real site stays on Railway. Section 11's cutover happens another day.

## Things that will probably go wrong

These are predicted, with the fix already decided, so they don't eat the session.

**1. The database will refuse the first connection.** Amazon's databases insist on encrypted
connections. Your app currently doesn't ask for one, because Railway didn't need it. The error
will mention `pg_hba.conf` and look like a firewall problem, but it isn't. Fix: download Amazon's
certificate file onto the server and add the encryption settings to how the app connects. This is
a small code change on this branch.

**2. The build may run out of memory.** That's what the swap is for. If it still fails, the
fallback is resizing to `t3.small`, which is a stop, change, start — about two minutes, no rebuild.

**3. The automatic redirect to the secure address won't work on the practice address.** Your code
has a list of approved site addresses, and `aws.michaeljportfolio.me` isn't on it. We'll handle
the redirect in Nginx instead, and update the code list before any future switchover.

**4. Nothing will tell you if the site goes down.** Railway watched it for you. We'll at least get
automatic restarts from systemd; proper alerting is out of scope for today.

## How we'll know it worked

The backup had 69 rows across 13 tables. After the restore, the counts must match exactly, and
`/api/health` must return `"source":"database"` — that last one proves the data is not just
present but in the shape the site expects.

## If something breaks

Your real site is on Railway the entire time, untouched. Nothing in this plan changes it. The
worst outcome today is that the practice address doesn't work and we try again, with Railway
serving visitors the whole while.

## Cleanup owed later

- Remove the Railway SSH key (`isba4775-azure`) once the tunnel is no longer needed
- Release the Elastic IP if the instance is ever terminated — it charges while sitting unused
- Delete the RDS instance with a final snapshot when the project is over; stopped databases
  restart themselves after seven days
- Run `aws logout --profile isba-4775` at the end of each working session
