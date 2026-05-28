#!/bin/bash

# ==============================================
# DEPLOYMENT SCRIPT — جامعة مملكة الأرض الافتراضية
# Domain: s7sai.cloud
# ==============================================

set -e
DOMAIN="s7sai.cloud"
REPO="https://github.com/s7saiagent-glitch/vibemap-server"
APP_DIR="/opt/vibemap"
DB_PASSWORD="UnivDB@2025Secure"
SECRET_KEY="vibemap-secret-key-$(openssl rand -hex 16)"

echo "🚀 بدء نشر الجامعة..."

# 1. Update system
echo "📦 تحديث النظام..."
apt-get update -qq
apt-get install -y -qq git curl wget nginx certbot python3-certbot-nginx ufw

# 2. Install Docker
echo "🐳 تثبيت Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
fi

if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 3. Clone repo
echo "📥 تحميل المشروع..."
mkdir -p $APP_DIR
cd $APP_DIR
if [ -d "vibemap-server" ]; then
    cd vibemap-server && git pull
else
    git clone $REPO vibemap-server
    cd vibemap-server
fi
git checkout claude/virtual-university-ai-platform-AgGNv

# 4. Create .env
echo "⚙️ إعداد ملف البيئة..."
cat > backend/.env << EOF
DATABASE_URL=postgresql+asyncpg://university:${DB_PASSWORD}@db:5432/university_db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
ANTHROPIC_API_KEY=
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
EOF

# 5. Create docker-compose.prod.yml
echo "🐳 إعداد Docker Compose..."
cat > docker-compose.prod.yml << 'COMPOSE'
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: university
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: university_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql+asyncpg://university:${DB_PASSWORD}@db:5432/university_db
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=60
      - REFRESH_TOKEN_EXPIRE_DAYS=30
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - ALLOWED_ORIGINS=https://s7sai.cloud,https://www.s7sai.cloud
    depends_on:
      - db
      - redis
    restart: unless-stopped
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  pgdata:
COMPOSE

# 6. Create Nginx config
echo "🌐 إعداد Nginx..."
cat > /etc/nginx/sites-available/s7sai.cloud << 'NGINX'
server {
    listen 80;
    server_name s7sai.cloud www.s7sai.cloud;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /docs {
        proxy_pass http://localhost:8000/docs;
    }

    location /openapi.json {
        proxy_pass http://localhost:8000/openapi.json;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/s7sai.cloud /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Setup UFW firewall
echo "🔥 إعداد الجدار الناري..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 8. Build and start containers
echo "🏗️ بناء وتشغيل الحاويات (قد يستغرق 5-10 دقائق)..."
cd $APP_DIR/vibemap-server
export DB_PASSWORD SECRET_KEY ANTHROPIC_API_KEY=""
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for DB to be ready
echo "⏳ انتظار قاعدة البيانات..."
sleep 20

# 9. Run migrations and seed data
echo "🌱 تهيئة قاعدة البيانات والبيانات الأولية..."
docker-compose -f docker-compose.prod.yml exec -T backend python3 -c "
import asyncio
from app.core.database import init_db
asyncio.run(init_db())
print('✓ Tables created')
" 2>/dev/null || echo "Tables may already exist"

docker-compose -f docker-compose.prod.yml exec -T backend python3 seed_data.py 2>/dev/null || echo "Seed data may already exist"

# 10. SSL Certificate
echo "🔒 تثبيت شهادة SSL (HTTPS)..."
certbot --nginx \
    -d s7sai.cloud \
    -d www.s7sai.cloud \
    --non-interactive \
    --agree-tos \
    -m admin@s7sai.cloud \
    --redirect 2>/dev/null || echo "SSL: تأكد أن الدومين يشير لهذا السيرفر"

# 11. Auto-renew SSL
echo "🔄 إعداد تجديد SSL تلقائي..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo ""
echo "=============================================="
echo "✅ تم النشر بنجاح!"
echo "=============================================="
echo "🌐 الموقع:    https://s7sai.cloud"
echo "📖 API Docs:  https://s7sai.cloud/docs"
echo "👤 Admin:     admin@university.edu"
echo "🔑 Pass:      Admin@2025"
echo ""
echo "⚠️  لتفعيل الأستاذ الذكي لاحقاً:"
echo "   nano $APP_DIR/vibemap-server/backend/.env"
echo "   # أضف: ANTHROPIC_API_KEY=sk-ant-..."
echo "   docker-compose -f $APP_DIR/vibemap-server/docker-compose.prod.yml restart backend"
echo "=============================================="
