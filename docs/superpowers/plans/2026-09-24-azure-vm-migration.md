# Azure VM Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan section by section, inline. Stop after each section for review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the career platform on `vm-career-platform`, serving content from the laptop's SQLite database.

**Architecture:** Clone the GitHub repo onto the Ubuntu VM, install Node.js and the locked npm dependencies, copy the SQLite file up from the laptop with `scp`, then run `next start` as a systemd service on `127.0.0.1:8000`. Only SSH from the laptop is open. The site is checked on the VM with `curl`, then from outside in the guide's section 6 exercise.

**Tech Stack:** Ubuntu Server 24.04 LTS (x64), Node.js 22, npm, Next.js 15, TypeScript, better-sqlite3, SQLite, systemd, Azure CLI.

**Spec:** The user's migration plan (Server → Packages → Code → Python → Config → Data → Processes → Verify) and the class guide *Migrate your resume site to an Azure VM* (Session 07).

## Global Constraints

- VM: `vm-career-platform`, resource group `rg-career-platform`, North Central US, `Standard_B2ats_v2` (2 vCPU, **1 GiB RAM**). The guide's West US 2 / `B2ts_v2` combination is blocked by the subscription's region policy.
- VM public IP: `135.232.245.90`.
- SSH user `azureuser`, key `~/.ssh/isba4775_azure`, for every SSH/SCP command.
- Firewall: only the user-created inbound rule `Allow-SSH-Laptop` (priority 300, TCP 22, laptop IP `/32`). The agent never changes Azure firewall rules; those are portal steps for the user.
- Repo: `https://github.com/mikejohn9542/career-platform.git` (public), branch `main`, cloned to `/home/azureuser/career-platform`.
- Database: `DATABASE_PATH=data/career-platform.sqlite`, relative to the repo root. The app, the scripts, and `.env.example` all use it.
- App port **8000**, bound to `127.0.0.1` except during the guide's section 6 exercise.
- The app is Node.js/Next.js (TypeScript), not Python: `uv` ⇒ Node.js 22 + npm, `uv.lock` ⇒ `package-lock.json`, `uv sync --locked` ⇒ `npm ci`, `.venv` ⇒ `node_modules`, Uvicorn ⇒ `next start`.
- **No database is created or seeded on the VM.** The only database is the one copied from the laptop.
- Evidence note: **seed data, not migrated data.** The Codespace database was empty. The laptop copy was seeded locally and then edited with the user's profile (guide section 5), and that copy is the original.
- Auto-shutdown deallocates the VM daily at 18:00 Pacific. Start it before each session.

Shorthand used below (run on the laptop in Git Bash):

```bash
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"
export MSYS_NO_PATHCONV=1
VM_SSH="ssh -i ~/.ssh/isba4775_azure azureuser@135.232.245.90"
```

## Review Focus

- **VM deallocated by auto-shutdown**: SSH times out after 18:00 Pacific. Server step 3 starts the VM, and systemd brings the site back without manual steps (Verify step 4).
- **Laptop IP changes** (new Wi-Fi or a VPN): SSH times out while the VM is running. Server step 2 shows the rule's source; the user updates `Allow-SSH-Laptop` in the portal.
- **1 GiB RAM during `npm ci` / `next build`**: the build is killed (`Killed` / exit 137). The swap file in Server step 4 prevents this.
- **Wrong or empty database**: the app silently falls back to the snapshot when the DB returns no profile. Verify step 2 must print `database <your name>`.
- **Uncommitted path fix**: the `DATABASE_PATH` change in `src/lib/content-service.ts` is local only. Code step 1 pushes it, and Code step 2 compares commit IDs.

---

## Server

### Step 1: VM exists — DONE

- [x] **Where:** laptop (`az`), already done on 2026-09-24
- **What:** The VM was created with `az vm create`: Ubuntu 24.04 LTS x64 Gen2, Standard SSD, no inbound ports, auto-shutdown 18:00 Pacific with email notice, boot diagnostics off, tags `course=isba-4775`, `environment=staging`.
- **Check:** `az vm show -g rg-career-platform -n vm-career-platform -d --query "{state:powerState, size:hardwareProfile.vmSize, ip:publicIps}" -o table`
- **Undo:** `az group delete -n rg-career-platform` (deletes everything; not planned).

### Step 2: SSH rule and first connection — DONE

- [x] **Where:** portal (rule), laptop (first SSH), both done by the user
- **What:** Inbound rule `Allow-SSH-Laptop`: priority 300, source = laptop IP `/32`, TCP 22, Allow. The user's manual `ssh` recorded the VM's host key in `~/.ssh/known_hosts`.
- **Check (read only):**
  ```bash
  az network nsg rule show -g rg-career-platform --nsg-name vm-career-platformNSG -n Allow-SSH-Laptop \
    --query "{priority:priority, src:sourceAddressPrefix, port:destinationPortRange, access:access}" -o table
  curl -4 -s https://api.ipify.org     # must equal the rule's source, without /32
  ```
- **Undo:** The user deletes the rule in the portal (*Networking → Network settings*).

### Step 3: Make sure the VM is running

- [x] **Where:** laptop, done 2026-09-30 (result: `VM running`, `hostname` → `vm-career-platform`)
- **Run:** `az vm start -g rg-career-platform -n vm-career-platform`
- **Why:** Auto-shutdown deallocates the VM at 18:00 Pacific, and SSH times out while it's off.
- **Check:** `az vm show -g rg-career-platform -n vm-career-platform -d --query powerState -o tsv` → `VM running`; `$VM_SSH hostname` → `vm-career-platform`
- **Undo:** `az vm deallocate -g rg-career-platform -n vm-career-platform`

### Step 4: Add a 2 GiB swap file

- [x] **Where:** VM, done 2026-09-30 (result: `/swapfile 2G`, `Swap: 2.0Gi`, fstab entry present)
- **Run:**
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- **Why:** With 1 GiB of RAM, `npm ci` and `next build` can be killed for running out of memory. This isn't in the guide because the guide's Python app needs no build step.
- **Check:** `swapon --show` lists `/swapfile 2G`; `free -h` shows `Swap: 2.0Gi`.
- **Undo:** `sudo swapoff /swapfile && sudo sed -i '\|^/swapfile |d' /etc/fstab && sudo rm /swapfile`

## Packages

### Step 1: Install git and sqlite3

- [x] **Where:** VM, done 2026-09-30 (result: `git version 2.43.0`, `sqlite3 3.45.1`)
- **Run:** `sudo apt-get update && sudo apt-get install -y git sqlite3`
- **Why:** `git` clones the repo. `sqlite3` runs the integrity check and row counts on the copied database. `sudo` is needed because this changes system software.
- **Check:** `git --version && sqlite3 --version` both print versions.
- **Undo:** `sudo apt-get remove -y git sqlite3 && sudo apt-get autoremove -y`

## Code

### Step 1: Publish the database-path fix

- [x] **Where:** laptop, in the repo, done 2026-09-30 (result: commit `cf8324b` pushed; `origin/main` line 36 reads `DATABASE_PATH`)
- **Run:**
  ```bash
  git restore package-lock.json          # npm install only stripped "libc" fields; keep the committed lock
  git add src/lib/content-service.ts
  git commit -m "fix: read DATABASE_PATH for the app database"
  git push origin main
  ```
- **Why:** The app on `main` still reads `CAREER_PLATFORM_DB_PATH`/`data/app.db`, so without this the VM ignores the copied database. Restoring the lock file keeps `npm ci` on the VM identical to what was tested.
- **Check:** `git status -sb` → `## main...origin/main` with no ahead count; `git show origin/main:src/lib/content-service.ts | grep DATABASE_PATH` prints the new line.
- **Undo:** `git revert HEAD && git push origin main`

### Step 2: Clone the repo on the VM

- [x] **Where:** VM, done 2026-09-30 (result: VM `HEAD` = laptop `HEAD` = `cf8324bd6e8041a4a5c7c302e1a2caab61df7d82`; no `.env`, `data/`, or `node_modules` in the clone)
- **Run:** `git clone https://github.com/mikejohn9542/career-platform.git ~/career-platform`
- **Why:** Gets the exact committed source onto the server. The repo is public, so no credential is needed, and the VM can read it but can't push.
- **Check:** `git -C ~/career-platform rev-parse HEAD` on the VM equals `git rev-parse HEAD` on the laptop (same commit ID).
- **Undo:** `rm -rf ~/career-platform`

## Python

This project has no Python code; it is TypeScript on Node.js. These steps do the same jobs as `uv` and `uv sync --locked`: install the runtime, then install exact versions from the lock file.

### Step 1: Install Node.js 22

- [x] **Where:** VM, done 2026-09-30 (result: `node v22.23.3`, `npm 10.9.9`)
- **Run:**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
  sudo bash /tmp/nodesource_setup.sh
  sudo apt-get install -y nodejs
  ```
- **Why:** Ubuntu 24.04's own `nodejs` is v18; the laptop runs v22.20.0, so this matches it.
- **Check:** `node -v` → `v22.x`; `npm -v` prints a version.
- **Undo:** `sudo apt-get remove -y nodejs && sudo rm -f /etc/apt/sources.list.d/nodesource.sources /usr/share/keyrings/nodesource.gpg && sudo apt-get update`

### Step 2: Install locked dependencies

- [x] **Where:** VM, done 2026-09-30 (result: exit 0, `sqlite ok`, lock file unchanged; `npm audit` reports 14 vulnerabilities, 6 in production deps — deferred, app stays on 127.0.0.1)
- **Run:** `cd ~/career-platform && npm ci`
- **Why:** Installs exactly what `package-lock.json` records, the "receipt". Unlike the guide's `--no-dev`, dev dependencies stay: `next build` needs TypeScript, and the snapshot and verify steps need `tsx`.
- **Check:** `node -e "new (require('better-sqlite3'))(':memory:'); console.log('sqlite ok')"` → `sqlite ok`
- **If better-sqlite3 fails to load:** `sudo apt-get install -y build-essential python3 && npm ci`
- **Undo:** `rm -rf ~/career-platform/node_modules`

## Config

### Step 1: Create .env and the data directory

- [x] **Where:** VM, done 2026-10-01 (result: `.env` = `DATABASE_PATH=data/career-platform.sqlite`, mode `-rw-------`; `data/` empty; `git status` clean)
- **Run:**
  ```bash
  cd ~/career-platform
  cp .env.example .env && chmod 600 .env
  mkdir -p data
  ```
- **Why:** Next.js loads `.env` when it starts, which sets `DATABASE_PATH=data/career-platform.sqlite`. `.env` and `data/` are gitignored, so the clone doesn't include them. No secrets go here today; the laptop's `ANTHROPIC_API_KEY` stays on the laptop.
- **Check:** `cat .env` → `DATABASE_PATH=data/career-platform.sqlite`; `ls -ld data` shows the directory.
- **Undo:** `rm .env && rmdir data`

## Data

Before this section starts, the laptop database gets the user's own profile (guide section 5). Done 2026-10-01: `src/content/profile.ts` rewritten from the resume (phone omitted), `content:validate` passed, 11/11 tests passed, the old DB was backed up to `data/career-platform.pre-profile-20261001.sqlite`, and `npm run db:seed` was run **on the laptop only**. Result: integrity `ok`, profile `Michael Johnson`, no demo rows left, content service → `database Michael Johnson`.

### Step 1: Check the laptop original

- [x] **Where:** laptop, in the repo, done 2026-10-01. Result: one file, 126,976 bytes, no `-wal`/`-shm` files, journal mode `delete`; SHA-256 `db807fbaa0be23ec553304ac3b3df5dce8ab012be8108a7792b36e3fb8086b2f`; integrity `ok`; profiles 1, experiences 2, projects 2, skill_items 19, education 1; name `Michael Johnson`.
- **Run:**
  ```bash
  ls -la data/career-platform.sqlite*
  sha256sum data/career-platform.sqlite
  python -c "import sqlite3; c=sqlite3.connect('data/career-platform.sqlite'); print(c.execute('PRAGMA integrity_check').fetchone()[0]); [print(t, c.execute(f'select count(*) from {t}').fetchone()[0]) for t in ('profiles','experiences','projects','skill_items','education')]; print(c.execute('select name from profiles').fetchone()[0])"
  ```
- **Why:** Establishes the numbers the VM copy must match. `data/app.db` is the old, empty file. There should be no `-wal` or `-shm` files next to the database, because those hold unwritten changes.
- **Check:** Only `data/career-platform.sqlite` is listed; integrity is `ok`; the profile name is the user's, not `Alex Morgan`. Record the hash and counts.
- **Undo:** Not needed (read only).

### Step 2: Copy the database to the VM

- [x] **Where:** laptop, in the repo, done 2026-10-01. VM copy: 126,976 bytes at `data/career-platform.sqlite` (= `.env` `DATABASE_PATH`); integrity `ok`; SHA-256 `db807fba…086b2f`, identical to the laptop; profiles 1, experiences 2, projects 2, skill_items 19, education 1, identical; name `Michael Johnson`.
- **Run:** `scp -i ~/.ssh/isba4775_azure data/career-platform.sqlite azureuser@135.232.245.90:~/career-platform/data/career-platform.sqlite`
- **Why:** This is the one part Git can't move. The target path and filename match `DATABASE_PATH` in the VM's `.env` exactly.
- **Check:** On the VM:
  ```bash
  cd ~/career-platform
  sqlite3 data/career-platform.sqlite "PRAGMA integrity_check;"      # → ok
  sha256sum data/career-platform.sqlite                              # = laptop hash
  sqlite3 data/career-platform.sqlite "select 'profiles',count(*) from profiles union all select 'experiences',count(*) from experiences union all select 'projects',count(*) from projects union all select 'skill_items',count(*) from skill_items union all select 'education',count(*) from education; select name from profiles;"
  ```
  → `ok`, the same hash, the same counts, and the user's name.
- **Undo:** `rm ~/career-platform/data/career-platform.sqlite` on the VM. The laptop original is untouched, so re-running this step is safe.

## Processes

### Step 1: Generate the snapshot and build

- [x] **Where:** VM, done 2026-10-01. Result: `HEAD` `cd5ec77`; snapshot written (contains `Michael Johnson`); build exit 0 in 36 s, peak memory ~389 MB, 28.5 MB swap used; `.next/BUILD_ID` present; DB hash unchanged (`db807fba…086b2f`); `git status` clean.
- **Run:** `cd ~/career-platform && git pull --ff-only && git rev-parse --short HEAD && npm run content:snapshot && npm run build`
- **Why `git pull` first:** `profile.ts` (your resume) and the Datathon deck were pushed in `cd5ec77` after the VM's clone at `cf8324b`. The snapshot is generated from `profile.ts`, so the VM needs that commit first. `cd5ec77` didn't change `package-lock.json`, so `npm ci` doesn't need to run again.
- **Why:** The fallback snapshot (`src/generated/profile-snapshot.json`) is gitignored, so the VM has to generate it. `next build` produces the production bundle that `next start` serves. Neither step touches the database.
- **Check:** `ls src/generated/profile-snapshot.json .next/BUILD_ID` shows both files; the build ends without `Killed` or errors.
- **Undo:** `rm -rf .next src/generated/profile-snapshot.json`

### Step 2: Run the app as a systemd service

- [x] **Where:** VM, done 2026-10-01. Result: `active` and `enabled`; `ss` shows `127.0.0.1:8000` (next-server); process user `azureuser`; log `Ready in 606ms`; 0 `content_service_fallback` lines.
- **Run:**
  ```bash
  sudo tee /etc/systemd/system/career-platform.service > /dev/null <<'EOF'
  [Unit]
  Description=Career platform (Next.js)
  After=network.target

  [Service]
  User=azureuser
  WorkingDirectory=/home/azureuser/career-platform
  Environment=NODE_ENV=production
  Environment=HOST=127.0.0.1
  Environment=PORT=8000
  ExecStart=/usr/bin/npm run start -- -H ${HOST} -p ${PORT}
  Restart=on-failure

  [Install]
  WantedBy=multi-user.target
  EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now career-platform
  ```
- **Why:** This replaces "start Uvicorn". systemd keeps the app running after SSH closes, restarts it if it crashes, and starts it at boot after the nightly auto-shutdown. `WorkingDirectory` makes the relative `DATABASE_PATH` resolve inside the repo. `HOST=127.0.0.1` means only the VM itself can reach the app.
- **Check:** `systemctl is-active career-platform` → `active`; `ss -tlnp | grep 8000` shows `127.0.0.1:8000`; `journalctl -u career-platform -n 20 --no-pager` shows `Ready` and no `content_service_fallback`.
- **Undo:** `sudo systemctl disable --now career-platform && sudo rm /etc/systemd/system/career-platform.service && sudo systemctl daemon-reload`

**Changing the listening address (guide section 6):**

```bash
sudo sed -i 's/^Environment=HOST=.*/Environment=HOST=0.0.0.0/' /etc/systemd/system/career-platform.service   # or 127.0.0.1 to close
sudo systemctl daemon-reload && sudo systemctl restart career-platform && ss -tlnp | grep 8000
```

## Verify

### Step 1: The site answers on the VM

- [x] **Where:** VM, done 2026-10-01 (result: `HTTP 200`, scaffold heading present)
- **Run:** `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/ && curl -s http://127.0.0.1:8000/ | grep -o "Career platform scaffold is running"`
- **Why:** Proves the service is serving HTTP. This is a weak check: a page can load with the wrong data.
- **Check:** `200`, then the scaffold heading. The home page doesn't show profile data yet.
- **Undo:** Not needed.

### Step 2: The app reads my data from SQLite

- [x] **Where:** VM, done 2026-10-01 (result: `database Michael Johnson | projects: Datathon, LLM Manager`. Limitation: the running `next-server` has 0 open handles to the DB, because the scaffold home page is static and doesn't query content yet. The live server's DB read is proven only once a page renders profile data.)
- **Run:**
  ```bash
  cd ~/career-platform
  npx tsx -e 'import { contentService } from "./src/lib/content-service"; contentService.getSiteContent().then(r => console.log(r.source, r.content.profile.name))'
  ```
- **Why:** Uses the app's own content service, the code the pages call, to show both *where* the content came from and *whose* it is. This is a strong check: the seed script and the snapshot only know the demo profile.
- **Check:** Prints `database <your name>`. `snapshot …` or `Alex Morgan` means the app isn't reading the copied file; recheck Data step 2 and Code step 1.
- **Undo:** Not needed.

### Step 3: Evidence table

- [x] **Where:** laptop (this file), done 2026-10-01; see *Results* below
- **What:** Add a table at the end of this plan listing each check, its result on the laptop and on the VM, and whether it is strong (hash, integrity, row counts, your name from `source=database`) or weak (HTTP 200). Include the note *seed data, not migrated data*.
- **Why:** The plan doubles as the record of what was done and what it proved.
- **Undo:** Edit the file.

### Step 4: The site survives a restart

- [x] **Where:** laptop, done 2026-10-01 (result: after `az vm restart`, uptime 0 min, service `active`, `HTTP 200`, `127.0.0.1:8000`, swap on)
- **Run:** `az vm restart -g rg-career-platform -n vm-career-platform`, then `$VM_SSH 'systemctl is-active career-platform && curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/'`
- **Why:** Auto-shutdown stops the VM every evening, so the app has to come back by itself. This is the reason for using systemd today.
- **Check:** `active`, then `200`.
- **Undo:** Not needed.

## Results

**Data provenance: seed data, not migrated data.** The Codespace database was empty. The laptop database was seeded locally from `src/content/profile.ts` after that file was rewritten with my resume, and the laptop copy is the original that was migrated.

| # | Check | Laptop | VM | Strength |
| --- | --- | --- | --- | --- |
| 1 | Code version (`git rev-parse HEAD`) | `cd5ec77` | `cd5ec77` | Strong: identical commit ID means identical code |
| 2 | Database file and path | `data/career-platform.sqlite`, 126,976 bytes | same path (matches `.env` `DATABASE_PATH`), 126,976 bytes | Strong: the app opens only this path |
| 3 | SHA-256 of the database | `db807fba…086b2f` | `db807fba…086b2f` | Strong: every byte arrived unchanged |
| 4 | `PRAGMA integrity_check` | `ok` | `ok` | Strong: the file isn't corrupt |
| 5 | Row counts (profiles / experiences / projects / skill_items / education) | 1 / 2 / 2 / 19 / 1 | 1 / 2 / 2 / 19 / 1 | Strong: same content |
| 6 | Profile name in the database | Michael Johnson | Michael Johnson | Strong: the original seed only knew "Alex Morgan" |
| 7 | App content service (`getSiteContent`) | `database Michael Johnson` | `database Michael Johnson` | Strong: the app's own code reads the copied DB, not the snapshot fallback |
| 8 | `curl http://127.0.0.1:8000/` | n/a | `HTTP 200`, scaffold heading | Weak: proves the server answers, not which data it serves |
| 9 | Service state (`systemctl`, `ss`) | n/a | `active`, `enabled`, listening on `127.0.0.1:8000` as `azureuser` | Medium: the process is up and private |
| 10 | Survives a VM restart | n/a | after `az vm restart`: `active`, `HTTP 200` | Strong for durability |

| 11 | Live page from the running server (after commit `28bd532`, dynamic home page) | `Michael Johnson` rendered, phone absent | `HTTP 200`; `Michael Johnson`, CP Financial, Datathon, LLM Manager present; phone, `Alex Morgan`, scaffold text absent | Medium alone: the snapshot also contains my name |
| 12 | Running `next-server` holds the database open | n/a | pid 1509 in the service's cgroup: 1 open handle to `data/career-platform.sqlite`; 0 `content_service_fallback` warnings | Strong: the live server reads the copied DB |

**Earlier limitation, now closed:** before `28bd532`, the home page was a static scaffold and the server never opened the database (0 handles on the real `next-server`, pid 3015). After the dynamic home page was deployed, the server's process holds the database open and logs no fallback. Note: one intermediate reading of "0 handles" was wrong because `pgrep -f next-server` matched my own SSH shell's command line. Reading `/sys/fs/cgroup/system.slice/career-platform.service/cgroup.procs` lists only the service's real processes.
