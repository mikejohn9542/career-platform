# Operate the VM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan section by section, inline. Stop after each section for review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make visitors reach the site at `http://135.232.245.90` (no port number). The site should start at boot, come back after a crash, and stay up when one app process crashes.

**Architecture:** Two copies of the app run as systemd services under `azureuser`, on `127.0.0.1:8000` and `127.0.0.1:8001`. nginx listens on port 80 and passes each request to whichever copy is up. Only port 80 (and SSH from your laptop) is open to the Internet.

**Tech Stack:** Ubuntu 24.04, systemd, nginx, Node.js 22, Next.js 15, SQLite.

**Spec:** The user's request of 2026-10-01 (this plan's goal and constraints). Background: `docs/superpowers/plans/2026-09-24-azure-vm-migration.md`.

## The VM (found 2026-10-01, read only)

| | |
|---|---|
| VM | `vm-career-platform`, resource group `RG-CAREER-PLATFORM`, subscription *Azure for Students* |
| Region / size | North Central US, `Standard_B2ats_v2` (2 vCPU, 1 GiB RAM + 2 GiB swap) |
| OS | Ubuntu 24.04.4 LTS, Node.js v22.23.3 |
| Public IP | `135.232.245.90` (static) · private IP `10.0.0.4` |
| SSH | `ssh -i ~/.ssh/isba4775_azure azureuser@135.232.245.90` (key only, no passwords) |
| Firewall (NSG `vm-career-platformNSG`) | `Allow-SSH-Laptop` (300, TCP 22, from `<laptop-ip>/32`) · `Allow-HTTP-80` (**310**, port 80, from any source) |
| App today | `career-platform.service`, enabled, runs `npm run start` on `127.0.0.1:8000` as `azureuser`. Nothing listens on port 80. No nginx installed. |
| Code / data | `/home/azureuser/career-platform` with built `.next/`, `node_modules/`, `.env`, `data/career-platform.sqlite` |

## Global Constraints

- Use the code, `node_modules`, `.next` build, and database already in `~/career-platform`. Don't run `git pull`, `npm ci`, or `next build`.
- Don't change any files in the repo, and don't add tests. This plan is the only new repo file.
- App processes run as `azureuser`, never as root, and listen only on `127.0.0.1`.
- Port 8000 (and 8001) are never opened in Azure.
- The agent doesn't change Azure. The port 80 rule (`Allow-HTTP-80`, priority 320) is a portal step for the user.
- Service name: `career-platform` (as the template `career-platform@.service`; see Section 1).
- Leave out crash and reboot tests. The user runs those.
- The app is Node.js/Next.js, not Python: "Python environment" here means `node_modules`, and Gunicorn-style workers become two app copies behind nginx.

Shorthand (on the laptop, in Git Bash):

```bash
VM_SSH="ssh -i ~/.ssh/isba4775_azure azureuser@135.232.245.90"
```

## Review Focus

- **Auto-shutdown at 18:00 Pacific**: the site goes offline every evening. That's expected. Step 0 starts the VM, and the services come back on their own.
- **Name clash on `Allow-HTTP-80`**: a rule with that name already exists at priority 310, so the portal won't add a second one. Section 3 changes the existing rule's priority instead.
- **nginx's default site**: if it stays enabled, visitors get "Welcome to nginx!" instead of the resume. Section 2 removes it, and its check looks for the resume text.
- **Two copies, one SQLite file**: the web app only reads the database (writes happen only in `scripts/seed.ts`), so sharing the file is safe.
- **1 GiB RAM**: each copy uses about 100–140 MB. Section 1 checks `free -m` after both copies start.

---

## Section 0: Before you start

**What this is:** The VM shuts itself off every evening. SSH and the site only work while it's running.

- [x] **Step 1: Start the VM and confirm SSH works**
  - **Where:** laptop
  - **Run:** `az vm start -g rg-career-platform -n vm-career-platform`, then `$VM_SSH hostname`
  - **Check:** prints `vm-career-platform`. If SSH times out, your laptop's IP changed: compare `curl -4 -s https://api.ipify.org` with the source of `Allow-SSH-Laptop`.
  - **Result (2026-10-01 15:21 PDT):**
    - Ran `az vm start -g rg-career-platform -n vm-career-platform`. Exit 0. The VM was already running, so nothing changed.
    - `az vm show ... --query powerState` → `VM running`
    - `$VM_SSH hostname` → `vm-career-platform` ✅
    - Laptop IP `<laptop-ip>` matches the `Allow-SSH-Laptop` source `<laptop-ip>/32` ✅

## Section 1: Two copies of the app, managed by systemd

**What this is:** systemd is Linux's service manager. A *unit file* tells it how to run a program: which user, which folder, and what to do when the program exits. A *template* unit (the `@` in the name) is one file that runs several copies. The text after `@` (here, the port number) fills in `%i`. With two copies, a crash in one leaves the other serving visitors while systemd restarts the one that crashed.

The settings that matter:
- `User=azureuser`: the app doesn't run as root.
- `-H 127.0.0.1`: the app is reachable only from inside the VM.
- `Restart=always` + `RestartSec=2`: restart after any exit, two seconds later.
- `StartLimitIntervalSec=0`: never stop retrying.
- `WantedBy=multi-user.target` + `enable`: start at boot.
- `ExecStart` calls `next` directly instead of going through `npm`, so systemd watches the real server process.

- [x] **Step 1: Write the template unit**
  - **Where:** VM (sent from the laptop)
  - **Run:**
    ```bash
    $VM_SSH 'sudo tee /etc/systemd/system/career-platform@.service' <<'EOF'
    [Unit]
    Description=Career platform (Next.js) on 127.0.0.1:%i
    After=network.target
    StartLimitIntervalSec=0

    [Service]
    User=azureuser
    WorkingDirectory=/home/azureuser/career-platform
    Environment=NODE_ENV=production
    ExecStart=/home/azureuser/career-platform/node_modules/.bin/next start -H 127.0.0.1 -p %i
    Restart=always
    RestartSec=2

    [Install]
    WantedBy=multi-user.target
    EOF
    ```
  - **Check:** `$VM_SSH 'systemd-analyze verify /etc/systemd/system/career-platform@.service && echo OK'` prints `OK`.
  - **Result (2026-10-01):** Ran the `tee` command above. It echoed the unit file back exactly as written. `systemd-analyze verify` → `OK` ✅

- [x] **Step 2: Retire the old single service, start both copies**
  - **Where:** VM
  - **Why:** the old `career-platform.service` already holds port 8000. Stop it first, and keep a backup of its unit file.
  - **Run:**
    ```bash
    $VM_SSH 'sudo systemctl disable --now career-platform.service \
      && sudo mv /etc/systemd/system/career-platform.service ~/career-platform.service.bak \
      && sudo systemctl daemon-reload \
      && sudo systemctl enable --now career-platform@8000 career-platform@8001'
    ```
  - **Check:**
    ```bash
    $VM_SSH 'systemctl is-active career-platform@8000 career-platform@8001; \
      systemctl is-enabled career-platform@8000 career-platform@8001; \
      sudo ss -tlnp | grep -E ":800[01]"; \
      ps -eo user,cmd | grep "[n]ext-server"; \
      for p in 8000 8001; do curl -s -o /dev/null -w "$p %{http_code}\n" http://127.0.0.1:$p/; done; free -m'
    ```
    Expected: `active` ×2, `enabled` ×2, both ports on `127.0.0.1` only, the user column shows `azureuser` (never `root`), `8000 200` and `8001 200`, and `available` memory above about 200 MB.
  - **Result (2026-10-01):** Ran the commands above. Exit 0. systemd removed the `career-platform.service` boot link and created boot links for `career-platform@8000` and `@8001`. Checks, run 5 seconds later:
    - `is-active` → `active`, `active` ✅ · `is-enabled` → `enabled`, `enabled` ✅
    - `ss` → `127.0.0.1:8000` (pid 3275) and `127.0.0.1:8001` (pid 3276), both `next-server`, both on loopback only ✅
    - `ps` → both `next-server (v15.3.5)` processes run as `azureuser` ✅ (none as root)
    - `curl` → `8000 200`, `8001 200` ✅
    - `free -m` → 509 MB available, 35 MB of 2 GiB swap used ✅ (needs > 200 MB)
    - Backup kept at `/home/azureuser/career-platform.service.bak` (owned by root; the Undo command uses `sudo`)
  - **Undo:** `sudo systemctl disable --now career-platform@8000 career-platform@8001 && sudo mv ~/career-platform.service.bak /etc/systemd/system/career-platform.service && sudo systemctl daemon-reload && sudo systemctl enable --now career-platform`

## Section 2: nginx on port 80

**What this is:** nginx is a *reverse proxy*. It answers on port 80 (the port browsers use when the address has no port number) and forwards each request to one of the app copies. The `upstream` block lists both copies. If one doesn't answer, `proxy_next_upstream` sends the request to the other, so the visitor never sees the failure. nginx's master process starts as root so it can open port 80, then serves traffic from `www-data` workers. The app itself never runs as root.

- [x] **Step 1: Install nginx**
  - **Where:** VM
  - **Run:** `$VM_SSH 'sudo apt-get update && sudo apt-get install -y nginx'`
  - **Check:** `$VM_SSH 'systemctl is-enabled nginx; systemctl is-active nginx'` prints `enabled` and `active` (Ubuntu turns it on at install and at boot).
  - **Result (2026-10-01):** Ran the install with two small additions. `DEBIAN_FRONTEND=noninteractive` keeps apt from stopping to ask questions over SSH. `-qq` plus a log at `/tmp/nginx-install.log` keeps the output short. Install exit 0, `nginx/1.24.0 (Ubuntu)`. `is-enabled` → `enabled`, `is-active` → `active` ✅

- [x] **Step 2: Add the site and remove the default page**
  - **Where:** VM
  - **Run:**
    ```bash
    $VM_SSH 'sudo tee /etc/nginx/sites-available/career-platform' <<'EOF'
    upstream career_platform {
        server 127.0.0.1:8000 max_fails=1 fail_timeout=5s;
        server 127.0.0.1:8001 max_fails=1 fail_timeout=5s;
    }

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;

        location / {
            proxy_pass http://career_platform;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_next_upstream error timeout http_502 http_503;
        }
    }
    EOF
    $VM_SSH 'sudo ln -sf /etc/nginx/sites-available/career-platform /etc/nginx/sites-enabled/career-platform \
      && sudo rm -f /etc/nginx/sites-enabled/default \
      && sudo nginx -t && sudo systemctl reload nginx'
    ```
  - **Check:** `$VM_SSH 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/; curl -s http://127.0.0.1/ | grep -o "Michael Johnson" | head -1'` prints `200` and `Michael Johnson` (not "Welcome to nginx").
  - **Result (2026-10-01):** Ran the commands above. `tee` output went to `/dev/null` so the file wasn't echoed back. The `$host` variables were written as-is (checked with `grep`).
    - `nginx -t` → `syntax is ok`, `test is successful`; reload exit 0 ✅
    - `sites-enabled` now holds only `career-platform`; the default site is gone ✅
    - `curl http://127.0.0.1/` → `200` and `Michael Johnson`; "Welcome to nginx" appears 0 times ✅
    - `ss` → nginx listens on `0.0.0.0:80` and `[::]:80` ✅
  - **Undo:** `sudo rm /etc/nginx/sites-enabled/career-platform && sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && sudo systemctl reload nginx`

## Section 3: Firewall rule for port 80 (you, in the portal)

**What this is:** Azure's network security group (NSG) is a firewall in front of the VM. Traffic only gets in if a rule allows it. Port 80 needs a rule. Port 8000 must not have one.

- [x] **Step 1: Set `Allow-HTTP-80` to priority 320**
  - **Where:** Azure portal → `vm-career-platform` → *Networking → Network settings*
  - **Do:** A rule named `Allow-HTTP-80` already exists (priority 310, any source, port 80). Rule names must be unique, so open that rule and change its priority to **320** and its protocol to **TCP**. Keep source *Any*, port *80*, action *Allow*. (Alternatively, delete it and re-add it with these values.)
  - **Check (laptop, read only):**
    ```bash
    az network nsg rule list -g rg-career-platform --nsg-name vm-career-platformNSG \
      --query "[].{name:name, priority:priority, port:destinationPortRange, src:sourceAddressPrefix}" -o table
    ```
    Expected: exactly `Allow-SSH-Laptop` (300, 22) and `Allow-HTTP-80` (320, 80, `*`). No rule mentions 8000 or 8001.
  - **Result (2026-10-01):** The user changed the existing rule in the portal. `az network nsg rule list` → `Allow-SSH-Laptop` 300 TCP 22 from `<laptop-ip>/32`, and `Allow-HTTP-80` **320 TCP 80** from `*`. Both Allow, Inbound. No other rules, nothing for 8000 or 8001 ✅

## Section 4: Check from the Internet

**What this is:** The final check, run from outside the VM the way a visitor would reach it.

- [x] **Step 1: The site loads with no port number, and port 8000 stays closed**
  - **Where:** laptop
  - **Run:**
    ```bash
    curl -s -o /dev/null -w "port 80: %{http_code}\n" http://135.232.245.90/
    curl -s http://135.232.245.90/ | grep -o "Michael Johnson" | head -1
    curl -s -m 5 -o /dev/null -w "port 8000: %{http_code}\n" http://135.232.245.90:8000/ || echo "port 8000: closed"
    ```
  - **Check:** `port 80: 200`, `Michael Johnson`, and `port 8000: 000` / `closed`. Then open `http://135.232.245.90` in a browser.
  - **Result (2026-10-01, from the laptop):** `port 80: 200` ✅ · `Michael Johnson` ✅ · `port 8000: 000` / `closed` ✅ · also tried 8001: `000` / `closed` ✅. Still to do: open the site in a browser (user).

- [x] **Step 2: Boot and crash settings are in place (no crash or reboot test)**
  - **Where:** VM
  - **Run:** `$VM_SSH 'systemctl show career-platform@8000 -p User -p Restart -p UnitFileState; systemctl is-enabled nginx'`
  - **Check:** `User=azureuser`, `Restart=always`, `UnitFileState=enabled`, `enabled`.
  - **Result (2026-10-01 22:20 PDT, second try):** The user changed `Allow-SSH-Laptop` to `<laptop-ip-2>/32` (matches the laptop's IP) and started the VM. `az vm show` → `VM running`, and the VM had been up for 0 minutes.
    - `career-platform@8000` and `@8001`: `User=azureuser`, `Restart=always`, `UnitFileState=enabled`, `ActiveState=active` ✅
    - nginx: `enabled`, `active` ✅
    - Step 1 again, from the laptop: `port 80: 200`, `Michael Johnson`, `port 8000: 000` / `closed` ✅
    - Both copies and nginx came back after a cold start without anyone starting them, which shows they start at boot.
  - **First try (2026-10-01 20:11 PDT): NOT RUN.** SSH failed: `connect to host 135.232.245.90 port 22: No route to host`. Two causes:
    1. Auto-shutdown deallocated the VM at 18:02 PDT, just after Step 1's checks passed. The activity log shows `deallocate/action` at `2026-10-02T01:02Z` by the scheduler, not by the user. `az vm show` → `VM deallocated`, and the site is offline (`port 80 now: 000`).
    2. The laptop's IP changed to `<laptop-ip-2>`, but `Allow-SSH-Laptop` still allows only `<laptop-ip>/32`.
    Section 1 already confirmed `azureuser` and both copies `enabled`, and Section 2 confirmed nginx `enabled`. This step still needs `Restart=always` read back from systemd.

You run the crash and reboot tests yourself (for example, `sudo kill <pid>` of one copy, then `sudo reboot`).

## Section 5: Your domain (guide section 7)

**What this is:** `michaeljportfolio.me` is registered at Namecheap (the *registrar*, which records that you own the name). Namecheap points to Cloudflare's name servers (Cloudflare is the *DNS host*, which answers lookups for the name). Cloudflare holds two A records, `@` and `www`, that point to the VM's public IP. Both are *DNS only* (gray cloud), so browsers connect straight to the VM.

- [x] **Step 1: The name servers are Cloudflare's, and the name points to the VM**
  - **Where:** laptop
  - **Run:** `nslookup -type=NS michaeljportfolio.me`, `nslookup michaeljportfolio.me`, `nslookup michaeljportfolio.me 1.1.1.1`, `nslookup www.michaeljportfolio.me 1.1.1.1`
  - **Check:** NS records are `*.ns.cloudflare.com`, and both names return `135.232.245.90` (not a `104.` or `172.` Cloudflare proxy address).
  - **Result (2026-10-06 14:51 PDT):** NS → `walt.ns.cloudflare.com`, `gloria.ns.cloudflare.com` ✅. `michaeljportfolio.me` → `135.232.245.90` from both the campus resolver and `1.1.1.1` ✅. `www.michaeljportfolio.me` → `135.232.245.90` ✅

- [x] **Step 2: The site answers at its name**
  - **Where:** laptop and VM
  - **Run:** `curl http://michaeljportfolio.me/` and `curl http://www.michaeljportfolio.me/`, from the laptop and from the VM
  - **Check:** `200` with `Michael Johnson` on the page.
  - **Result (2026-10-06):**
    - From the VM: both names → `200`, `Michael Johnson` ✅
    - From the laptop on campus Wi-Fi: both names → `503` with LMU's "Web Page Blocked" page. That's the campus filter, which blocks new domains it hasn't reviewed yet, not the site. nginx's access log shows no request from outside for the domain, so the filter stopped it before it reached the VM.
    - Still to do: open `http://michaeljportfolio.me` on a phone with Wi-Fi off (user).

## Section 6: Restart and break it (guide section 6)

**What this is:** These tests show the setup recovers on its own. The restart test shows systemd starts everything at boot. The break tests show nginx and `Restart=always` recover from a crash. This app has no Uvicorn-style main process: each copy is its own systemd service, so systemd replaces a dead copy and nginx sends visitors to the other copy in the meantime.

- [x] **Step 1: Restart test**
  - **Where:** portal (user selects **Restart** on the VM's Overview page), then the VM (read-only checks)
  - **Check:** the boot time changes, every service started on its own a few seconds after boot, and the site answers through nginx with your name.
  - **Result (2026-10-06):**
    - Before: boot `2026-10-06 21:46:57 UTC`; `@8000` pid 668, `@8001` pid 669, nginx pid 758, all started `21:47:07`.
    - After the user's portal Restart: `az vm show` → `VM running`; boot `2026-10-06 21:54:08 UTC` ✅
    - `career-platform@8000` and `@8001`: `active`, started `21:54:17 UTC`, 9 s after boot ✅. nginx: `active`, started `21:54:18 UTC` ✅ (pid 773). Nobody logged in.
    - The copies got pids 668 and 669 again. Linux hands out IDs in the same order on a fresh boot, so the start timestamps are the evidence, not the pids.
    - `curl http://127.0.0.1/` with `Host: michaeljportfolio.me` → `200`, `Michael Johnson`, header `Server: nginx/1.24.0 (Ubuntu)` ✅. From the laptop, `http://135.232.245.90/` → `200` ✅

- [x] **Step 2: Kill one copy (`kill -9`)**
  - **Where:** VM (run in manual mode, so the user approved each command)
  - **Check:** the site keeps answering while systemd replaces the killed copy with a new process ID.
  - **Result (2026-10-06 21:56 UTC):** Killed `@8000` (pid 668) while sending a request every 0.5 s. All 12 requests returned `200` ✅, because nginx sent them to `@8001`. Journal: `Main process exited, code=killed, status=9/KILL` at 21:56:30 → `Scheduled restart job, restart counter is at 1` at 21:56:32 → `Ready in 573ms`. New pid 1270 ✅. `@8001` kept pid 669 ✅. systemd's `Restart=always` replaced the copy, and nginx covered the gap.

- [x] **Step 3: Kill both copies (`kill -9`)**
  - **Where:** VM
  - **Why:** this is the closest match to the guide's "kill the main Uvicorn process". With nothing left to answer, the site goes down until systemd brings it back.
  - **Result (2026-10-06 21:56:48 UTC):** Killed pids 1270 and 669. Requests over the next 4 s returned `502` ×8 (expected, since nothing was behind nginx). `systemctl status` showed both copies `active (running) since 21:56:50`, 2 s after the kill, with new pids 1394 and 1395 ✅. Site back to `200` ✅
  - **Note:** the copies were back at 21:56:50, but nginx kept answering 502 until about 21:56:52. Its log says `no live upstreams`. After both copies failed, nginx waits out `fail_timeout=5s` before trying them again. That's at most a few extra seconds of 502 after a full crash. Lowering `fail_timeout` would shorten it, but that's optional and not done.

- [x] **Step 4: Stop the service and see who answers**
  - **Where:** VM
  - **Result (2026-10-06 21:57:18 UTC):** `sudo systemctl stop career-platform@8000 career-platform@8001` → both `inactive`. `curl -i http://localhost/` → `HTTP/1.1 502 Bad Gateway`, `Server: nginx/1.24.0 (Ubuntu)`: nginx is up, and the app behind it isn't. Error log: `connect() failed (111: Connection refused) while connecting to upstream` for both `127.0.0.1:8001` and `127.0.0.1:8000`. Started both again → `active`, `active`. Site `200` on the VM and `200` from the laptop ✅

## Record (guide section 8)

Collected 2026-10-06 after the restart and break tests.

### Every port listening on the VM (`sudo ss -ltnp`)

| Address : port | Program | Reachable from | Why |
|---|---|---|---|
| `0.0.0.0:22`, `[::]:22` | `sshd` | Internet, but the firewall allows only the laptop | Remote admin over SSH |
| `0.0.0.0:80`, `[::]:80` | `nginx` (master + 2 workers) | Internet | The front door: takes every visitor request and passes it to the app |
| `127.0.0.1:8000` | `next-server` (`career-platform@8000`) | Only inside the VM (loopback) | App copy 1, behind nginx |
| `127.0.0.1:8001` | `next-server` (`career-platform@8001`) | Only inside the VM (loopback) | App copy 2, behind nginx |
| `127.0.0.53:53`, `127.0.0.54:53` | `systemd-resolved` | Only inside the VM | Ubuntu's local DNS helper |

Only ports 22 and 80 listen on `0.0.0.0` (all addresses). The app listens on `127.0.0.1`, so the only way in from outside is through nginx.

### Addresses

| | Address | Where it lives |
|---|---|---|
| Private IP | `10.0.0.4/24` on `eth0` | On the VM. Works only inside Azure's virtual network. |
| Public IP | `135.232.245.90` (Standard SKU, static) | In Azure, not on the VM. `ip addr` on the VM never shows it. Azure receives traffic for it and forwards it to `10.0.0.4`. |
| Domain | `michaeljportfolio.me`, `www.michaeljportfolio.me` | Cloudflare A records (DNS only) → `135.232.245.90` |

### Inbound rules in `vm-career-platformNSG`

| Name | Priority | Protocol / port | Source | Why it exists |
|---|---|---|---|---|
| `Allow-SSH-Laptop` | 300 | TCP 22 | `<laptop-ip>/32` | Lets only the user's laptop SSH in. Update it when the laptop's network changes. |
| `Allow-HTTP-80` | 320 | TCP 80 | Any | Lets every visitor reach nginx. Port 80 is meant to be public. |

There's no rule for 8000 or 8001, so the app ports stay closed to the Internet. Everything not allowed above is dropped by Azure's default `DenyAllInBound` rule.
