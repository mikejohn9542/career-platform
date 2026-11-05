# Deployment assets for the AWS EC2 instance

These files live in Git so the instance can be rebuilt without reconstructing its configuration
from memory. Nothing here runs on Railway.

## What each file is, and where it goes

| File | Lands at | Installed with |
| --- | --- | --- |
| `career-platform.service` | `/etc/systemd/system/career-platform.service` | `sudo cp` → `sudo systemctl daemon-reload` → `sudo systemctl enable career-platform` |
| `nginx-aws-bootstrap.conf` | `/etc/nginx/sites-available/aws` (temporarily) | `sudo cp` → symlink into `sites-enabled` → `sudo nginx -t` → `sudo systemctl reload nginx` |
| `nginx-aws.conf` | `/etc/nginx/sites-available/aws` (final) | same, but only after the certificate exists |
| `deploy.sh` | stays in the repo at `/opt/career-platform/deploy/` | `bash deploy/deploy.sh` |

## Order matters for Nginx

`nginx-aws.conf` names certificate files under `/etc/letsencrypt/live/`. Those do not exist until
certbot has run, and `nginx -t` fails on a missing certificate. So:

1. Install `nginx-aws-bootstrap.conf`, reload Nginx.
2. `sudo certbot certonly --webroot -w /var/www/html -d aws.michaeljportfolio.me`
3. Replace it with `nginx-aws.conf`, `sudo nginx -t`, reload Nginx.
4. `sudo certbot renew --dry-run` to prove renewal works.

## The environment file is not in Git

`/etc/career-platform.env` is created by hand on the instance, root-owned, `chmod 600`:

```
DATABASE_URL="postgresql://postgres:<password>@<rds-endpoint>:5432/postgres?sslmode=verify-full&sslrootcert=/etc/rds-ca.pem"
DATABASE_CA_CERT_PATH=/etc/rds-ca.pem
NODE_ENV=production
PORT=3000
```

**Quote `DATABASE_URL`.** systemd's `EnvironmentFile` does not shell-parse, so it is safe unquoted
there, but anything that reads the file in bash - `deploy.sh`, or a human running `source` - would
treat the `&` before `sslrootcert` as a background-job operator and silently truncate the value.
`deploy.sh` extracts with `grep`/`cut` for the same reason.

Both certificate settings point at the same file deliberately, and they are read by different
software:

- `sslrootcert` in the URL is read by **libpq**, which is what `psql` and `pg_restore` use.
- `DATABASE_CA_CERT_PATH` is read by **`src/db/client.ts`** for the Node pool.

They are not interchangeable, and the Node side does not simply inherit the URL's setting. `pg`
applies the parsed connection string *over* the explicit pool config, so a URL carrying `sslmode`
or `sslrootcert` would otherwise replace the CA the code read and drop `rejectUnauthorized`.
`poolConfigFrom()` removes the TLS query parameters before handing the string to `pg` whenever
`DATABASE_CA_CERT_PATH` is set, which makes the code the single authority for the Node pool while
leaving the URL intact for libpq. With no `DATABASE_CA_CERT_PATH` set, the URL's own settings are
left alone and are the only TLS instruction.

## First build vs. later deploys

`deploy.sh` runs migrations and restarts the service, so it only makes sense once the database has
been restored. The very first build on a fresh instance is `npm ci && npm run build` by hand,
before any data exists.
