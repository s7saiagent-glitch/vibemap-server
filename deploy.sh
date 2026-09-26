#!/bin/bash
# VibeMap — رفع نسخة الويب على السيرفر (Ubuntu + Nginx)
# الاستخدام:  bash deploy.sh vibemap.example.com
set -e
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then echo "❌ اكتب الدومين بعد الأمر، مثال: bash deploy.sh vibemap.s7sai.cloud"; exit 1; fi
if [ "$(id -u)" != "0" ]; then echo "❌ شغّل الأمر كمستخدم root"; exit 1; fi
BRANCH=vibemap-web
BASE=/var/www/vibemap
TMP=$(mktemp -d)
echo "⬇️  تحميل آخر نسخة..."
curl -fsSL "https://codeload.github.com/s7saiagent-glitch/vibemap-server/tar.gz/refs/heads/$BRANCH" | tar xz -C "$TMP"
SRC=$(ls -d "$TMP"/*/www)
[ -f "$SRC/index.html" ] || { echo "❌ التحميل ناقص"; exit 1; }
mkdir -p "$BASE"
if [ -d "$BASE/current" ]; then cp -a "$BASE/current" "$BASE/backup-$(date +%Y%m%d-%H%M%S)"; fi
rm -rf "$BASE/current.new" && cp -a "$SRC" "$BASE/current.new"
rm -rf "$BASE/current" && mv "$BASE/current.new" "$BASE/current"
ls -dt "$BASE"/backup-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
chown -R www-data:www-data "$BASE" 2>/dev/null || true
rm -rf "$TMP"
VER=$(grep -o "const VERSION = '[^']*'" "$BASE/current/app.js" | cut -d"'" -f2)
echo "✅ الملفات جاهزة (الإصدار $VER)"

CONF=/etc/nginx/sites-available/vibemap
if [ ! -f "$CONF" ] || ! grep -q "server_name $DOMAIN;" "$CONF"; then
  echo "⚙️  إعداد Nginx للدومين $DOMAIN ..."
  cat > "$CONF" <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    root $BASE/current;
    index index.html;
    server_tokens off;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "microphone=(self), camera=(self), geolocation=(self)" always;
    add_header X-Frame-Options "DENY" always;

    location = /sw.js {
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    location ~* \.(js|css|png|svg|webmanifest)\$ {
        add_header Cache-Control "public, max-age=3600" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    location ~ /\. { deny all; }
    location / { try_files \$uri \$uri/ /index.html; }
}
NGX
  ln -sf "$CONF" /etc/nginx/sites-enabled/vibemap
  NEW_CONF=1
fi
nginx -t && systemctl reload nginx
echo "✅ Nginx شغال"

if [ -n "$NEW_CONF" ] || ! grep -q "ssl_certificate" "$CONF"; then
  MYIP=$(curl -fsS -4 https://api.ipify.org || hostname -I | awk '{print $1}')
  DNSIP=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
  if [ "$DNSIP" != "$MYIP" ]; then
    echo "⚠️  الدومين $DOMAIN ما يشير لهذا السيرفر ($MYIP) — حالياً يشير إلى: ${DNSIP:-لا شيء}"
    echo "   أضف سجل A في إعدادات الدومين ثم أعد تشغيل نفس الأمر بعد 5 دقائق."
    exit 2
  fi
  command -v certbot >/dev/null || { apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx; }
  echo "🔒 إصدار شهادة SSL..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m s7saiagent@gmail.com --redirect
fi
echo ""
echo "🎉 تم! افتح: https://$DOMAIN"
