#!/bin/bash
# VibeMap — رفع نسخة الويب على السيرفر (Ubuntu + Nginx)
# الاستخدام:  bash deploy.sh vibemap.example.com [رمز-فك-ملف-الإشعارات]
set -e
DOMAIN="$1"
SA_PASS="$2"
if [ -z "$DOMAIN" ]; then echo "❌ اكتب الدومين بعد الأمر، مثال: bash deploy.sh vibemap.s7sai.cloud"; exit 1; fi
if [ "$(id -u)" != "0" ]; then echo "❌ شغّل الأمر كمستخدم root"; exit 1; fi
BRANCH=vibemap-web
BASE=/var/www/vibemap
TMP=$(mktemp -d)
echo "⬇️  تحميل آخر نسخة..."
curl -fsSL "https://codeload.github.com/s7saiagent-glitch/vibemap-server/tar.gz/refs/heads/$BRANCH" | tar xz -C "$TMP"
SRC=$(ls -d "$TMP"/*/www)
RSRC=$(ls -d "$TMP"/*/relay 2>/dev/null || true)
[ -f "$SRC/index.html" ] || { echo "❌ التحميل ناقص"; exit 1; }
mkdir -p "$BASE"
if [ -d "$BASE/current" ]; then cp -a "$BASE/current" "$BASE/backup-$(date +%Y%m%d-%H%M%S)"; fi
rm -rf "$BASE/current.new"
SITE=$(ls -d "$TMP"/*/site 2>/dev/null || true)
if [ -n "$SITE" ]; then
  # v8.1: الصفحة الرئيسية = موقع التعريف، والتطبيق في /app/
  cp -a "$SITE" "$BASE/current.new" && cp -a "$SRC" "$BASE/current.new/app"
else
  cp -a "$SRC" "$BASE/current.new"
fi
rm -rf "$BASE/current" && mv "$BASE/current.new" "$BASE/current"
ls -dt "$BASE"/backup-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
chown -R www-data:www-data "$BASE" 2>/dev/null || true
if [ -n "$RSRC" ]; then mkdir -p /opt/vibemap-relay && cp "$RSRC/server.js" /opt/vibemap-relay/server.js && { [ -f "$RSRC/sa.enc" ] && cp "$RSRC/sa.enc" /opt/vibemap-relay/sa.enc || true; }; fi
rm -rf "$TMP"
VER=$(grep -oh "const VERSION = '[^']*'" "$BASE/current/app.js" "$BASE/current/app/app.js" 2>/dev/null | head -1 | cut -d"'" -f2)
echo "✅ الملفات جاهزة (الإصدار $VER)"

CONF=/etc/nginx/sites-available/vibemap
if [ ! -f "$CONF" ] || ! grep -q "server_name $DOMAIN;" "$CONF"; then
  echo "⚙️  إعداد Nginx للدومين $DOMAIN ..."
  V6=""; if [ -s /proc/net/if_inet6 ] && ! grep -q "ipv6.disable=1" /proc/cmdline; then V6="listen [::]:80;"; fi
  cat > "$CONF" <<NGX
server {
    listen 80;
    $V6
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

    location ~ (^|/)sw\.js\$ {
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    location ~* \.(js|css|png|svg|webmanifest)\$ {
        add_header Cache-Control "public, max-age=3600" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
    location ~ /\. { deny all; }
    location /relay/ {
        proxy_pass http://127.0.0.1:8095;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        client_max_body_size 5m;
        proxy_read_timeout 30s;
    }
    location /app/ { try_files \$uri \$uri/ /app/index.html; }
    location / { try_files \$uri \$uri/ /index.html; }
}
NGX
  NEW_CONF=1
fi
ln -sf "$CONF" /etc/nginx/sites-enabled/vibemap
# ─── خادم التوصيل (v8.0): رسائل واستغاثة توصل والتطبيق مقفل ───
NODE=$(command -v node || true)
if [ -z "$NODE" ] || [ "$("$NODE" -e 'console.log(+process.versions.node.split(".")[0] >= 18 ? 1 : 0)')" != "1" ]; then
  echo "⚙️  تثبيت Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 && apt-get install -y -qq nodejs >/dev/null 2>&1
  NODE=$(command -v node)
fi
mkdir -p /opt/vibemap-relay /var/lib/vibemap-relay /etc/vibemap
if [ -n "$SA_PASS" ] && [ -f /opt/vibemap-relay/sa.enc ]; then
  if openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -a -A -pass "pass:$SA_PASS" -in /opt/vibemap-relay/sa.enc -out /etc/vibemap/service-account.json.new 2>/dev/null && grep -q private_key /etc/vibemap/service-account.json.new; then
    mv /etc/vibemap/service-account.json.new /etc/vibemap/service-account.json; chmod 600 /etc/vibemap/service-account.json; echo "✅ ملف الإشعارات جاهز"
  else rm -f /etc/vibemap/service-account.json.new; echo "⚠️  رمز فك ملف الإشعارات غلط — التوصيل يشتغل بدون إشعارات"; fi
fi
cat > /etc/systemd/system/vibemap-relay.service <<UNIT
[Unit]
Description=VibeMap relay
After=network.target

[Service]
ExecStart=$NODE /opt/vibemap-relay/server.js
Environment=PORT=8095 HOST=127.0.0.1 DATA_DIR=/var/lib/vibemap-relay SA_FILE=/etc/vibemap/service-account.json
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/vibemap-relay
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable vibemap-relay >/dev/null 2>&1 || true
systemctl restart vibemap-relay
sleep 2
if curl -fsS http://127.0.0.1:8095/api/health >/dev/null; then echo "✅ خادم التوصيل شغال ($(curl -fsS http://127.0.0.1:8095/api/health))"; else echo "❌ خادم التوصيل ما اشتغل:"; journalctl -u vibemap-relay -n 15 --no-pager; fi
# ترقية إعداد قديم (قبل v8.1): التطبيق في /app/ و sw.js بدون تخزين
python3 - "$CONF" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read(); o=s
s=s.replace("location = /sw.js {", "location ~ (^|/)sw\\.js$ {")
if "location /app/" not in s:
    s=s.replace("    location / {", "    location /app/ { try_files $uri $uri/ /app/index.html; }\n    location / {")
if s!=o: open(p,"w").write(s)
PY
# إضافة مسار /relay/ لإعداد قديم (قبل v8.0)
if ! grep -q "location /relay/" "$CONF"; then
  python3 - "$CONF" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
blk="""location /relay/ {
        proxy_pass http://127.0.0.1:8095;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 5m;
        proxy_read_timeout 30s;
    }
    location / {"""
s=s.replace("location / {", blk)
open(p,"w").write(s)
PY
fi

if ! nginx -t; then
  echo "❌ خطأ في إعداد Nginx — ما تغيّر شي في المواقع الثانية. أرسل الرسالة أعلاه لـ Claude."
  rm -f /etc/nginx/sites-enabled/vibemap; exit 1
fi
systemctl reload nginx
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
