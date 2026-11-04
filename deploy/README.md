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
DATABASE_URL=postgresql://postgres:<password>@<rds-endpoint>:5432/postgres?sslmode=verify-full&sslrootcert=/etc/rds-ca.pem
DATABASE_CA_CERT_PATH=/etc/rds-ca.pem
NODE_ENV=production
PORT=3000
```

Both certificate settings point at the same file deliberately. `DATABASE_CA_CERT_PATH` is read by
`src/db/client.ts` for the Node pool; `sslrootcert` in the URL is read by libpq, which is what
`psql` and `pg_restore` use during the restore. Neither tool reads the other's setting.

## First build vs. later deploys

`deploy.sh` runs migrations and restarts the service, so it only makes sense once the database has
been restored. The very first build on a fresh instance is `npm ci && npm run build` by hand,
before any data exists.
