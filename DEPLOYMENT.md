# WriteX isolated production deployment

This runbook deploys `writex.co.in` alongside, but completely separate from, the existing `thewritex.com` application.

Create the private GitHub repository first from the approved workstation checkout (replace `<GITHUB_ORG>`):

```bash
gh repo create <GITHUB_ORG>/writex-co-in-website --private --source=. --remote=origin
git push -u origin main
```

Creating the repository does not deploy it. Production deployment remains a separate manual action.

## Isolation contract

| Resource | New WriteX application |
| --- | --- |
| Repository | `writex-co-in-website` |
| App root | `/var/www/writex-co-in` |
| Current release | `/var/www/writex-co-in/current` |
| Shared environment | `/var/www/writex-co-in/shared/.env.production` |
| PM2 process | `writex-co-in` |
| Listener | `127.0.0.1:3002` |
| Database / role | `writex_co_in` / `writex_co_in_app` |
| Nginx site | `/etc/nginx/sites-available/writex.co.in` |

Never modify `/var/www/thewritex`, database `thewritex`, PM2 process `thewritex`, port `3001`, or its Nginx configuration. Never use `pm2 restart all`.

## 1. Preflight on the server

Connect to `43.205.194.174`, then verify the existing application without changing it:

```bash
ssh ubuntu@43.205.194.174
node --version
pnpm --version
pm2 describe thewritex
sudo ss -ltnp | grep -E ':3001\b|:3002\b|:5432\b'
sudo nginx -T 2>/dev/null | grep -n 'server_name thewritex.com'
```

Create only the new WriteX directories:

```bash
sudo install -d -o ubuntu -g www-data -m 750 \
  /var/www/writex-co-in \
  /var/www/writex-co-in/releases \
  /var/www/writex-co-in/shared \
  /var/www/writex-co-in/logs \
  /var/www/writex-co-in/backups
```

## 2. Create the isolated PostgreSQL database

Generate a URL-safe password and keep it in a password manager:

```bash
openssl rand -hex 32
sudo -u postgres createuser --pwprompt writex_co_in_app
sudo -u postgres createdb --owner=writex_co_in_app --encoding=UTF8 writex_co_in
sudo -u postgres psql -d writex_co_in -c 'REVOKE CREATE ON SCHEMA public FROM PUBLIC;'
sudo -u postgres psql -d writex_co_in -c 'GRANT USAGE, CREATE ON SCHEMA public TO writex_co_in_app;'
sudo -u postgres psql -Atqc "select datname from pg_database where datname in ('thewritex','writex_co_in') order by 1;"
```

PostgreSQL must remain local-only. Verify `listen_addresses` and firewall state before continuing:

```bash
sudo -u postgres psql -Atqc 'show listen_addresses;'
sudo ss -ltnp | grep ':5432'
sudo ufw status numbered
```

Do not add a public Lightsail firewall rule for `5432` or `3002`.

## 3. Create the shared production environment

On the workstation, use `.env.production.example` as the field list. On the server:

```bash
sudo -u ubuntu cp /var/www/writex-co-in/source/.env.production.example \
  /var/www/writex-co-in/shared/.env.production
sudo -u ubuntu chmod 600 /var/www/writex-co-in/shared/.env.production
sudo -u ubuntu nano /var/www/writex-co-in/shared/.env.production
```

If `/var/www/writex-co-in/source` is not used, upload only the example first. The database URL must target `writex_co_in` as `writex_co_in_app` on `127.0.0.1`; percent-encode URL-reserved password characters.

Validate without printing secret values:

```bash
cd /var/www/writex-co-in/source
node --env-file=/var/www/writex-co-in/shared/.env.production scripts/validate-production-env.mjs
```

## 4. Initial schema bootstrap (once only)

The checked-in `database/schema.sql` is for the first bootstrap of the new, empty database only. It is not run by the deployment script and must not be reapplied as a migration.

```bash
set -a
source /var/www/writex-co-in/shared/.env.production
set +a
test "$(psql "$DATABASE_URL" -Atqc 'select current_database()')" = 'writex_co_in'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /var/www/writex-co-in/source/database/schema.sql
psql "$DATABASE_URL" -Atqc "select to_regclass('public.quote_leads');"
```

Future database changes must be reviewed, additive migration files with a backup first. Never run destructive migrations in the deployment script.

## 5. Manual release deployment

Create or clone the GitHub repository `writex-co-in-website` into a temporary source directory. Replace `<GITHUB_ORG>` with the repository owner:

```bash
rm -rf /tmp/writex-co-in-source
git clone --depth 1 --branch main \
  git@github.com:<GITHUB_ORG>/writex-co-in-website.git \
  /tmp/writex-co-in-source
cd /tmp/writex-co-in-source
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run build
SOURCE_DIR=/tmp/writex-co-in-source bash scripts/deploy-production.sh
```

The script creates a UTC timestamped release, links the shared environment, repeats lint/typecheck/build inside it, takes a pre-deploy backup when a current release exists, atomically changes `current`, and starts or reloads only `writex-co-in`.

## 6. PM2 verification

```bash
pm2 describe writex-co-in
pm2 logs writex-co-in --lines 100 --nostream
pm2 save
curl --fail http://127.0.0.1:3002/api/health
sudo ss -ltnp | grep '127.0.0.1:3002'
pm2 describe thewritex
```

Use only:

```bash
pm2 startOrReload /var/www/writex-co-in/current/ecosystem.config.cjs \
  --only writex-co-in --update-env
```

## 7. Install the separate Nginx site

The first command intentionally fails if a file already exists, preventing an overwrite:

```bash
sudo test ! -e /etc/nginx/sites-available/writex.co.in
sudo install -o root -g root -m 644 \
  /var/www/writex-co-in/current/deploy/nginx/writex.co.in.conf \
  /etc/nginx/sites-available/writex.co.in
sudo ln -s /etc/nginx/sites-available/writex.co.in \
  /etc/nginx/sites-enabled/writex.co.in
sudo nginx -t
sudo systemctl reload nginx
curl --resolve writex.co.in:80:127.0.0.1 -I http://writex.co.in/api/health
```

This reload does not replace the existing TheWriteX site configuration.

## 8. Network firewall

Lightsail networking should expose only SSH and web traffic. UFW should not expose application or database ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 3002/tcp
sudo ufw deny 5432/tcp
sudo ufw status verbose
sudo ss -ltnp | grep -E ':80\b|:443\b|127.0.0.1:3002\b|:5432\b'
```

## 9. DNS and Google Workspace safety

Before changing DNS, record all mail-related records. Do not delete or replace MX, SPF, DKIM, DMARC, verification, or Google Workspace records:

```bash
dig +short A writex.co.in
dig +short A www.writex.co.in
dig +short MX writex.co.in
dig +short TXT writex.co.in
dig +short TXT _dmarc.writex.co.in
dig +short CNAME www.writex.co.in
```

Set only the web records so `writex.co.in` and `www.writex.co.in` resolve to `43.205.194.174` (an A record for each, or a `www` CNAME to the apex). Re-run the commands until public resolvers return the new web target while mail records remain unchanged:

```bash
dig @1.1.1.1 +short A writex.co.in
dig @8.8.8.8 +short A www.writex.co.in
dig @1.1.1.1 +short MX writex.co.in
dig @1.1.1.1 +short TXT writex.co.in
dig @1.1.1.1 +short TXT _dmarc.writex.co.in
```

## 10. SSL after DNS is correct

Only after both hostnames resolve to `43.205.194.174` and port 80 works:

```bash
sudo certbot --nginx -d writex.co.in -d www.writex.co.in --redirect
sudo certbot renew --dry-run
curl -I https://writex.co.in/
curl -I https://www.writex.co.in/api/health
```

## 11. Rollback

List releases, choose the exact timestamp, then run the guarded rollback:

```bash
ls -1dt /var/www/writex-co-in/releases/*
bash /var/www/writex-co-in/current/scripts/rollback-production.sh 20260715T120000Z
pm2 describe writex-co-in
curl --fail https://www.writex.co.in/api/health
```

Rollback takes a current database backup but does not restore or modify the database. Restore a database dump only after a separate incident review:

```bash
ls -lh /var/www/writex-co-in/backups/writex_co_in_*.dump
pg_restore --list /var/www/writex-co-in/backups/writex_co_in_TIMESTAMP.dump | head
```

## 12. Full verification

```bash
bash /var/www/writex-co-in/current/scripts/verify-production.sh
curl -sS https://www.writex.co.in/api/health | jq
curl -I https://www.writex.co.in/_next/static/
sudo tail -n 100 /var/log/nginx/writex.co.in.error.log
tail -n 100 /var/www/writex-co-in/logs/pm2-error.log
pm2 describe thewritex
```

## 13. Optional manual GitHub Actions deployment

The workflow has only `workflow_dispatch`; it never deploys on push. Configure a protected GitHub Environment named `production` with required reviewers and these secrets:

- `LIGHTSAIL_HOST` = `43.205.194.174`
- `LIGHTSAIL_USER` = `ubuntu`
- `LIGHTSAIL_SSH_PRIVATE_KEY` = deployment-only private key
- `LIGHTSAIL_SSH_KNOWN_HOSTS` = pinned `known_hosts` line collected out of band

Run **Deploy WriteX production manually**, choose an approved ref, and type `DEPLOY_WRITEX_CO_IN`. The workflow uploads source to a temporary directory and invokes the same isolated script. It does not change Nginx, SSL, DNS, PostgreSQL schema, or the existing TheWriteX process.
