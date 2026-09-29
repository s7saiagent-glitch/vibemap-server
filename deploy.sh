#!/bin/bash
# VibeMap — رفع نسخة الويب على السيرفر (Ubuntu + Nginx)
# الاستخدام:  bash deploy.sh vibemap.example.com [رمز-فك-ملف-الإشعارات] [reset-admin]
set -e
DOMAIN="$1"
SA_PASS="$2"
RESET_ADMIN="$3"
if [ "$SA_PASS" = "reset-admin" ]; then SA_PASS=""; RESET_ADMIN="reset-admin"; fi
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
mkdir -p /opt/vibemap-relay /etc/vibemap && chmod 700 /etc/vibemap
if [ -n "$SA_PASS" ] && [ -f /opt/vibemap-relay/sa.enc ]; then
  # v8.2: الملف يُنشأ بصلاحية صاحبه فقط، والرمز ما يظهر في قائمة العمليات
  ( umask 077; VM_SA_PASS="$SA_PASS" openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -a -A -pass env:VM_SA_PASS -in /opt/vibemap-relay/sa.enc -out /etc/vibemap/service-account.json.new 2>/dev/null )
  if grep -q private_key /etc/vibemap/service-account.json.new 2>/dev/null; then
    mv /etc/vibemap/service-account.json.new /etc/vibemap/service-account.json; chmod 600 /etc/vibemap/service-account.json; echo "✅ ملف الإشعارات جاهز"
  else rm -f /etc/vibemap/service-account.json.new; echo "⚠️  رمز فك ملف الإشعارات غلط — التوصيل يشتغل بدون إشعارات"; fi
fi
unset SA_PASS
# v8.2: الخادم يشتغل بمستخدم مؤقت بدون صلاحيات (مو root). لو Node مثبت داخل /root ننسخه لمكان يوصله
case "$NODE" in /root/*|/home/*) install -m 755 "$(readlink -f "$NODE")" /opt/vibemap-relay/node; NODE=/opt/vibemap-relay/node;; esac
# نقل بيانات قديمة لمكانها الجديد الخاص بالمستخدم المؤقت
if [ -d /var/lib/vibemap-relay ] && [ ! -L /var/lib/vibemap-relay ] && [ ! -e /var/lib/private/vibemap-relay ]; then
  systemctl stop vibemap-relay 2>/dev/null || true
  mkdir -p /var/lib/private && chmod 700 /var/lib/private && mv /var/lib/vibemap-relay /var/lib/private/vibemap-relay
fi

# ─── v8.4: كلمة سر لوحة التحكم (تنشأ مرة وحدة وتطلع لك في آخر الأمر) ───
ADMIN_PW=""
if [ ! -s /etc/vibemap/admin.json ] || [ "$RESET_ADMIN" = "reset-admin" ]; then
  ADMIN_PW=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-16)
  ( umask 077; VM_PW="$ADMIN_PW" "$NODE" -e 'const c=require("crypto"),s=c.randomBytes(16);process.stdout.write(JSON.stringify({salt:s.toString("hex"),hash:c.scryptSync(process.env.VM_PW,s,32).toString("hex")}))' > /etc/vibemap/admin.json.new )
  mv /etc/vibemap/admin.json.new /etc/vibemap/admin.json; chmod 600 /etc/vibemap/admin.json
fi

# ─── v8.4: خادم TURN خاص (coturn) — يوصل الصوت حتى لو شبكة الجوال تمنع الاتصال المباشر ───
PUBIP=$(curl -fsS -4 --max-time 8 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
PRIVIP=$(hostname -I | awk '{print $1}')
TURN_HOST=""
if ! command -v turnserver >/dev/null; then
  echo "⚙️  تثبيت خادم TURN..."
  (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq coturn) >/dev/null 2>&1 || echo "⚠️  ما قدرنا نثبت coturn — التطبيق يستخدم خوادم TURN العامة"
fi
if command -v turnserver >/dev/null && [ -n "$PUBIP" ]; then
  [ -s /etc/vibemap/turn.secret ] || ( umask 077; openssl rand -hex 32 > /etc/vibemap/turn.secret )
  EXTIP="$PUBIP"; [ -n "$PRIVIP" ] && [ "$PRIVIP" != "$PUBIP" ] && EXTIP="$PUBIP/$PRIVIP"
  cat > /etc/turnserver.conf <<TURNCONF
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=$(cat /etc/vibemap/turn.secret)
realm=$DOMAIN
external-ip=$EXTIP
min-port=49160
max-port=49999
total-quota=400
user-quota=12
stale-nonce=600
no-multicast-peers
no-cli
no-tls
no-dtls
no-tcp-relay
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.0.0.0-192.0.0.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=198.18.0.0-198.19.255.255
denied-peer-ip=240.0.0.0-255.255.255.255
denied-peer-ip=::1
denied-peer-ip=fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff
denied-peer-ip=fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff
syslog
simple-log
TURNCONF
  chown root:turnserver /etc/turnserver.conf 2>/dev/null && chmod 640 /etc/turnserver.conf || chmod 644 /etc/turnserver.conf
  [ -f /etc/default/coturn ] && sed -i 's/^#*\s*TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
  systemctl enable coturn >/dev/null 2>&1 || true
  systemctl restart coturn || true; sleep 1
  if systemctl is-active --quiet coturn; then TURN_HOST="$PUBIP"; echo "✅ خادم TURN شغال على $PUBIP:3478"
  else echo "⚠️  خادم TURN ما اشتغل:"; journalctl -u coturn -n 6 --no-pager || true; fi
fi
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 3478/udp >/dev/null; ufw allow 3478/tcp >/dev/null; ufw allow 49160:49999/udp >/dev/null
fi

# ─── v8.4: خادم التعارف الخاص (بدل خادم PeerJS العام اللي يتعطل أحياناً) ───
SIGNAL_URL=""
NPM=$(command -v npm || true); [ -z "$NPM" ] && [ -x "$(dirname "$(readlink -f "$(command -v node)")")/npm" ] && NPM="$(dirname "$(readlink -f "$(command -v node)")")/npm"
mkdir -p /opt/vibemap-peer
if [ ! -d /opt/vibemap-peer/node_modules/peer ] && [ -n "$NPM" ]; then
  echo "⚙️  تثبيت خادم التعارف..."
  ( cd /opt/vibemap-peer && [ -f package.json ] || echo '{"name":"vibemap-peer","private":true}' > /opt/vibemap-peer/package.json
    cd /opt/vibemap-peer && "$NPM" install --omit=dev --no-audit --no-fund --silent peer@1.0.2 ) >/dev/null 2>&1 || echo "⚠️  ما قدرنا نثبت خادم التعارف — التطبيق يستخدم الخادم العام"
fi
if [ -d /opt/vibemap-peer/node_modules/peer ]; then
  cat > /opt/vibemap-peer/run.js <<'PEERJS'
const express = require('express'); const { ExpressPeerServer } = require('peer'); const http = require('http');
const app = express(); app.disable('x-powered-by'); const server = http.createServer(app);
app.use('/', ExpressPeerServer(server, { path: '/', proxied: true, allow_discovery: false, alive_timeout: 90000, expire_timeout: 8000, concurrent_limit: 20000 }));
server.listen(9001, '127.0.0.1', () => console.log('VibeMap signal on 9001'));
PEERJS
  cat > /etc/systemd/system/vibemap-peer.service <<UNITP
[Unit]
Description=VibeMap signaling (PeerJS)
After=network.target

[Service]
ExecStart=$NODE /opt/vibemap-peer/run.js
DynamicUser=yes
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
MemoryMax=400M
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
UNITP
  systemctl daemon-reload; systemctl enable vibemap-peer >/dev/null 2>&1 || true; systemctl restart vibemap-peer || true; sleep 2
  if curl -fsS http://127.0.0.1:9001/peerjs/id >/dev/null; then SIGNAL_URL="https://$DOMAIN/signal/"; echo "✅ خادم التعارف شغال"
  else echo "⚠️  خادم التعارف ما اشتغل — التطبيق يستخدم الخادم العام"; journalctl -u vibemap-peer -n 6 --no-pager || true; fi
fi
CRED=""; [ -f /etc/vibemap/service-account.json ] && CRED="LoadCredential=sa:/etc/vibemap/service-account.json"
CRED="$CRED
LoadCredential=admin:/etc/vibemap/admin.json"
[ -s /etc/vibemap/turn.secret ] && [ -n "$TURN_HOST" ] && CRED="$CRED
LoadCredential=turn:/etc/vibemap/turn.secret"
RENV="PORT=8095 HOST=127.0.0.1"; [ -n "$TURN_HOST" ] && RENV="$RENV TURN_HOST=$TURN_HOST"; [ -n "$SIGNAL_URL" ] && RENV="$RENV SIGNAL_URL=$SIGNAL_URL"
cat > /etc/systemd/system/vibemap-relay.service <<UNIT
[Unit]
Description=VibeMap relay
After=network.target

[Service]
ExecStart=$NODE /opt/vibemap-relay/server.js
Environment=$RENV DATA_DIR=/var/lib/vibemap-relay
$CRED
DynamicUser=yes
StateDirectory=vibemap-relay
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
RestrictNamespaces=true
RestrictRealtime=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
SystemCallArchitectures=native
SystemCallFilter=@system-service
# v8.4: أي نداء نظام ممنوع يرجع خطأ بدل ما يطيح الخادم (بعض إصدارات Node تجرب io_uring)
SystemCallErrorNumber=EPERM
UMask=0077
MemoryMax=600M
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable vibemap-relay >/dev/null 2>&1 || true
systemctl restart vibemap-relay
sleep 2
if curl -fsS http://127.0.0.1:8095/api/health >/dev/null; then echo "✅ خادم التوصيل شغال بصلاحيات محدودة ($(curl -fsS http://127.0.0.1:8095/api/health))"
else
  echo "⚠️  التشغيل بصلاحيات محدودة ما نجح على هذا السيرفر — نرجع للإعداد السابق:"; journalctl -u vibemap-relay -n 8 --no-pager || true
  DDIR=/var/lib/private/vibemap-relay; [ -d "$DDIR" ] || DDIR=/var/lib/vibemap-relay; mkdir -p "$DDIR"
  cat > /etc/systemd/system/vibemap-relay.service <<UNIT2
[Unit]
Description=VibeMap relay
After=network.target

[Service]
ExecStart=$NODE /opt/vibemap-relay/server.js
Environment=$RENV DATA_DIR=$DDIR SA_FILE=/etc/vibemap/service-account.json
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$DDIR
ProtectHome=read-only
MemoryMax=600M

[Install]
WantedBy=multi-user.target
UNIT2
  systemctl daemon-reload; systemctl restart vibemap-relay; sleep 2
  if curl -fsS http://127.0.0.1:8095/api/health >/dev/null; then echo "✅ خادم التوصيل شغال"; else echo "❌ خادم التوصيل ما اشتغل:"; journalctl -u vibemap-relay -n 15 --no-pager; fi
fi
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

# v8.4: مسار خادم التعارف + حماية صفحة لوحة التحكم
python3 - "$CONF" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read(); o=s
if "location /signal/" not in s:
    s=s.replace("    location /relay/ {", """    location /signal/ {
        proxy_pass http://127.0.0.1:9001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 120s;
    }
    location /relay/ {""", 1)
if "location ^~ /admin/" not in s:
    s=s.replace("    location /app/ {", """    location ^~ /admin/ {
        add_header Cache-Control "no-store" always;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer" always;
        try_files $uri $uri/ /admin/index.html;
    }
    location /app/ {""", 1)
if s!=o: open(p,"w").write(s)
PY

# v8.2: حد للطلبات على الخادم (ضد الإغراق) + HSTS
echo 'limit_req_zone $binary_remote_addr zone=vmrelay:10m rate=15r/s;' > /etc/nginx/conf.d/vibemap-limits.conf
python3 - "$CONF" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read(); o=s
if "limit_req zone=vmrelay" not in s:
    s=s.replace("location /relay/ {", "location /relay/ {\n        limit_req zone=vmrelay burst=60 nodelay;\n        limit_req_status 429;")
if "Strict-Transport-Security" not in s and "ssl_certificate" in s:
    s=s.replace('add_header X-Content-Type-Options "nosniff" always;', 'add_header X-Content-Type-Options "nosniff" always;\n    add_header Strict-Transport-Security "max-age=31536000" always;', 1)
if s!=o: open(p,"w").write(s)
PY

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
echo "🛠️  لوحة التحكم: https://$DOMAIN/admin/"
if [ -n "$ADMIN_PW" ]; then
  echo "🔑 كلمة سر لوحة التحكم: $ADMIN_PW"
  echo "   احفظها الحين — ما تطلع مرة ثانية. (لو نسيتها: شغّل نفس الأمر وأضف في آخره: reset-admin)"
fi
