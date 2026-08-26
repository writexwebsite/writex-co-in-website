#!/usr/bin/env bash
set -Eeuo pipefail

echo "ACTIVE_RELEASE=$(readlink -f /var/www/writex-co-in/current)"
df -hT /
df -i /
echo "---PM2---"
sudo -u writexdeploy -H pm2 list
echo "---HEALTH---"
curl -sS -o /dev/null -w 'WRITEX_LOCAL=%{http_code}\n' http://127.0.0.1:3002/api/health
curl -sS -o /dev/null -w 'WRITEX_PUBLIC=%{http_code}\n' https://www.writex.co.in/api/health
curl -sS -o /dev/null -w 'THEWRITEX_PUBLIC=%{http_code}\n' https://www.thewritex.com/

set -a
source /var/www/writex-co-in/shared/.env.production
set +a
psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 <<'SQL'
select 'ACTIVE_SNAPSHOTS='||count(*) from active_festival_snapshots where state='active';
select 'SCHEDULED_CONFIGS='||count(*) from festival_studio_configurations where activation_status='scheduled';
select 'ACTIVE_OR_SCHEDULED_THEMES='||count(*) from holiday_themes where status in ('active','scheduled');
SQL
