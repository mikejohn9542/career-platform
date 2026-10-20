# Practice: what happens when you enter a domain and press Enter

Interview practice notes for `michaeljportfolio.me`. Both diagrams describe the site as it runs
on Railway, recorded 2026-10-20.

## The request and the response, end to end

DNS resolution, the TCP and TLS handshakes, the database read, and the render.

```mermaid
sequenceDiagram
    autonumber
    actor U as You
    participant B as Browser
    participant R as Recursive resolver
    participant A as Authoritative DNS<br/>(Cloudflare)
    participant E as Edge / TLS<br/>(Railway)
    participant S as App server<br/>(Next.js)
    participant D as PostgreSQL

    U->>B: types the domain, presses Enter
    Note over B: parse input, normalize the URL,<br/>check HSTS to pick http vs https
    B->>B: check browser cache, then OS cache and hosts file
    B->>R: A? michaeljportfolio.me
    Note over R,A: on a cache miss the resolver walks<br/>root → .me → the zone's name servers
    R->>A: A? michaeljportfolio.me
    A-->>R: address, TTL 300
    R-->>B: address
    B->>E: TCP SYN to address:443
    E-->>B: SYN-ACK
    B->>E: ACK — connection open
    B->>E: TLS ClientHello (SNI + ALPN)
    E-->>B: certificate chain + key exchange
    Note over B: verify name, trusted CA and dates,<br/>then derive session keys
    B->>E: GET / HTTP/2, Host header (encrypted)
    E->>S: plain HTTP + X-Forwarded-Proto: https
    S->>D: SELECT profile and projects
    D-->>S: rows
    S-->>E: 200 + HTML
    E-->>B: 200 + HTML (encrypted)
    Note over B: build the DOM, discover<br/>CSS, JS, fonts, images
    B->>E: fetch subresources (same connection)
    E-->>B: 200 each
    Note over B: render and run JS,<br/>gtag.js reports to GA4
```

## When the first answer is a redirect

A 3xx does not render: the browser starts over at the `Location` header, and a different host needs
a fresh DNS lookup. This domain has two such hops.

```mermaid
flowchart LR
    A["http://michaeljportfolio.me"] -->|301 Railway edge| C
    B["www.michaeljportfolio.me<br/>proxied A 192.0.2.1"] -->|301 Cloudflare rule| C
    C["https://michaeljportfolio.me"] --> D["200 — HTML from PostgreSQL"]
```

The `www` hop never reaches a server. `192.0.2.1` is a reserved documentation address that exists
only to give Cloudflare's proxy a hostname to attach the redirect rule to, so Cloudflare answers the
301 itself.
