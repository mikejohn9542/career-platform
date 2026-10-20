# DNS records for `michaeljportfolio.me` before adding Zoho Mail

**Captured:** 2026-10-13
**Zone:** `michaeljportfolio.me`
**Command:**

```
cf dns records list --zone michaeljportfolio.me
```

This is the full record set as it stood before any Zoho Mail records (MX, SPF, DKIM,
`zb*` verification) were added. Three records, all of them part of the Railway hosting
setup described in [`README.md`](../../README.md). Use this file to tell a Zoho record
apart from a hosting record, and to restore the zone if an email change breaks the site.

## The records

| Name | Type | Content | Proxied | TTL | Purpose |
| --- | --- | --- | --- | --- | --- |
| `michaeljportfolio.me` | CNAME | `hg6gwx8k.up.railway.app` | No (DNS only) | Auto | Sends the root domain to the Railway service. Must stay **DNS only** so Railway terminates TLS and serves its own certificate. |
| `www.michaeljportfolio.me` | A | `192.0.2.1` | **Yes** | Auto | Placeholder address for the proxied `www` → root 301 Redirect Rule. `192.0.2.1` is a reserved documentation address and is never connected to; the record exists only to give Cloudflare's proxy a hostname to attach the rule to. |
| `_railway-verify.michaeljportfolio.me` | TXT | `railway-verify=d58c746…cd72c1` | No | Auto | Proves domain ownership to Railway. Removing it can un-verify the custom domain. |

No MX, SPF, DKIM, or DMARC records existed at capture time, so the domain accepted no
mail and had no sender policy of its own.

## What this means for the Zoho change

- Zoho adds records at new names (`@` MX, `@` TXT for SPF, and a DKIM selector). None of
  the three records above need to change, and none should be deleted.
- The root `CNAME` and an `MX` record can coexist at `@` on Cloudflare, which flattens the
  CNAME. Web traffic and mail are unaffected by each other.
- An SPF record goes at `@` as a `TXT`. If one is ever added twice the domain fails SPF, so
  check this file first to confirm there was no prior SPF record to merge with.
- Leave the root record **DNS only**. Proxying it would move TLS to Cloudflare and break the
  HTTPS path documented for Exercise 04.

## Raw output

```json
[
  {
    "id": "756acd158c18e70077501bd2f3bcaf2b",
    "name": "www.michaeljportfolio.me",
    "type": "A",
    "content": "192.0.2.1",
    "proxiable": true,
    "proxied": true,
    "ttl": 1,
    "settings": {},
    "meta": {},
    "comment": null,
    "tags": [],
    "created_on": "2026-10-01T21:41:24.601939Z",
    "modified_on": "2026-10-09T19:57:25.477009Z"
  },
  {
    "id": "be9558b6aa230c39a563dc71e39e368f",
    "name": "michaeljportfolio.me",
    "type": "CNAME",
    "content": "hg6gwx8k.up.railway.app",
    "proxiable": true,
    "proxied": false,
    "ttl": 1,
    "settings": {
      "flatten_cname": false
    },
    "meta": {},
    "comment": null,
    "tags": [],
    "created_on": "2026-10-08T22:19:05.717803Z",
    "modified_on": "2026-10-08T22:19:05.717803Z"
  },
  {
    "id": "4aae7aa18065b7921f1084c4c72974c4",
    "name": "_railway-verify.michaeljportfolio.me",
    "type": "TXT",
    "content": "\"railway-verify=d58c74659ed48ab4d7086677d9bdbefcbc0e4c1056e54a95b26d50f505cd72c1\"",
    "proxiable": false,
    "proxied": false,
    "ttl": 1,
    "settings": {},
    "meta": {},
    "comment": null,
    "tags": [],
    "created_on": "2026-10-08T22:19:48.04451Z",
    "modified_on": "2026-10-08T22:19:48.04451Z"
  }
]
```
