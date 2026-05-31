# Studio Aruo Launch Checklist

Use this checklist when deploying the project to a fresh Linux server.

## 1. Prepare Server

Recommended:

- Ubuntu 22.04 or newer
- 2 CPU / 2 GB RAM or higher
- Open ports: 80, 443, 22

Update system:

```bash
sudo apt update
sudo apt upgrade -y
```

Install base tools:

```bash
sudo apt install -y curl git nginx
```

Install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install PM2:

```bash
sudo npm install -g pm2
```

## 2. Upload Project

Create project directory:

```bash
sudo mkdir -p /var/www/studio-aruo
sudo chown -R $USER:$USER /var/www/studio-aruo
```

Upload or clone project into:

```bash
/var/www/studio-aruo
```

Then:

```bash
cd /var/www/studio-aruo
npm ci
mkdir -p data logs backups
```

## 3. Configure Environment

Create `.env`:

```bash
nano .env
```

Use:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="https://your-domain.com"

ADMIN_PASSWORD="replace-with-your-admin-password"
VITE_ADMIN_PASSWORD="demo-admin"
ADMIN_TOKEN_SECRET="replace-with-a-long-random-string"

PORT="3002"
ARUO_DB_PATH="/var/www/studio-aruo/data/db.json"
ARUO_BACKUP_DIR="/var/www/studio-aruo/backups"
ARUO_BACKUP_KEEP="30"
```

Generate a strong token secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put that value into `ADMIN_TOKEN_SECRET`.

## 4. Build Frontend

```bash
npm run build
```

Check output:

```bash
ls -la dist
```

## 5. Start API

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Check:

```bash
pm2 status
curl http://127.0.0.1:3002/api/health
```

Expected response includes:

```json
{"ok":true}
```

## 6. Configure Nginx

Create site config:

```bash
sudo nano /etc/nginx/sites-available/studio-aruo
```

Paste and replace `your-domain.com`:

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

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/studio-aruo /etc/nginx/sites-enabled/studio-aruo
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Domain DNS

In the domain provider dashboard:

- Add `A` record
- Host: `@` or the chosen subdomain
- Value: server public IP

Wait for DNS to resolve:

```bash
ping your-domain.com
```

## 8. Enable HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Renewal test:

```bash
sudo certbot renew --dry-run
```

## 9. Configure Backups

Manual backup:

```bash
npm run backup:db
```

Cron backup:

```bash
crontab -e
```

Add:

```cron
0 3 * * * cd /var/www/studio-aruo && npm run backup:db >> logs/backup.log 2>&1
```

## 10. Final Acceptance

Open:

```txt
https://your-domain.com
```

Check:

- Home page loads.
- Pricing page loads.
- Submit page can submit a requirement.
- Admin page requires password.
- Admin password logs in.
- Admin can update pricing.
- API health works: `https://your-domain.com/api/health`.
- PM2 API process survives restart.
- Backup command creates a file.

## 11. Update Later

Before every update:

```bash
cd /var/www/studio-aruo
npm run backup:db
```

Deploy update:

```bash
git pull
npm ci
npm run build
pm2 restart studio-aruo-api
```

Rollback data if needed:

```bash
pm2 stop studio-aruo-api
npm run restore:db -- backups/db-YYYY-MM-DDTHH-MM-SS-000Z.json
pm2 start studio-aruo-api
```
