# Studio Aruo Deployment

For a step-by-step launch flow, use `docs/launch-checklist.md`.

For a free static showcase, use `docs/github-pages.md`.

## 1. Server

Recommended target:

- Ubuntu 22.04 or newer
- Node.js 20 or newer
- Nginx
- PM2

Project path used in examples:

```bash
/var/www/studio-aruo
```

## 2. Environment

Create `.env` on the server:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="https://your-domain.com"

ADMIN_PASSWORD="replace-with-your-admin-password"
VITE_ADMIN_PASSWORD="demo-admin"
ADMIN_TOKEN_SECRET="replace-with-a-long-random-string"

PORT="3002"
ARUO_DB_PATH="/var/www/studio-aruo/data/db.json"
```

Use a new random `ADMIN_TOKEN_SECRET` in production.

## 3. Install And Build

```bash
cd /var/www/studio-aruo
npm ci
npm run build
mkdir -p logs data
```

## 4. Start API With PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Check API:

```bash
curl http://127.0.0.1:3002/api/health
```

## 5. Nginx

Create an Nginx site:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/studio-aruo/dist;
  index index.html;

  client_max_body_size 60m;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3002/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/studio-aruo /etc/nginx/sites-enabled/studio-aruo
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. Update Deployment

```bash
cd /var/www/studio-aruo
git pull
npm ci
npm run build
pm2 restart studio-aruo-api
```

## 8. Backups

Back up this file regularly:

```bash
/var/www/studio-aruo/data/db.json
```

Manual backup:

```bash
npm run backup:db
```

Restore from a backup:

```bash
pm2 stop studio-aruo-api
npm run restore:db -- backups/db-2026-05-31T12-00-00-000Z.json
pm2 start studio-aruo-api
```

Recommended cron job:

```bash
crontab -e
```

Add:

```cron
0 3 * * * cd /var/www/studio-aruo && npm run backup:db >> logs/backup.log 2>&1
```

The backup script stores files in `backups/` and keeps the latest 30 by default. Override with:

```env
ARUO_BACKUP_DIR="/var/backups/studio-aruo"
ARUO_BACKUP_KEEP="60"
```
