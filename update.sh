#!/bin/bash
set -e

echo "========================================="
echo "Updating Rovel Platform..."
echo "========================================="

# 1. Reset any local changes to ensure clean pull
git reset --hard HEAD

# 2. Pull latest changes from main branch
git pull origin main

# 3. Install fresh dependencies
npm install

# 4. Apply database schema changes
node -e "const fs = require('fs'); const path = require('path'); const envPath = fs.existsSync('.env.production') ? '.env.production' : '.env'; require('dotenv').config({ path: envPath }); require('child_process').spawn('npm', ['run', 'db:push', '-w', 'packages/db'], { stdio: 'inherit', shell: true })"

# 5. Compile Next.js and worker code
npm run build:all

# 6. Sanitize existing Nginx configs and reload proxy
if [ -d "/etc/nginx/sites-enabled" ]; then
  sudo sed -i 's|proxy_pass http://127.0.0.1:3000/wake?app=[^;]*;|rewrite ^.*$ /wake break;\n        proxy_pass http://127.0.0.1:3000;|g' /etc/nginx/sites-enabled/*.conf 2>/dev/null || true
  sudo nginx -t 2>/dev/null && sudo systemctl reload nginx 2>/dev/null || true
fi

# 7. Restart PM2 services with the updated environment variables
pm2 restart all --update-env

echo "========================================="
echo "Rovel platform updated successfully!"
echo "========================================="
