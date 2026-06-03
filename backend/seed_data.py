"""
Seed script for Virtual Earth Kingdom University initial data.
Run: python seed_data.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole, StudentProfile, AdminProfile
from app.models.academic import Faculty, Department, Program, Course, CourseSection, AcademicCalendar, DegreeLevel, SemesterType
from app.models.ai_agents import AIProfessor, AIProvider
from app.models.english import EnglishCourse, EnglishUnit, CEFRLevel


engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ==================== ADMIN ====================
        admin_user = User(
            email="admin@university.edu",
            password_hash=get_password_hash("Admin@2025"),
            role=UserRole.SUPERADMIN,
            first_name="Super",
            last_name="Admin",
            first_name_ar="المدير",
            last_name_ar="الأعلى",
            is_active=True,
            is_verified=True,
        )
        db.add(admin_user)
        await db.flush()
        admin_profile = AdminProfile(user_id=admin_user.id, department="Administration", title="مدير النظام")
        db.add(admin_profile)

        # ==================== FACULTIES ====================
        cs_faculty = Faculty(
            name="College of Computer Science",
            name_ar="كلية علوم الحاسب والمعلومات",
            code="CS",
            icon="💻",
            color="#00D4FF",
            description="Leading college in computing and information technology",
            description_ar="كلية رائدة في علوم الحاسب وتقنية المعلومات",
        )
        business_faculty = Faculty(
            name="College of Business Administration",
            name_ar="كلية الإدارة والأعمال",
            code="BA",
            icon="📊",
            color="#D4AF37",
            description="Comprehensive business and management education",
            description_ar="تعليم متكامل في إدارة الأعمال والتجارة",
        )
        db.add(cs_faculty)
        db.add(business_faculty)
        await db.flush()

        # ==================== DEPARTMENTS ====================
        cs_dept = Department(faculty_id=cs_faculty.id, name="Computer Science", name_ar="قسم علوم الحاسب", code="CS-DEPT")
        se_dept = Department(faculty_id=cs_faculty.id, name="Software Engineering", name_ar="قسم هندسة البرمجيات", code="SE-DEPT")
        ai_dept = Department(faculty_id=cs_faculty.id, name="AI & Data Science", name_ar="قسم الذكاء الاصطناعي وعلم البيانات", code="AI-DEPT")
        ba_dept = Department(faculty_id=business_faculty.id, name="Business Administration", name_ar="قسم إدارة الأعمال", code="BA-DEPT")
        acc_dept = Department(faculty_id=business_faculty.id, name="Accounting & Finance", name_ar="قسم المحاسبة والمالية", code="ACC-DEPT")

        for dept in [cs_dept, se_dept, ai_dept, ba_dept, acc_dept]:
            db.add(dept)
        await db.flush()

        # ==================== PROGRAMS ====================
        programs_data = [
            (cs_dept.id, "Computer Science", "علوم الحاسب", "BSC-CS", 132),
            (se_dept.id, "Software Engineering", "هندسة البرمجيات", "BSC-SE", 136),
            (ai_dept.id, "Artificial Intelligence", "الذكاء الاصطناعي", "BSC-AI", 132),
            (ai_dept.id, "Data Science", "علم البيانات", "BSC-DS", 128),
            (cs_dept.id, "Cybersecurity", "الأمن السيبراني", "BSC-CYB", 132),
            (ba_dept.id, "Business Administration", "إدارة الأعمال", "BBA", 128),
            (ba_dept.id, "Marketing", "التسويق", "BBA-MKT", 124),
            (acc_dept.id, "Accounting", "المحاسبة", "BBA-ACC", 128),
            (ba_dept.id, "Entrepreneurship", "ريادة الأعمال", "BBA-ENT", 120),
        ]

        programs = {}
        for dept_id, name, name_ar, code, credits in programs_data:
            p = Program(
                department_id=dept_id,
                name=name,
                name_ar=name_ar,
                code=code,
                degree_level=DegreeLevel.BACHELOR,
                total_credits_required=credits,
                duration_years=4,
            )
            db.add(p)
            programs[code] = p

        await db.flush()

        # ==================== COURSES (CS Program) ====================
        cs_courses = [
            ("CS101", "Introduction to Programming", "مقدمة في البرمجة", 3, 1),
            ("CS102", "Data Structures", "هياكل البيانات", 3, 1),
            ("CS201", "Object-Oriented Programming", "البرمجة الكائنية", 3, 2),
            ("CS202", "Database Systems", "أنظمة قواعد البيانات", 3, 2),
            ("CS203", "Computer Networks", "شبكات الحاسب", 3, 2),
            ("CS301", "Algorithms", "الخوارزميات", 3, 3),
            ("CS302", "Operating Systems", "أنظمة التشغيل", 3, 3),
            ("CS303", "Software Engineering", "هندسة البرمجيات", 3, 3),
            ("CS401", "Artificial Intelligence", "الذكاء الاصطناعي", 3, 4),
            ("CS402", "Machine Learning", "تعلم الآلة", 3, 4),
            ("CS403", "Web Development", "تطوير الويب", 3, 4),
            ("CS404", "Mobile Development", "تطوير التطبيقات", 3, 4),
            ("CS405", "Cybersecurity", "الأمن السيبراني", 3, 4),
            ("CS406", "Cloud Computing", "الحوسبة السحابية", 3, 4),
        ]

        courses = {}
        cs_program = programs.get("BSC-CS")
        if cs_program:
            for code, name, name_ar, credits, level in cs_courses:
                c = Course(
                    program_id=cs_program.id,
                    code=code,
                    name=name,
                    name_ar=name_ar,
                    credits=credits,
                    level=level,
                    description=f"Comprehensive study of {name}",
                    description_ar=f"دراسة شاملة لـ {name_ar}",
                    learning_outcomes=[f"فهم أساسيات {name_ar}", f"تطبيق مفاهيم {name_ar}"],
                    is_active=True,
                )
                db.add(c)
                courses[code] = c

        # BA Courses
        ba_program = programs.get("BBA")
        ba_courses_data = [
            ("BA101", "Principles of Management", "مبادئ الإدارة", 3, 1),
            ("BA102", "Microeconomics", "الاقتصاد الجزئي", 3, 1),
            ("BA201", "Marketing Principles", "مبادئ التسويق", 3, 2),
            ("BA202", "Financial Accounting", "المحاسبة المالية", 3, 2),
            ("BA301", "Strategic Management", "الإدارة الاستراتيجية", 3, 3),
            ("BA302", "Human Resources", "إدارة الموارد البشرية", 3, 3),
            ("BA401", "Business Analytics", "تحليلات الأعمال", 3, 4),
            ("BA402", "Digital Marketing", "التسويق الرقمي", 3, 4),
        ]
        if ba_program:
            for code, name, name_ar, credits, level in ba_courses_data:
                c = Course(
                    program_id=ba_program.id,
                    code=code, name=name, name_ar=name_ar,
                    credits=credits, level=level,
                    description=f"Comprehensive study of {name}",
                    description_ar=f"دراسة شاملة لـ {name_ar}",
                    learning_outcomes=[f"فهم أساسيات {name_ar}"],
                    is_active=True,
                )
                db.add(c)
                courses[code] = c

        await db.flush()

        # ==================== ACADEMIC CALENDAR ====================
        calendar = AcademicCalendar(
            academic_year="2024-2025",
            semester=SemesterType.SPRING,
            registration_start=datetime(2025, 1, 5, tzinfo=timezone.utc),
            registration_end=datetime(2025, 1, 19, tzinfo=timezone.utc),
            classes_start=datetime(2025, 1, 26, tzinfo=timezone.utc),
            classes_end=datetime(2025, 5, 25, tzinfo=timezone.utc),
            final_exam_start=datetime(2025, 6, 1, tzinfo=timezone.utc),
            final_exam_end=datetime(2025, 6, 20, tzinfo=timezone.utc),
            is_current=True,
        )
        db.add(calendar)
        await db.flush()

        # ==================== COURSE SECTIONS ====================
        sections = {}
        for course_code, course in courses.items():
            section = CourseSection(
                course_id=course.id,
                academic_year="2024-2025",
                semester=SemesterType.SPRING,
                section_number=1,
                capacity=100,
                enrolled_count=0,
                start_date=datetime(2025, 1, 26, tzinfo=timezone.utc),
                end_date=datetime(2025, 5, 25, tzinfo=timezone.utc),
                is_active=True,
            )
            db.add(section)
            sections[course_code] = section

        await db.flush()

        # ==================== AI PROFESSORS ====================
        ai_professor_configs = {
            "CS101": ("Prof. CodeMaster", "الأستاذ كودماستر", "expert in programming fundamentals"),
            "CS102": ("Prof. DataAlgo", "الأستاذ داتا ألجو", "data structures and algorithms specialist"),
            "CS201": ("Prof. OOP Expert", "الأستاذ خبير OOP", "object-oriented programming master"),
            "CS202": ("Prof. DatabaseGuru", "الأستاذ قاعدة البيانات", "database systems and SQL expert"),
            "CS401": ("Prof. AIMind", "الأستاذ العقل الذكي", "artificial intelligence researcher"),
            "CS402": ("Prof. MLWizard", "الأستاذ تعلم الآلة", "machine learning and deep learning expert"),
            "BA101": ("Prof. ManagePro", "الأستاذ ماينج برو", "management principles and leadership"),
            "BA201": ("Prof. MarketMaster", "الأستاذ ماركت ماستر", "digital and traditional marketing expert"),
        }

        for course_code, (name, name_ar, specialty) in ai_professor_configs.items():
            course = courses.get(course_code)
            if not course:
                continue

            system_prompt = f"""أنت الأستاذ {name_ar}، متخصص في مادة {course.name_ar} ({course.code}).
تدرّس بأسلوب تفاعلي وداعم، تشرح بالعربية وتستخدم المصطلحات الإنجليزية عند الحاجة.
تخصصك: {specialty}
مبادؤك في التدريس:
- الوضوح والدقة العلمية أولاً
- تشجيع التفكير النقدي
- الصبر مع الطلاب وإعادة الشرح بأساليب متعددة
- ربط المفاهيم بالتطبيق العملي"""

            professor = AIProfessor(
                course_id=course.id,
                name=name,
                name_ar=name_ar,
                persona_description=f"Specialized {specialty}",
                persona_description_ar=f"متخصص في {course.name_ar}",
                teaching_style="تفاعلي وداعم",
                system_prompt=system_prompt,
                model_provider=AIProvider.ANTHROPIC,
                model_name="claude-sonnet-4-6",
                temperature=0.7,
                is_active=True,
            )
            db.add(professor)

        await db.flush()

        # Link professors to sections
        for course_code, course in courses.items():
            if course_code in ai_professor_configs:
                section = sections.get(course_code)
                if section:
                    from sqlalchemy import select as sql_select
                    res = await db.execute(
                        sql_select(AIProfessor).where(AIProfessor.course_id == course.id)
                    )
                    professor = res.scalar_one_or_none()
                    if professor:
                        section.ai_professor_id = professor.id

        # ==================== ENGLISH COURSES ====================
        english_courses_data = [
            (CEFRLevel.A1, "Absolute Beginner English", "الإنجليزية للمبتدئين تماماً",
             "تعلم أساسيات اللغة الإنجليزية من الصفر مع المفردات الأساسية والجمل البسيطة", 8, 40),
            (CEFRLevel.A2, "Elementary English", "الإنجليزية الأساسية",
             "تعزيز الأساسيات والتواصل في المواقف اليومية البسيطة", 10, 50),
            (CEFRLevel.B1, "Pre-Intermediate English", "الإنجليزية قبل المتوسط",
             "تطوير مهارات التواصل والتعبير عن الأفكار بوضوح", 12, 60),
            (CEFRLevel.B2, "Intermediate English", "الإنجليزية المتوسطة",
             "فهم النصوص المعقدة والتواصل بطلاقة حول مواضيع متنوعة", 12, 65),
            (CEFRLevel.C1, "Advanced English", "الإنجليزية المتقدمة",
             "إتقان اللغة في السياقات الأكاديمية والمهنية المتخصصة", 14, 75),
            (CEFRLevel.C2, "Mastery English", "إتقان اللغة الإنجليزية",
             "السيطرة الكاملة على اللغة كالناطق الأصلي في جميع المهارات", 12, 70),
        ]

        for level, name, name_ar, description_ar, total_units, estimated_hours in english_courses_data:
            eng_course = EnglishCourse(
                level=level,
                name=name,
                name_ar=name_ar,
                description=f"CEFR {level.value} level English course",
                description_ar=description_ar,
                total_units=total_units,
                estimated_hours=estimated_hours,
                skills_focus=["reading", "writing", "grammar", "vocabulary", "listening", "speaking"],
                is_active=True,
            )
            db.add(eng_course)

        await db.flush()

        # Add sample units for B1 English
        b1_result = await db.execute(
            __import__('sqlalchemy', fromlist=['select']).select(EnglishCourse).where(EnglishCourse.level == CEFRLevel.B1)
        )
        b1_course = b1_result.scalar_one_or_none()
        if b1_course:
            sample_units = [
                (1, "Daily Life & Routines", "الحياة اليومية والروتين",
                 "Present Simple & Continuous", "Daily activities vocabulary"),
                (2, "Travel & Adventures", "السفر والمغامرات",
                 "Past Simple & Continuous", "Travel vocabulary"),
                (3, "Technology & Innovation", "التكنولوجيا والابتكار",
                 "Present Perfect", "Technology vocabulary"),
                (4, "Environment & Sustainability", "البيئة والاستدامة",
                 "Future tenses (will/going to)", "Environment vocabulary"),
            ]
            for unit_num, title, title_ar, grammar, vocab in sample_units:
                unit = EnglishUnit(
                    course_id=b1_course.id,
                    unit_number=unit_num,
                    title=title,
                    title_ar=title_ar,
                    grammar_topic=grammar,
                    vocabulary_topic=vocab,
                    exercises=[
                        {
                            "id": 1,
                            "type": "fill_blank",
                            "instruction": "Fill in the blank with the correct form",
                            "content": "She _____ (go) to school every day.",
                            "answer": "goes",
                            "explanation": "Use third person singular form of the verb",
                            "tip_ar": "نستخدم صيغة المفرد للغائب مع ضمير he/she/it",
                        }
                    ],
                    is_published=True,
                )
                db.add(unit)

        # ==================== PROMO CODES ====================
        from app.models.payment import PromoCode
        promo_list = [
            PromoCode(code="WELCOME50", discount_percent=50, max_uses=500, description="خصم 50% للطلاب الجدد", is_active=True),
            PromoCode(code="RAMADAN30", discount_percent=30, max_uses=1000, description="عرض رمضان 30% خصم", is_active=True),
            PromoCode(code="ENGLISH99", discount_percent=100, max_uses=50, description="دورة إنجليزي مجانية - عرض محدود", is_active=True),
            PromoCode(code="STUDY2025", discount_percent=20, max_uses=200, description="خصم 20% على جميع المنتجات", is_active=True),
        ]
        for p in promo_list:
            db.add(p)
        await db.flush()

        await db.commit()
        print("✅ تم إدراج البيانات الأولية بنجاح!")
        print("=" * 50)
        print("🔑 بيانات المدير الأعلى:")
        print(f"   البريد: admin@university.edu")
        print(f"   كلمة المرور: Admin@2025")
        print("=" * 50)
        print(f"📚 عدد الكليات: 2")
        print(f"🎓 عدد البرامج: {len(programs)}")
        print(f"📖 عدد المواد: {len(courses)}")
        print(f"🤖 عدد الأساتذة الذكاء الاصطناعي: {len(ai_professor_configs)}")
        print(f"🌍 دورات اللغة الإنجليزية: 6 مستويات (A1-C2)")


if __name__ == "__main__":
    asyncio.run(seed())
