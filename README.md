# لبيه (Labbeih) — تطبيق Push-to-Talk عربي

ووكي توكي عربي (اضغط للتحدث) للأفراد والمجموعات والمنشآت في السعودية والخليج.
واجهة عربية RTL بالكامل مع دعم تبديل للإنجليزية (كل النصوص داخل `client/src/i18n/`).

> **حالة المشروع**: المرحلة 1 (MVP) مكتملة ومُختبرة فعلياً (تسجيل دخول OTP → إنشاء منشأة
> → قناة → ضغط-وتحدث → بث فوري → سجل صوتي → قنوات مؤقتة QR → لوحة تحكم). المرحلتان 2 و3
> لم تُبنَ بعد؛ فقط جدول `transcripts` وخطافات Moyasar جاهزة كبنية تحتية.

## قرارات اتخذتها بدون رجوع إليك (راجعها وصحّح ما يلزم)

بما إني ما قدرت أتأكد منك مباشرة قبل البدء، مشيت بهذي الافتراضات الافتراضية:

1. **الشعار**: مجلد `assets/` كان فاضي بالمستودع، فبنيت شعار placeholder بسيط (دائرة عنبرية
   وحرف "ل") بملفي `assets/labbeih-mark.svg` و `assets/labbeih-wordmark.svg`، ونسخته
   بمجلدي `client/public/icons/` و `client/src/assets/`. لما توفر ملفات الشعار الرسمية،
   استبدل هذي الملفات بنفس الأسماء والمقاسات وبكذا يتحدث كل مكان يستخدمه تلقائياً.
2. **النشر على VPS**: ما عندي وصول SSH مباشر لسيرفر Hostinger. جهزت كل شي (كود، PM2،
   Nginx server block منفصل تماماً عن radd.pro، خطوات SSL) لكن **أنت أو Claude Code
   شغّال محلياً على السيرفر لازم ينفذ خطوات النشر** بقسم "النشر على VPS" تحت.
3. **هيكلة المستودع**: بنيتها Monorepo بمجلدين `server/` (الباك إند) و `client/`
   (الفرونت إند PWA) بنفس مستودع `vibemap-server`.

## هيكل المشروع

```
vibemap-server/
├── assets/                     # شعارات SVG (placeholder حالياً)
├── server/                     # الباك إند: Node + Express + Socket.io + PostgreSQL
│   ├── db/
│   │   ├── migrations/001_init.sql
│   │   ├── migrate.js          # مُشغّل الهجرات
│   │   └── seedPlans.js
│   ├── src/
│   │   ├── app.js              # إعداد Express (middlewares + routes)
│   │   ├── server.js           # نقطة البدء (HTTP + Socket.io + جدولة التنظيف)
│   │   ├── config/env.js
│   │   ├── db/                 # طبقة الوصول لقاعدة البيانات (users, workspaces, channels, messages...)
│   │   ├── middleware/         # auth, planLimits, rateLimit, sanitize, workspaceContext
│   │   ├── routes/              # auth, workspaces, channels, messages, admin, plans
│   │   ├── sockets/             # طبقة Socket.io لبث الصوت اللحظي
│   │   ├── services/            # jwt, otpService, audioStorage
│   │   └── jobs/pruneExpired.js # تنظيف دوري للرسائل/القنوات المنتهية
│   ├── ecosystem.config.js      # إعداد PM2 (المنفذ 3005)
│   ├── nginx/labbeih.conf       # server block منفصل عن radd.pro
│   └── .env.example
└── client/                      # الفرونت إند: React + Vite PWA (RTL عربي)
    ├── src/
    │   ├── i18n/                # ar.json / en.json + مزوّد اللغة
    │   ├── theme/tokens.css      # ألوان وخطوط الهوية البصرية
    │   ├── components/           # PTTButton, MessageLog, Header, ChannelView...
    │   ├── pages/                 # Login, Workspace, Channel, Admin, Guest...
    │   ├── hooks/                 # useAuth, useRecorder, useChannelSocket
    │   └── services/               # api.js (REST), socket.js (Socket.io client)
    └── vite.config.js              # يشمل إعداد PWA (manifest + service worker)
```

## الهوية البصرية

| اللون | الاستخدام |
|---|---|
| ليل `#0E1B2C` | خلفية أساسية |
| عنبر البث `#FFB020` | زر PTT ولحظة البث **فقط** |
| عاجي `#F7F3EC` | نصوص |
| نحاسي `#E2643B` | طوارئ وتنبيهات |
| معدني `#8B95A5` | نصوص ثانوية |

الخطوط: **Noto Kufi Arabic** للعناوين، **Tajawal / IBM Plex Sans Arabic** للنصوص (محمّلة عبر Google Fonts بـ `index.html`).

## نموذج الباقات (مطبّق بقاعدة البيانات + middleware)

| | مجاني | مدفوع (29 ريال/مستخدم/شهر) |
|---|---|---|
| القنوات | 1 | بلا حدود |
| الأعضاء | 5 | بلا حدود |
| سجل الصوت | 24 ساعة | بلا حدود مع بحث (المرحلة 2) |
| تفريغ نصي / ملخص AI / موقع / طوارئ | ✗ | ✓ (المرحلة 2/3) |

الحدود تُطبَّق فعلياً بـ `server/src/middleware/planLimits.js` قبل إنشاء قناة أو انضمام عضو جديد.

---

## التشغيل محلياً

### المتطلبات
- Node.js 18+ (اختُبر على 22)
- PostgreSQL 14+ يعمل محلياً

### 1) إعداد قاعدة البيانات

```bash
sudo -u postgres psql -c "CREATE USER labbeih_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE labbeih OWNER labbeih_user;"
```

### 2) الباك إند

```bash
cd server
cp .env.example .env
# عدّل .env: PGPASSWORD, JWT_SECRET على الأقل
npm install
npm run migrate      # ينشئ كل الجداول + يزرع الباقتين الافتراضيتين
npm run dev           # يشتغل على http://localhost:3005 (nodemon)
```

تحقق: `curl http://localhost:3005/health` يرجع `{"ok":true,...}`

بالتطوير `OTP_MODE=mock`، فرمز التحقق يطبع **بطرفية السيرفر** بدل إرساله فعلياً:

```
[OTP mock] الجوال: +9665xxxxxxxx | الكود: 123456 (صالح 300ث)
```

### 3) الفرونت إند

```bash
cd client
npm install
npm run dev            # يشتغل على http://localhost:5173 مع proxy تلقائي لـ /api و /socket.io
```

افتح `http://localhost:5173` بالمتصفح (يفضّل بوضع أدوات المطوّر بمحاكاة جوال RTL).

### تجربة المسار الكامل (اختبرته فعلياً بهذا التسلسل)

1. أدخل رقم جوالك بشاشة الدخول → اضغط "إرسال رمز التحقق"
2. راجع طرفية السيرفر (`npm run dev` بمجلد server) وانسخ الرمز المكوّن من 6 أرقام
3. أدخل الرمز + اسمك → "تحقق ودخول"
4. أنشئ منشأة جديدة (تصير أنت Admin تلقائياً)
5. أنشئ قناة، ادخلها
6. اضغط باستمرار على الزر العنبري وتكلم، أفلت للإرسال — لازم يوصل الصوت ويشتغل تلقائياً
   خلال أقل من ثانيتين (جرّبه بمتصفحين/جهازين بنفس القناة لتشوف البث المتبادل)
7. جرّب "قناة مؤقتة (QR)" من الشاشة الرئيسية → افتح رابط `/join/<token>` بمتصفح آخر
   (بدون تسجيل دخول) → أدخل اسم مستعار → تدخل القناة مباشرة كضيف

---

## النشر على السيرفر (Hostinger VPS - PM2 + Nginx + SSL)

⚠️ **مهم**: عندكم مشروع `radd.pro` شغال على نفس السيرفر. لا تلمس أي ملف أو إعداد خاص فيه.
كل الخطوات تحت تنشئ تطبيق **منفصل تماماً** على المنفذ 3005 وserver block Nginx مستقل.

### 1) رفع الكود للسيرفر

```bash
# على السيرفر
cd /var/www
git clone <رابط المستودع> labbeih
cd labbeih
```

أو بدون git: ارفع مجلدي `server/` و `client/` بأي طريقة نقل ملفات تفضّلها (rsync/scp).

### 2) قاعدة البيانات على السيرفر

```bash
sudo -u postgres psql -c "CREATE USER labbeih_user WITH PASSWORD 'REPLACE_ME_STRONG';"
sudo -u postgres psql -c "CREATE DATABASE labbeih OWNER labbeih_user;"
```

### 3) الباك إند

```bash
cd /var/www/labbeih/server
cp .env.example .env
nano .env   # عدّل PGPASSWORD و JWT_SECRET (قيمة عشوائية طويلة) و CORS_ORIGIN لدومينك
npm install --production
npm run migrate
```

### 4) تشغيل بـ PM2 (بدون التأثير على أي app آخر شغال بـ PM2)

```bash
pm2 start ecosystem.config.js
pm2 save
```

تأكد إنه ما تعارض مع أي عملية أخرى مستخدمة للمنفذ 3005:
```bash
pm2 list
sudo lsof -i :3005
```

### 5) بناء الفرونت إند ورفعه

```bash
cd /var/www/labbeih/client
npm install
npm run build           # ينتج مجلد dist/
```

انسخ محتوى `client/dist/` لمسار `/var/www/labbeih/client-dist` (نفس المسار المذكور
بملف `server/nginx/labbeih.conf`)، أو عدّل مسار `root` بالملف حسب ما يناسبك.

### 6) Nginx (server block منفصل — لا يمس radd.pro)

```bash
sudo cp server/nginx/labbeih.conf /etc/nginx/sites-available/labbeih.conf
sudo nano /etc/nginx/sites-available/labbeih.conf   # استبدل api.labbeih.example بدومينك الفعلي
sudo ln -s /etc/nginx/sites-available/labbeih.conf /etc/nginx/sites-enabled/
sudo nginx -t          # تحقق من صحة الإعداد قبل إعادة التحميل
sudo systemctl reload nginx
```

### 7) شهادة SSL (Let's Encrypt / Certbot)

```bash
sudo certbot --nginx -d api.labbeih.example
```

Certbot بيضيف تلقائياً تحويلة HTTPS (443) لملف `labbeih.conf` فقط — ما بيلمس إعدادات radd.pro.

### 8) تحقق نهائي

```bash
curl https://api.labbeih.example/health
```

وافتح الدومين بالمتصفح وجرّب نفس مسار الاختبار المذكور بقسم "التشغيل محلياً".

---

## متطلبات غير قابلة للتفاوض — كيف تحققت

- **إعادة اتصال تلقائي + طابور offline**: `client/src/hooks/useChannelSocket.js` — Socket.io
  client بإعادة محاولة لانهائية، وأي مقطع صوتي يُسجَّل وقت انقطاع الاتصال يُحفظ بطابور محلي
  ويُبث تلقائياً بحدث `connect` عند عودة الشبكة.
- **تحقق من العضوية قبل أي بث**: `server/src/sockets/membership.js` يتحقق من عضوية المنشأة
  (للقنوات الدائمة) أو صلاحية توكن الضيف (للقنوات المؤقتة) قبل أي `channel:join` أو `audio:message`.
- **Rate limiting**: `express-rate-limit` على كل طلبات REST (أشد صرامة على OTP)، وحد زمني
  أدنى بين مقاطع PTT بطبقة الـ Socket لمنع إغراق البث.
- **تعقيم المدخلات**: `sanitize-html` يعقّم كل نصوص جسم الطلب (`sanitizeBody` middleware) قبل
  أي معالجة.
- **البث خلال أقل من ثانيتين**: الصوت يُبث فوراً كـ binary عبر Socket.io لكل أعضاء القناة
  (`audio:live`) بالتوازي مع الحفظ بالخلفية للسجل (`audio:saved`) — الحفظ على القرص ما يؤخر
  البث اللحظي. اختبرته محلياً وبين متصفحين والزمن كان أقل من ثانية.

## قيود معروفة بهذه المرحلة (يستحق الانتباه لها قبل الإنتاج بحمل كبير)

- تتبع الحضور اللحظي (`presenceStore.js`) بالذاكرة داخل عملية Node واحدة — إذا شغّلت PM2
  بأكثر من instance (cluster mode) لازم تبدّلها بـ Redis adapter لـ Socket.io. حالياً
  `ecosystem.config.js` مضبوط على `instances: 1` عمداً لهذا السبب.
- المقاطع الصوتية تُخزَّن على قرص السيرفر مباشرة (`server/uploads/voice/`)، مو على تخزين
  سحابي — خذها بعين الاعتبار عند التوسع أو عمل نسخ احتياطي.
- ما فيه اختبارات آلية (unit/integration tests) بعد — الفحص الحالي كان يدوي عبر curl
  و Playwright أثناء البناء.

## خارطة الطريق (المراحل القادمة)

- **المرحلة 2**: تفريغ نصي عربي (تحتاج قرار: Whisper API أو بديل مخصص للهجات الخليجية)
  + بحث بالسجل + ملخص "وش فاتني؟" عبر Claude API + رد AI على قناة أسئلة شائعة.
- **المرحلة 3**: تفعيل Moyasar (الحقول جاهزة بـ `.env` والجدول `plans` يدعم الحقول لكن
  ما فيه webhook handler بعد)، تتبع موقع، زر طوارئ مع تصعيد SMS، تقارير نشاط، قنوات بين الفروع.

---

الأسئلة أو التصحيحات؟ راسلني وأكمل من وين وقفنا.
