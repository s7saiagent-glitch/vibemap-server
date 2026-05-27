# 🎓 جامعة مملكة الأرض الافتراضية
## Virtual Earth Kingdom University

> أول جامعة ذكاء اصطناعي عربية عالمية — 90% AI · 10% Human Supervision

---

## 📋 نظرة عامة

منظومة جامعية رقمية متكاملة تعمل بالذكاء الاصطناعي، تحاكي الجامعات التقليدية بالكامل:
- **التدريس**: أساتذة AI لكل مادة
- **التقييم**: اختبارات تلقائية مع تصحيح فوري
- **الإدارة**: نظام GPA وسجلات أكاديمية كاملة
- **اللغة الإنجليزية**: 6 مستويات CEFR مع مدرب AI

---

## 🏗️ البنية التقنية

```
vibemap-server/
├── backend/          # FastAPI + Python
│   ├── app/
│   │   ├── core/     # Config, DB, Security, Deps
│   │   ├── models/   # SQLAlchemy Models
│   │   ├── schemas/  # Pydantic Schemas
│   │   ├── api/v1/   # API Endpoints
│   │   └── services/ # AI Agents + Business Logic
│   └── seed_data.py  # Initial data seed
├── frontend/         # Next.js 14 + TypeScript
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   └── lib/          # API client + stores
├── nginx/            # Reverse proxy config
└── docker-compose.yml
```

---

## 🚀 تشغيل المشروع

### المتطلبات
- Docker & Docker Compose
- ANTHROPIC_API_KEY

### خطوات التشغيل

```bash
# 1. نسخ ملفات البيئة
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 2. إضافة مفتاح Anthropic API
echo "ANTHROPIC_API_KEY=your-key-here" >> backend/.env

# 3. تشغيل الخدمات
docker compose up -d

# 4. إدراج البيانات الأولية
docker exec university_backend python seed_data.py

# 5. الوصول للتطبيق
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

---

## 🎓 الكليات والتخصصات

### كلية علوم الحاسب 💻
| التخصص | الرمز | الساعات |
|---------|-------|---------|
| علوم الحاسب | BSC-CS | 132 |
| هندسة البرمجيات | BSC-SE | 136 |
| الذكاء الاصطناعي | BSC-AI | 132 |
| علم البيانات | BSC-DS | 128 |
| الأمن السيبراني | BSC-CYB | 132 |

### كلية الإدارة والأعمال 📊
| التخصص | الرمز | الساعات |
|---------|-------|---------|
| إدارة الأعمال | BBA | 128 |
| التسويق | BBA-MKT | 124 |
| المحاسبة | BBA-ACC | 128 |
| ريادة الأعمال | BBA-ENT | 120 |

---

## 🤖 نظام الأساتذة الذكاء الاصطناعي

كل مادة تمتلك أستاذ AI مستقل يعمل بنموذج Claude:

```
AI Professor = Teaching Agent + Assessment Agent + Support Agent
```

**القدرات:**
- شرح تفاعلي متعدد الأساليب
- إنشاء اختبارات وواجبات تلقائية
- تصحيح المقالات والإجابات
- متابعة التقدم الأكاديمي
- خطط دراسة شخصية

---

## 🌍 برنامج اللغة الإنجليزية

| المستوى | الاسم | الساعات |
|---------|-------|---------|
| A1 | Absolute Beginner | 40 |
| A2 | Elementary | 50 |
| B1 | Pre-Intermediate | 60 |
| B2 | Intermediate | 65 |
| C1 | Advanced | 75 |
| C2 | Mastery | 70 |

---

## 🔑 بيانات الدخول الافتراضية

```
المدير الأعلى:
Email: admin@university.edu
Password: Admin@2025
```

---

## 📚 API Documentation

بعد التشغيل، يمكن الوصول للتوثيق على:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

---

## 🛡️ الأمان

- JWT Authentication (Access + Refresh tokens)
- RBAC (Role-Based Access Control)
- Anti-cheating في الاختبارات
- Input validation مع Pydantic
- Password hashing مع bcrypt

---

## 📈 خارطة التطوير

- [x] MVP: Auth, Courses, AI Professor, Assessments
- [x] English Language Program (A1-C2)
- [x] Student Dashboard + Admin Dashboard
- [ ] Video AI Avatar للأساتذة
- [ ] Mobile App (React Native)
- [ ] Certificate Generation (PDF + QR)
- [ ] Payment Integration
- [ ] Advanced Analytics Dashboard
- [ ] Multi-language Support

---

*بُني بالذكاء الاصطناعي لخدمة التعليم العربي العالمي*
