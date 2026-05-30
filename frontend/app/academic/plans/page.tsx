'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { GraduationCap, BookOpen, Clock, Award, ChevronDown, ChevronUp, ArrowRight, Layers, Code2, Shield, Brain, Database, Cloud, BarChart3, TrendingUp, Users, DollarSign, Globe } from 'lucide-react'

interface Course {
  code: string
  name: string
  name_en: string
  credits: number
  type: 'required' | 'elective' | 'general'
}

interface Semester {
  num: number
  name: string
  courses: Course[]
  totalCredits: number
}

interface Plan {
  type: 'diploma' | 'bachelor'
  years: number
  totalCredits: number
  semesters: Semester[]
}

interface Specialization {
  id: string
  name: string
  name_en: string
  icon: React.ElementType
  color: string
  border: string
  text: string
  badge: string
  description: string
  diploma: Plan | null
  bachelor: Plan | null
}

const CS_BACHELOR_CORE: Course[] = [
  { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
  { code: 'MATH101', name: 'حساب التفاضل والتكامل 1', name_en: 'Calculus I', credits: 3, type: 'required' },
  { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
  { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
  { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
]

const SPECIALIZATIONS: Specialization[] = [
  // ─── COMPUTER SCIENCE ───────────────────────────────────────────────
  {
    id: 'cs',
    name: 'علوم الحاسب',
    name_en: 'Computer Science',
    icon: Code2,
    color: 'from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    description: 'تغطي المبادئ الأساسية للحوسبة، الخوارزميات، هياكل البيانات، وتطوير البرمجيات.',
    diploma: {
      type: 'diploma', years: 2, totalCredits: 72,
      semesters: [
        {
          num: 1, name: 'الفصل الأول', totalCredits: 15, courses: [
            { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
            { code: 'MATH101', name: 'حساب التفاضل والتكامل 1', name_en: 'Calculus I', credits: 3, type: 'required' },
            { code: 'CS110', name: 'البرمجة بلغة Python', name_en: 'Python Programming', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'الفصل الثاني', totalCredits: 16, courses: [
            { code: 'CS120', name: 'هياكل البيانات', name_en: 'Data Structures', credits: 3, type: 'required' },
            { code: 'MATH102', name: 'حساب التفاضل والتكامل 2', name_en: 'Calculus II', credits: 3, type: 'required' },
            { code: 'CS115', name: 'البرمجة كائنية التوجه', name_en: 'Object-Oriented Programming', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'CS111', name: 'منطق الحوسبة', name_en: 'Computational Logic', credits: 2, type: 'required' },
          ],
        },
        {
          num: 3, name: 'الفصل الثالث', totalCredits: 18, courses: [
            { code: 'CS201', name: 'الخوارزميات وتحليلها', name_en: 'Algorithms & Analysis', credits: 3, type: 'required' },
            { code: 'CS210', name: 'قواعد البيانات', name_en: 'Database Systems', credits: 3, type: 'required' },
            { code: 'CS215', name: 'شبكات الحاسب', name_en: 'Computer Networks', credits: 3, type: 'required' },
            { code: 'CS220', name: 'نظم التشغيل', name_en: 'Operating Systems', credits: 3, type: 'required' },
            { code: 'MATH201', name: 'الرياضيات المتقطعة', name_en: 'Discrete Mathematics', credits: 3, type: 'required' },
            { code: 'CS211', name: 'واجهات المستخدم', name_en: 'UI Development', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'الفصل الرابع', totalCredits: 23, courses: [
            { code: 'CS301', name: 'هندسة البرمجيات', name_en: 'Software Engineering', credits: 3, type: 'required' },
            { code: 'CS310', name: 'تطوير تطبيقات الويب', name_en: 'Web Application Development', credits: 3, type: 'required' },
            { code: 'CS320', name: 'مقدمة الذكاء الاصطناعي', name_en: 'Intro to AI', credits: 3, type: 'required' },
            { code: 'CS315', name: 'الحوسبة السحابية الأساسية', name_en: 'Cloud Computing Basics', credits: 3, type: 'required' },
            { code: 'CS399', name: 'مشروع التخرج', name_en: 'Graduation Project', credits: 6, type: 'required' },
            { code: 'CS3EL', name: 'مادة اختيارية', name_en: 'Elective', credits: 3, type: 'elective' },
            { code: 'TRNG399', name: 'التدريب الميداني', name_en: 'Field Training', credits: 2, type: 'required' },
          ],
        },
      ],
    },
    bachelor: {
      type: 'bachelor', years: 4, totalCredits: 136,
      semesters: [
        {
          num: 1, name: 'السنة الأولى - الفصل الأول', totalCredits: 15, courses: [
            { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
            { code: 'CS110', name: 'البرمجة بلغة Python', name_en: 'Python Programming', credits: 3, type: 'required' },
            { code: 'MATH101', name: 'حساب التفاضل والتكامل 1', name_en: 'Calculus I', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'السنة الأولى - الفصل الثاني', totalCredits: 16, courses: [
            { code: 'CS111', name: 'منطق الحوسبة', name_en: 'Computational Logic', credits: 2, type: 'required' },
            { code: 'CS115', name: 'البرمجة كائنية التوجه', name_en: 'Object-Oriented Programming', credits: 3, type: 'required' },
            { code: 'MATH102', name: 'حساب التفاضل والتكامل 2', name_en: 'Calculus II', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'PHYS101', name: 'الفيزياء العامة', name_en: 'General Physics', credits: 3, type: 'general' },
          ],
        },
        {
          num: 3, name: 'السنة الثانية - الفصل الأول', totalCredits: 18, courses: [
            { code: 'CS201', name: 'الخوارزميات وتحليلها', name_en: 'Algorithms & Analysis', credits: 3, type: 'required' },
            { code: 'CS120', name: 'هياكل البيانات', name_en: 'Data Structures', credits: 3, type: 'required' },
            { code: 'CS210', name: 'قواعد البيانات', name_en: 'Database Systems', credits: 3, type: 'required' },
            { code: 'MATH201', name: 'الرياضيات المتقطعة', name_en: 'Discrete Mathematics', credits: 3, type: 'required' },
            { code: 'CS215', name: 'شبكات الحاسب', name_en: 'Computer Networks', credits: 3, type: 'required' },
            { code: 'STAT201', name: 'الإحصاء والاحتمالات', name_en: 'Statistics & Probability', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'السنة الثانية - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'CS220', name: 'نظم التشغيل', name_en: 'Operating Systems', credits: 3, type: 'required' },
            { code: 'CS225', name: 'تنظيم وبنية الحاسوب', name_en: 'Computer Organization & Architecture', credits: 3, type: 'required' },
            { code: 'CS211', name: 'تطوير واجهات المستخدم', name_en: 'UI Development', credits: 3, type: 'required' },
            { code: 'CS230', name: 'اللغات الرسمية والمترجمات', name_en: 'Formal Languages & Compilers', credits: 3, type: 'required' },
            { code: 'ENGL201', name: 'اللغة الإنجليزية التقنية', name_en: 'Technical English', credits: 2, type: 'general' },
            { code: 'CS2EL1', name: 'مادة اختيارية 1', name_en: 'Elective I', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 5, name: 'السنة الثالثة - الفصل الأول', totalCredits: 18, courses: [
            { code: 'CS301', name: 'هندسة البرمجيات', name_en: 'Software Engineering', credits: 3, type: 'required' },
            { code: 'CS310', name: 'تطوير تطبيقات الويب', name_en: 'Web Application Development', credits: 3, type: 'required' },
            { code: 'CS320', name: 'الذكاء الاصطناعي', name_en: 'Artificial Intelligence', credits: 3, type: 'required' },
            { code: 'CS315', name: 'أمن المعلومات', name_en: 'Information Security', credits: 3, type: 'required' },
            { code: 'CS325', name: 'البرمجة المتوازية والموزعة', name_en: 'Parallel & Distributed Programming', credits: 3, type: 'required' },
            { code: 'CS3EL2', name: 'مادة اختيارية 2', name_en: 'Elective II', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 6, name: 'السنة الثالثة - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'CS330', name: 'الحوسبة السحابية', name_en: 'Cloud Computing', credits: 3, type: 'required' },
            { code: 'CS335', name: 'تطوير التطبيقات المحمولة', name_en: 'Mobile App Development', credits: 3, type: 'required' },
            { code: 'CS340', name: 'علم البيانات الأساسي', name_en: 'Fundamentals of Data Science', credits: 3, type: 'required' },
            { code: 'MGMT301', name: 'إدارة المشاريع التقنية', name_en: 'Tech Project Management', credits: 2, type: 'general' },
            { code: 'CS3EL3', name: 'مادة اختيارية 3', name_en: 'Elective III', credits: 3, type: 'elective' },
            { code: 'CS3EL4', name: 'مادة اختيارية 4', name_en: 'Elective IV', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 7, name: 'السنة الرابعة - الفصل الأول', totalCredits: 17, courses: [
            { code: 'CS401', name: 'جودة البرمجيات والاختبار', name_en: 'Software Quality & Testing', credits: 3, type: 'required' },
            { code: 'CS410', name: 'أخلاقيات الحوسبة والقانون', name_en: 'Computing Ethics & Law', credits: 2, type: 'required' },
            { code: 'CS415', name: 'بيئات التطوير الحديثة', name_en: 'Modern Dev Environments', credits: 3, type: 'required' },
            { code: 'TRNG401', name: 'التدريب الميداني', name_en: 'Field Training', credits: 3, type: 'required' },
            { code: 'CS4EL5', name: 'مادة اختيارية 5', name_en: 'Elective V', credits: 3, type: 'elective' },
            { code: 'CS4EL6', name: 'مادة اختيارية 6', name_en: 'Elective VI', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 8, name: 'السنة الرابعة - الفصل الثاني', totalCredits: 18, courses: [
            { code: 'CS490', name: 'مشروع التخرج 1', name_en: 'Graduation Project I', credits: 3, type: 'required' },
            { code: 'CS491', name: 'مشروع التخرج 2', name_en: 'Graduation Project II', credits: 3, type: 'required' },
            { code: 'CS495', name: 'موضوعات متقدمة في الحوسبة', name_en: 'Advanced Topics in Computing', credits: 3, type: 'required' },
            { code: 'CS4EL7', name: 'مادة اختيارية 7', name_en: 'Elective VII', credits: 3, type: 'elective' },
            { code: 'CS4EL8', name: 'مادة اختيارية 8', name_en: 'Elective VIII', credits: 3, type: 'elective' },
            { code: 'MGMT402', name: 'ريادة الأعمال التقنية', name_en: 'Tech Entrepreneurship', credits: 3, type: 'general' },
          ],
        },
      ],
    },
  },

  // ─── SOFTWARE ENGINEERING ─────────────────────────────────────────
  {
    id: 'se',
    name: 'هندسة البرمجيات',
    name_en: 'Software Engineering',
    icon: Layers,
    color: 'from-cyan-600/20 to-teal-600/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'تركز على دورة حياة البرمجيات، إدارة الجودة، DevOps، وتطوير الأنظمة الكبيرة.',
    diploma: {
      type: 'diploma', years: 2, totalCredits: 72,
      semesters: [
        {
          num: 1, name: 'الفصل الأول', totalCredits: 15, courses: [
            { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
            { code: 'SE110', name: 'البرمجة بلغة Java', name_en: 'Java Programming', credits: 3, type: 'required' },
            { code: 'MATH101', name: 'حساب التفاضل والتكامل 1', name_en: 'Calculus I', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'الفصل الثاني', totalCredits: 16, courses: [
            { code: 'SE120', name: 'هياكل البيانات والخوارزميات', name_en: 'Data Structures & Algorithms', credits: 3, type: 'required' },
            { code: 'SE115', name: 'التصميم كائني التوجه', name_en: 'OOP Design', credits: 3, type: 'required' },
            { code: 'CS210', name: 'قواعد البيانات', name_en: 'Database Systems', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'SE111', name: 'مقدمة هندسة البرمجيات', name_en: 'Intro to SE', credits: 2, type: 'required' },
          ],
        },
        {
          num: 3, name: 'الفصل الثالث', totalCredits: 18, courses: [
            { code: 'SE201', name: 'هندسة متطلبات البرمجيات', name_en: 'Software Requirements Engineering', credits: 3, type: 'required' },
            { code: 'SE210', name: 'تصميم أنظمة البرمجيات', name_en: 'Software System Design', credits: 3, type: 'required' },
            { code: 'SE215', name: 'اختبار البرمجيات وضمان الجودة', name_en: 'Software Testing & QA', credits: 3, type: 'required' },
            { code: 'SE220', name: 'تطوير الويب المتقدم', name_en: 'Advanced Web Development', credits: 3, type: 'required' },
            { code: 'CS215', name: 'شبكات الحاسب', name_en: 'Computer Networks', credits: 3, type: 'required' },
            { code: 'CS220', name: 'نظم التشغيل', name_en: 'Operating Systems', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'الفصل الرابع', totalCredits: 23, courses: [
            { code: 'SE301', name: 'إدارة مشاريع البرمجيات', name_en: 'Software Project Management', credits: 3, type: 'required' },
            { code: 'SE310', name: 'DevOps وأتمتة النشر', name_en: 'DevOps & Deployment Automation', credits: 3, type: 'required' },
            { code: 'SE315', name: 'التطوير السريع Agile/Scrum', name_en: 'Agile/Scrum Development', credits: 3, type: 'required' },
            { code: 'SE320', name: 'صيانة البرمجيات وإعادة الهيكلة', name_en: 'Software Maintenance & Refactoring', credits: 3, type: 'required' },
            { code: 'SE399', name: 'مشروع التخرج', name_en: 'Graduation Project', credits: 6, type: 'required' },
            { code: 'TRNG399', name: 'التدريب الميداني', name_en: 'Field Training', credits: 2, type: 'required' },
            { code: 'SEELC', name: 'مادة اختيارية', name_en: 'Elective', credits: 3, type: 'elective' },
          ],
        },
      ],
    },
    bachelor: null,
  },

  // ─── CYBERSECURITY ────────────────────────────────────────────────
  {
    id: 'sec',
    name: 'الأمن السيبراني',
    name_en: 'Cybersecurity',
    icon: Shield,
    color: 'from-red-600/20 to-orange-600/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500/10 text-red-400 border-red-500/30',
    description: 'تغطي حماية الأنظمة والشبكات، الطب الجنائي الرقمي، التشفير، واختبار الاختراق.',
    diploma: {
      type: 'diploma', years: 2, totalCredits: 72,
      semesters: [
        {
          num: 1, name: 'الفصل الأول', totalCredits: 15, courses: [
            { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
            { code: 'SEC110', name: 'أساسيات أمن المعلومات', name_en: 'Information Security Fundamentals', credits: 3, type: 'required' },
            { code: 'CS110', name: 'البرمجة بلغة Python', name_en: 'Python Programming', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'الفصل الثاني', totalCredits: 16, courses: [
            { code: 'CS215', name: 'شبكات الحاسب', name_en: 'Computer Networks', credits: 3, type: 'required' },
            { code: 'SEC120', name: 'التشفير وعلم التعمية', name_en: 'Cryptography', credits: 3, type: 'required' },
            { code: 'CS220', name: 'نظم التشغيل', name_en: 'Operating Systems', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'SEC111', name: 'أخلاقيات الأمن الرقمي', name_en: 'Digital Security Ethics', credits: 2, type: 'required' },
          ],
        },
        {
          num: 3, name: 'الفصل الثالث', totalCredits: 18, courses: [
            { code: 'SEC201', name: 'أمن الشبكات', name_en: 'Network Security', credits: 3, type: 'required' },
            { code: 'SEC210', name: 'أمن تطبيقات الويب', name_en: 'Web Application Security', credits: 3, type: 'required' },
            { code: 'SEC215', name: 'الطب الجنائي الرقمي', name_en: 'Digital Forensics', credits: 3, type: 'required' },
            { code: 'SEC220', name: 'اختبار الاختراق', name_en: 'Penetration Testing', credits: 3, type: 'required' },
            { code: 'CS210', name: 'قواعد البيانات', name_en: 'Database Systems', credits: 3, type: 'required' },
            { code: 'SEC211', name: 'إدارة المخاطر', name_en: 'Risk Management', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'الفصل الرابع', totalCredits: 23, courses: [
            { code: 'SEC301', name: 'أمن الحوسبة السحابية', name_en: 'Cloud Security', credits: 3, type: 'required' },
            { code: 'SEC310', name: 'الاستجابة للحوادث', name_en: 'Incident Response', credits: 3, type: 'required' },
            { code: 'SEC315', name: 'الامتثال والحوكمة الأمنية', name_en: 'Compliance & Security Governance', credits: 3, type: 'required' },
            { code: 'SEC320', name: 'تحليل البرمجيات الخبيثة', name_en: 'Malware Analysis', credits: 3, type: 'required' },
            { code: 'SEC399', name: 'مشروع التخرج', name_en: 'Graduation Project', credits: 6, type: 'required' },
            { code: 'TRNG399', name: 'التدريب الميداني', name_en: 'Field Training', credits: 2, type: 'required' },
            { code: 'SECELC', name: 'مادة اختيارية', name_en: 'Elective', credits: 3, type: 'elective' },
          ],
        },
      ],
    },
    bachelor: null,
  },

  // ─── BUSINESS ADMINISTRATION ──────────────────────────────────────
  {
    id: 'ba',
    name: 'إدارة الأعمال',
    name_en: 'Business Administration',
    icon: TrendingUp,
    color: 'from-green-600/20 to-emerald-600/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    badge: 'bg-green-500/10 text-green-400 border-green-500/30',
    description: 'تغطي إدارة الأعمال، التسويق، المحاسبة، وريادة الأعمال في البيئة الرقمية.',
    diploma: {
      type: 'diploma', years: 2, totalCredits: 72,
      semesters: [
        {
          num: 1, name: 'الفصل الأول', totalCredits: 15, courses: [
            { code: 'BA101', name: 'مبادئ الإدارة', name_en: 'Principles of Management', credits: 3, type: 'required' },
            { code: 'BA110', name: 'أساسيات الاقتصاد', name_en: 'Economics Fundamentals', credits: 3, type: 'required' },
            { code: 'BA115', name: 'مبادئ المحاسبة', name_en: 'Principles of Accounting', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'الفصل الثاني', totalCredits: 16, courses: [
            { code: 'BA120', name: 'الإحصاء التجاري', name_en: 'Business Statistics', credits: 3, type: 'required' },
            { code: 'BA125', name: 'مبادئ التسويق', name_en: 'Principles of Marketing', credits: 3, type: 'required' },
            { code: 'BA130', name: 'الرياضيات التجارية', name_en: 'Business Mathematics', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'BA111', name: 'مقدمة في تكنولوجيا الأعمال', name_en: 'Intro to Business Technology', credits: 2, type: 'required' },
          ],
        },
        {
          num: 3, name: 'الفصل الثالث', totalCredits: 18, courses: [
            { code: 'BA201', name: 'إدارة الموارد البشرية', name_en: 'Human Resource Management', credits: 3, type: 'required' },
            { code: 'BA210', name: 'إدارة سلسلة التوريد', name_en: 'Supply Chain Management', credits: 3, type: 'required' },
            { code: 'BA215', name: 'السلوك التنظيمي', name_en: 'Organizational Behavior', credits: 3, type: 'required' },
            { code: 'BA220', name: 'محاسبة الإدارة', name_en: 'Management Accounting', credits: 3, type: 'required' },
            { code: 'BA225', name: 'القانون التجاري', name_en: 'Commercial Law', credits: 3, type: 'required' },
            { code: 'BA211', name: 'التسويق الرقمي', name_en: 'Digital Marketing', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'الفصل الرابع', totalCredits: 23, courses: [
            { code: 'BA301', name: 'إدارة المشاريع', name_en: 'Project Management', credits: 3, type: 'required' },
            { code: 'BA310', name: 'ريادة الأعمال والابتكار', name_en: 'Entrepreneurship & Innovation', credits: 3, type: 'required' },
            { code: 'BA315', name: 'استراتيجية الأعمال', name_en: 'Business Strategy', credits: 3, type: 'required' },
            { code: 'BA320', name: 'نظم المعلومات الإدارية', name_en: 'Management Information Systems', credits: 3, type: 'required' },
            { code: 'BA399', name: 'مشروع التخرج', name_en: 'Graduation Project', credits: 6, type: 'required' },
            { code: 'TRNG399', name: 'التدريب الميداني', name_en: 'Field Training', credits: 2, type: 'required' },
            { code: 'BAELC', name: 'مادة اختيارية', name_en: 'Elective', credits: 3, type: 'elective' },
          ],
        },
      ],
    },
    bachelor: {
      type: 'bachelor', years: 4, totalCredits: 132,
      semesters: [
        {
          num: 1, name: 'السنة الأولى - الفصل الأول', totalCredits: 15, courses: [
            { code: 'BA101', name: 'مبادئ الإدارة', name_en: 'Principles of Management', credits: 3, type: 'required' },
            { code: 'BA110', name: 'أساسيات الاقتصاد الجزئي', name_en: 'Microeconomics', credits: 3, type: 'required' },
            { code: 'BA115', name: 'مبادئ المحاسبة المالية', name_en: 'Financial Accounting', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'السنة الأولى - الفصل الثاني', totalCredits: 16, courses: [
            { code: 'BA120', name: 'الإحصاء التجاري', name_en: 'Business Statistics', credits: 3, type: 'required' },
            { code: 'BA125', name: 'مبادئ التسويق', name_en: 'Principles of Marketing', credits: 3, type: 'required' },
            { code: 'BA130', name: 'الاقتصاد الكلي', name_en: 'Macroeconomics', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'MATH101', name: 'الرياضيات التجارية', name_en: 'Business Mathematics', credits: 2, type: 'required' },
          ],
        },
        {
          num: 3, name: 'السنة الثانية - الفصل الأول', totalCredits: 18, courses: [
            { code: 'BA201', name: 'إدارة الموارد البشرية', name_en: 'Human Resource Management', credits: 3, type: 'required' },
            { code: 'BA210', name: 'السلوك التنظيمي', name_en: 'Organizational Behavior', credits: 3, type: 'required' },
            { code: 'BA215', name: 'محاسبة الإدارة', name_en: 'Management Accounting', credits: 3, type: 'required' },
            { code: 'BA220', name: 'القانون التجاري', name_en: 'Commercial Law', credits: 3, type: 'required' },
            { code: 'BA225', name: 'إدارة سلسلة التوريد', name_en: 'Supply Chain Management', credits: 3, type: 'required' },
            { code: 'BA211', name: 'التسويق الرقمي', name_en: 'Digital Marketing', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'السنة الثانية - الفصل الثاني', totalCredits: 16, courses: [
            { code: 'BA230', name: 'الأسواق المالية والاستثمار', name_en: 'Financial Markets & Investment', credits: 3, type: 'required' },
            { code: 'BA235', name: 'إدارة العمليات', name_en: 'Operations Management', credits: 3, type: 'required' },
            { code: 'BA240', name: 'نظم المعلومات الإدارية', name_en: 'Management Information Systems', credits: 3, type: 'required' },
            { code: 'ENGL201', name: 'الإنجليزية للأعمال', name_en: 'Business English', credits: 2, type: 'general' },
            { code: 'BA2EL1', name: 'مادة اختيارية 1', name_en: 'Elective I', credits: 3, type: 'elective' },
            { code: 'BA241', name: 'بحوث العمليات', name_en: 'Operations Research', credits: 2, type: 'required' },
          ],
        },
        {
          num: 5, name: 'السنة الثالثة - الفصل الأول', totalCredits: 18, courses: [
            { code: 'BA301', name: 'إدارة المشاريع', name_en: 'Project Management', credits: 3, type: 'required' },
            { code: 'BA310', name: 'ريادة الأعمال والابتكار', name_en: 'Entrepreneurship & Innovation', credits: 3, type: 'required' },
            { code: 'BA315', name: 'الإدارة الاستراتيجية', name_en: 'Strategic Management', credits: 3, type: 'required' },
            { code: 'BA320', name: 'التمويل الشركاتي', name_en: 'Corporate Finance', credits: 3, type: 'required' },
            { code: 'BA2EL2', name: 'مادة اختيارية 2', name_en: 'Elective II', credits: 3, type: 'elective' },
            { code: 'BA2EL3', name: 'مادة اختيارية 3', name_en: 'Elective III', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 6, name: 'السنة الثالثة - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'BA330', name: 'التجارة الإلكترونية', name_en: 'E-Commerce', credits: 3, type: 'required' },
            { code: 'BA335', name: 'إدارة العلامات التجارية', name_en: 'Brand Management', credits: 3, type: 'required' },
            { code: 'BA340', name: 'الأعمال الدولية', name_en: 'International Business', credits: 3, type: 'required' },
            { code: 'BA345', name: 'المسؤولية الاجتماعية للشركات', name_en: 'Corporate Social Responsibility', credits: 2, type: 'required' },
            { code: 'BA3EL4', name: 'مادة اختيارية 4', name_en: 'Elective IV', credits: 3, type: 'elective' },
            { code: 'BA3EL5', name: 'مادة اختيارية 5', name_en: 'Elective V', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 7, name: 'السنة الرابعة - الفصل الأول', totalCredits: 15, courses: [
            { code: 'BA401', name: 'تحليل الأعمال والبيانات', name_en: 'Business Analytics', credits: 3, type: 'required' },
            { code: 'BA410', name: 'القيادة والإدارة العليا', name_en: 'Leadership & Executive Management', credits: 3, type: 'required' },
            { code: 'TRNG401', name: 'التدريب الميداني', name_en: 'Field Training', credits: 3, type: 'required' },
            { code: 'BA4EL6', name: 'مادة اختيارية 6', name_en: 'Elective VI', credits: 3, type: 'elective' },
            { code: 'BA4EL7', name: 'مادة اختيارية 7', name_en: 'Elective VII', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 8, name: 'السنة الرابعة - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'BA490', name: 'مشروع التخرج 1', name_en: 'Graduation Project I', credits: 3, type: 'required' },
            { code: 'BA491', name: 'مشروع التخرج 2', name_en: 'Graduation Project II', credits: 3, type: 'required' },
            { code: 'BA495', name: 'حوكمة الشركات', name_en: 'Corporate Governance', credits: 3, type: 'required' },
            { code: 'BA4EL8', name: 'مادة اختيارية 8', name_en: 'Elective VIII', credits: 3, type: 'elective' },
            { code: 'BA4EL9', name: 'مادة اختيارية 9', name_en: 'Elective IX', credits: 3, type: 'elective' },
            { code: 'BA496', name: 'موضوعات متقدمة في الأعمال', name_en: 'Advanced Topics in Business', credits: 2, type: 'required' },
          ],
        },
      ],
    },
  },

  // ─── ARTIFICIAL INTELLIGENCE ─────────────────────────────────────
  {
    id: 'ai',
    name: 'الذكاء الاصطناعي',
    name_en: 'Artificial Intelligence',
    icon: Brain,
    color: 'from-violet-600/20 to-purple-600/20',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    description: 'تشمل تعلم الآلة، التعلم العميق، معالجة اللغات الطبيعية، ورؤية الحاسوب.',
    diploma: null,
    bachelor: {
      type: 'bachelor', years: 4, totalCredits: 134,
      semesters: [
        {
          num: 1, name: 'السنة الأولى - الفصل الأول', totalCredits: 15, courses: [
            { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
            { code: 'AI110', name: 'البرمجة بلغة Python للذكاء الاصطناعي', name_en: 'Python for AI', credits: 3, type: 'required' },
            { code: 'MATH101', name: 'حساب التفاضل والتكامل 1', name_en: 'Calculus I', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'السنة الأولى - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'AI120', name: 'هياكل البيانات والخوارزميات', name_en: 'Data Structures & Algorithms', credits: 3, type: 'required' },
            { code: 'MATH102', name: 'الجبر الخطي', name_en: 'Linear Algebra', credits: 3, type: 'required' },
            { code: 'STAT201', name: 'الإحصاء والاحتمالات', name_en: 'Statistics & Probability', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'MATH103', name: 'رياضيات متقطعة', name_en: 'Discrete Mathematics', credits: 3, type: 'required' },
          ],
        },
        {
          num: 3, name: 'السنة الثانية - الفصل الأول', totalCredits: 18, courses: [
            { code: 'AI201', name: 'مقدمة في الذكاء الاصطناعي', name_en: 'Intro to Artificial Intelligence', credits: 3, type: 'required' },
            { code: 'AI210', name: 'تعلم الآلة الأساسي', name_en: 'Machine Learning Fundamentals', credits: 3, type: 'required' },
            { code: 'CS210', name: 'قواعد البيانات', name_en: 'Database Systems', credits: 3, type: 'required' },
            { code: 'MATH201', name: 'حساب التفاضل المتعدد المتغيرات', name_en: 'Multivariable Calculus', credits: 3, type: 'required' },
            { code: 'CS215', name: 'شبكات الحاسب', name_en: 'Computer Networks', credits: 3, type: 'required' },
            { code: 'AI211', name: 'الرياضيات للتعلم الآلي', name_en: 'Math for ML', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'السنة الثانية - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'AI220', name: 'التعلم العميق', name_en: 'Deep Learning', credits: 3, type: 'required' },
            { code: 'AI225', name: 'معالجة اللغات الطبيعية', name_en: 'Natural Language Processing', credits: 3, type: 'required' },
            { code: 'AI230', name: 'رؤية الحاسوب', name_en: 'Computer Vision', credits: 3, type: 'required' },
            { code: 'AI235', name: 'التعلم المعزز', name_en: 'Reinforcement Learning', credits: 3, type: 'required' },
            { code: 'ENGL201', name: 'اللغة الإنجليزية التقنية', name_en: 'Technical English', credits: 2, type: 'general' },
            { code: 'AI2EL1', name: 'مادة اختيارية 1', name_en: 'Elective I', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 5, name: 'السنة الثالثة - الفصل الأول', totalCredits: 18, courses: [
            { code: 'AI301', name: 'هندسة بيانات الذكاء الاصطناعي', name_en: 'AI Data Engineering', credits: 3, type: 'required' },
            { code: 'AI310', name: 'نماذج اللغة الكبيرة LLMs', name_en: 'Large Language Models', credits: 3, type: 'required' },
            { code: 'AI315', name: 'الذكاء الاصطناعي التوليدي', name_en: 'Generative AI', credits: 3, type: 'required' },
            { code: 'AI320', name: 'أخلاقيات الذكاء الاصطناعي', name_en: 'AI Ethics', credits: 2, type: 'required' },
            { code: 'AI3EL2', name: 'مادة اختيارية 2', name_en: 'Elective II', credits: 3, type: 'elective' },
            { code: 'AI3EL3', name: 'مادة اختيارية 3', name_en: 'Elective III', credits: 4, type: 'elective' },
          ],
        },
        {
          num: 6, name: 'السنة الثالثة - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'AI330', name: 'نشر نماذج الذكاء الاصطناعي MLOps', name_en: 'MLOps', credits: 3, type: 'required' },
            { code: 'AI335', name: 'تطبيقات الذكاء الاصطناعي في الصناعة', name_en: 'Industry AI Applications', credits: 3, type: 'required' },
            { code: 'AI340', name: 'الحوسبة الكمومية للذكاء الاصطناعي', name_en: 'Quantum Computing for AI', credits: 3, type: 'elective' },
            { code: 'MGMT301', name: 'إدارة مشاريع الذكاء الاصطناعي', name_en: 'AI Project Management', credits: 2, type: 'general' },
            { code: 'AI3EL4', name: 'مادة اختيارية 4', name_en: 'Elective IV', credits: 3, type: 'elective' },
            { code: 'AI3EL5', name: 'مادة اختيارية 5', name_en: 'Elective V', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 7, name: 'السنة الرابعة - الفصل الأول', totalCredits: 15, courses: [
            { code: 'AI401', name: 'أبحاث الذكاء الاصطناعي', name_en: 'AI Research Methods', credits: 3, type: 'required' },
            { code: 'AI410', name: 'مقابلات الذكاء الاصطناعي والتقنية', name_en: 'AI Technical Interviews', credits: 2, type: 'required' },
            { code: 'TRNG401', name: 'التدريب الميداني', name_en: 'Field Training', credits: 3, type: 'required' },
            { code: 'AI4EL6', name: 'مادة اختيارية 6', name_en: 'Elective VI', credits: 4, type: 'elective' },
            { code: 'AI4EL7', name: 'مادة اختيارية 7', name_en: 'Elective VII', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 8, name: 'السنة الرابعة - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'AI490', name: 'مشروع التخرج 1', name_en: 'Graduation Project I', credits: 3, type: 'required' },
            { code: 'AI491', name: 'مشروع التخرج 2', name_en: 'Graduation Project II', credits: 3, type: 'required' },
            { code: 'AI495', name: 'موضوعات متقدمة في الذكاء الاصطناعي', name_en: 'Advanced AI Topics', credits: 4, type: 'required' },
            { code: 'AI4EL8', name: 'مادة اختيارية 8', name_en: 'Elective VIII', credits: 3, type: 'elective' },
            { code: 'AI4EL9', name: 'مادة اختيارية 9', name_en: 'Elective IX', credits: 4, type: 'elective' },
          ],
        },
      ],
    },
  },

  // ─── DATA SCIENCE ────────────────────────────────────────────────
  {
    id: 'ds',
    name: 'علم البيانات',
    name_en: 'Data Science',
    icon: Database,
    color: 'from-amber-600/20 to-yellow-600/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'تجمع بين الإحصاء والبرمجة وتحليل البيانات الضخمة لاستخراج الرؤى والقيمة.',
    diploma: null,
    bachelor: {
      type: 'bachelor', years: 4, totalCredits: 132,
      semesters: [
        {
          num: 1, name: 'السنة الأولى - الفصل الأول', totalCredits: 15, courses: [
            { code: 'CS101', name: 'مقدمة في علوم الحاسب', name_en: 'Intro to Computer Science', credits: 3, type: 'required' },
            { code: 'DS110', name: 'البرمجة بلغة Python', name_en: 'Python Programming', credits: 3, type: 'required' },
            { code: 'MATH101', name: 'حساب التفاضل والتكامل 1', name_en: 'Calculus I', credits: 3, type: 'required' },
            { code: 'ENGL101', name: 'اللغة الإنجليزية 1', name_en: 'English I', credits: 3, type: 'general' },
            { code: 'ISLM101', name: 'الثقافة الإسلامية', name_en: 'Islamic Culture', credits: 2, type: 'general' },
            { code: 'COMM101', name: 'مهارات التواصل', name_en: 'Communication Skills', credits: 1, type: 'general' },
          ],
        },
        {
          num: 2, name: 'السنة الأولى - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'DS120', name: 'الإحصاء الوصفي والاستدلالي', name_en: 'Descriptive & Inferential Statistics', credits: 3, type: 'required' },
            { code: 'MATH102', name: 'الجبر الخطي', name_en: 'Linear Algebra', credits: 3, type: 'required' },
            { code: 'DS115', name: 'الاحتمالات والنماذج العشوائية', name_en: 'Probability & Stochastic Models', credits: 3, type: 'required' },
            { code: 'ENGL102', name: 'اللغة الإنجليزية 2', name_en: 'English II', credits: 3, type: 'general' },
            { code: 'ARAB101', name: 'اللغة العربية', name_en: 'Arabic Language', credits: 2, type: 'general' },
            { code: 'DS111', name: 'مقدمة في علم البيانات', name_en: 'Intro to Data Science', credits: 3, type: 'required' },
          ],
        },
        {
          num: 3, name: 'السنة الثانية - الفصل الأول', totalCredits: 18, courses: [
            { code: 'DS201', name: 'معالجة وتنظيف البيانات', name_en: 'Data Wrangling & Cleaning', credits: 3, type: 'required' },
            { code: 'DS210', name: 'تصوير البيانات', name_en: 'Data Visualization', credits: 3, type: 'required' },
            { code: 'CS210', name: 'قواعد البيانات', name_en: 'Database Systems', credits: 3, type: 'required' },
            { code: 'DS215', name: 'تعلم الآلة الأساسي', name_en: 'ML Fundamentals', credits: 3, type: 'required' },
            { code: 'DS220', name: 'البيانات الضخمة Big Data', name_en: 'Big Data Technologies', credits: 3, type: 'required' },
            { code: 'DS211', name: 'استعلام قواعد البيانات المتقدم', name_en: 'Advanced SQL', credits: 3, type: 'required' },
          ],
        },
        {
          num: 4, name: 'السنة الثانية - الفصل الثاني', totalCredits: 16, courses: [
            { code: 'DS230', name: 'التعلم العميق للبيانات', name_en: 'Deep Learning for Data', credits: 3, type: 'required' },
            { code: 'DS235', name: 'تحليل السلاسل الزمنية', name_en: 'Time Series Analysis', credits: 3, type: 'required' },
            { code: 'DS240', name: 'قواعد البيانات غير العلاقية NoSQL', name_en: 'NoSQL Databases', credits: 3, type: 'required' },
            { code: 'ENGL201', name: 'اللغة الإنجليزية التقنية', name_en: 'Technical English', credits: 2, type: 'general' },
            { code: 'DS2EL1', name: 'مادة اختيارية 1', name_en: 'Elective I', credits: 3, type: 'elective' },
            { code: 'DS241', name: 'الإحصاء التطبيقي المتقدم', name_en: 'Applied Advanced Statistics', credits: 2, type: 'required' },
          ],
        },
        {
          num: 5, name: 'السنة الثالثة - الفصل الأول', totalCredits: 18, courses: [
            { code: 'DS301', name: 'هندسة البيانات وخطوط الأنابيب', name_en: 'Data Engineering & Pipelines', credits: 3, type: 'required' },
            { code: 'DS310', name: 'تحليلات الأعمال', name_en: 'Business Analytics', credits: 3, type: 'required' },
            { code: 'DS315', name: 'نمذجة البيانات التنبؤية', name_en: 'Predictive Data Modeling', credits: 3, type: 'required' },
            { code: 'DS320', name: 'ذكاء الأعمال BI', name_en: 'Business Intelligence', credits: 3, type: 'required' },
            { code: 'DS3EL2', name: 'مادة اختيارية 2', name_en: 'Elective II', credits: 3, type: 'elective' },
            { code: 'DS3EL3', name: 'مادة اختيارية 3', name_en: 'Elective III', credits: 3, type: 'elective' },
          ],
        },
        {
          num: 6, name: 'السنة الثالثة - الفصل الثاني', totalCredits: 15, courses: [
            { code: 'DS330', name: 'الحوسبة السحابية للبيانات', name_en: 'Cloud for Data Science', credits: 3, type: 'required' },
            { code: 'DS335', name: 'معالجة اللغات الطبيعية', name_en: 'NLP', credits: 3, type: 'required' },
            { code: 'DS340', name: 'أخلاقيات البيانات والخصوصية', name_en: 'Data Ethics & Privacy', credits: 2, type: 'required' },
            { code: 'DS3EL4', name: 'مادة اختيارية 4', name_en: 'Elective IV', credits: 3, type: 'elective' },
            { code: 'DS3EL5', name: 'مادة اختيارية 5', name_en: 'Elective V', credits: 4, type: 'elective' },
          ],
        },
        {
          num: 7, name: 'السنة الرابعة - الفصل الأول', totalCredits: 16, courses: [
            { code: 'DS401', name: 'مناهج بحث علم البيانات', name_en: 'Data Science Research Methods', credits: 3, type: 'required' },
            { code: 'TRNG401', name: 'التدريب الميداني', name_en: 'Field Training', credits: 3, type: 'required' },
            { code: 'DS4EL6', name: 'مادة اختيارية 6', name_en: 'Elective VI', credits: 3, type: 'elective' },
            { code: 'DS4EL7', name: 'مادة اختيارية 7', name_en: 'Elective VII', credits: 4, type: 'elective' },
            { code: 'DS411', name: 'قيادة فرق البيانات', name_en: 'Data Team Leadership', credits: 3, type: 'required' },
          ],
        },
        {
          num: 8, name: 'السنة الرابعة - الفصل الثاني', totalCredits: 17, courses: [
            { code: 'DS490', name: 'مشروع التخرج 1', name_en: 'Graduation Project I', credits: 3, type: 'required' },
            { code: 'DS491', name: 'مشروع التخرج 2', name_en: 'Graduation Project II', credits: 3, type: 'required' },
            { code: 'DS495', name: 'موضوعات متقدمة في علم البيانات', name_en: 'Advanced Data Science Topics', credits: 4, type: 'required' },
            { code: 'DS4EL8', name: 'مادة اختيارية 8', name_en: 'Elective VIII', credits: 4, type: 'elective' },
            { code: 'DS4EL9', name: 'مادة اختيارية 9', name_en: 'Elective IX', credits: 3, type: 'elective' },
          ],
        },
      ],
    },
  },
]

const typeColors: Record<string, string> = {
  required: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  elective: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  general: 'bg-green-500/10 text-green-400 border-green-500/20',
}
const typeLabels: Record<string, string> = {
  required: 'إجباري',
  elective: 'اختياري',
  general: 'متطلبات عامة',
}

function SemesterCard({ semester }: { semester: Semester }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-uni-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-uni-card/50 hover:bg-uni-card/80 transition-colors text-right"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-uni-text text-sm">{semester.name}</span>
          <span className="text-xs text-uni-muted bg-uni-border/30 px-2 py-0.5 rounded-full">{semester.courses.length} مواد</span>
          <span className="text-xs text-uni-gold bg-uni-gold/10 border border-uni-gold/20 px-2 py-0.5 rounded-full">{semester.totalCredits} ساعة</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-uni-muted" /> : <ChevronDown className="w-4 h-4 text-uni-muted" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {semester.courses.map((course) => (
                <div key={course.code} className="flex items-center gap-3 p-2.5 rounded-lg bg-uni-dark/50 border border-uni-border/20">
                  <span className="text-xs font-mono text-uni-muted w-16 flex-shrink-0">{course.code}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-uni-text font-medium truncate">{course.name}</div>
                    <div className="text-xs text-uni-muted truncate">{course.name_en}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[course.type]}`}>
                      {typeLabels[course.type]}
                    </span>
                    <span className="text-xs text-uni-gold font-bold w-8 text-center">{course.credits}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlanView({ plan, spec }: { plan: Plan; spec: Specialization }) {
  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap gap-3 p-4 rounded-xl bg-gradient-to-r ${spec.color} border ${spec.border}`}>
        <div className="text-center">
          <div className={`text-2xl font-black ${spec.text}`}>{plan.totalCredits}</div>
          <div className="text-xs text-uni-muted">ساعة معتمدة</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-black ${spec.text}`}>{plan.semesters.length}</div>
          <div className="text-xs text-uni-muted">فصل دراسي</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-black ${spec.text}`}>{plan.years}</div>
          <div className="text-xs text-uni-muted">سنة دراسية</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-black ${spec.text}`}>
            {plan.semesters.reduce((a, s) => a + s.courses.length, 0)}
          </div>
          <div className="text-xs text-uni-muted">إجمالي المواد</div>
        </div>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        {Object.entries(typeLabels).map(([k, v]) => (
          <span key={k} className={`px-2 py-1 rounded-full border ${typeColors[k]}`}>{v}</span>
        ))}
      </div>
      <div className="space-y-2">
        {plan.semesters.map(sem => <SemesterCard key={sem.num} semester={sem} />)}
      </div>
    </div>
  )
}

export default function AcademicPlansPage() {
  const [selectedSpec, setSelectedSpec] = useState<string>('cs')
  const [selectedPlan, setSelectedPlan] = useState<'diploma' | 'bachelor'>('bachelor')

  const spec = SPECIALIZATIONS.find(s => s.id === selectedSpec)!
  const plan = selectedPlan === 'diploma' ? spec.diploma : spec.bachelor

  return (
    <div className="min-h-screen bg-uni-dark text-uni-text" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-uni-border/30 px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-uni-dark" />
          </div>
          <span className="font-black text-sm text-gold-gradient hidden sm:block">مملكة الأرض الافتراضية</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/roadmap" className="text-uni-muted hover:text-uni-text text-sm transition-colors">خريطة التطوير</Link>
          <Link href="/student/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-uni-gold text-uni-dark text-sm font-bold hover:bg-uni-gold-light transition-all">
            <ArrowRight className="w-3.5 h-3.5" /> لوحة التحكم
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-uni-gold/10 border border-uni-gold/20 text-uni-gold text-sm">
            <BookOpen className="w-4 h-4" /> الخطط الأكاديمية والمناهج الدراسية
          </div>
          <h1 className="text-3xl md:text-4xl font-black">
            <span className="text-gold-gradient">الخطط الدراسية</span> التفصيلية
          </h1>
          <p className="text-uni-muted max-w-2xl mx-auto">
            خطط دراسية مفصّلة لكل تخصص — دبلوم وبكالوريوس — مع توزيع المواد على الفصول الدراسية والساعات المعتمدة.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — Specializations */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:w-72 flex-shrink-0 space-y-2">
            <h2 className="font-bold text-uni-text flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-uni-gold" /> التخصصات
            </h2>
            {SPECIALIZATIONS.map(s => {
              const Icon = s.icon
              const active = selectedSpec === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSpec(s.id)
                    const hasBachelor = s.bachelor !== null
                    const hasDiploma = s.diploma !== null
                    if (selectedPlan === 'bachelor' && !hasBachelor) setSelectedPlan('diploma')
                    if (selectedPlan === 'diploma' && !hasDiploma) setSelectedPlan('bachelor')
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all text-right border ${
                    active
                      ? `bg-gradient-to-r ${s.color} ${s.border} ${s.text} font-semibold`
                      : 'border-uni-border/20 text-uni-muted hover:text-uni-text hover:bg-uni-card/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? s.text : ''}`} />
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs opacity-70 truncate">{s.name_en}</div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {s.diploma && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">دبلوم</span>}
                    {s.bachelor && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">بكالوريوس</span>}
                  </div>
                </button>
              )
            })}
          </motion.div>

          {/* Main Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 min-w-0 space-y-4">
            {/* Spec Header */}
            <div className={`p-4 rounded-xl bg-gradient-to-r ${spec.color} border ${spec.border}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-uni-dark/50 flex items-center justify-center flex-shrink-0`}>
                  <spec.icon className={`w-6 h-6 ${spec.text}`} />
                </div>
                <div className="flex-1">
                  <h2 className={`text-xl font-black ${spec.text}`}>{spec.name}</h2>
                  <p className="text-uni-muted text-sm mt-0.5">{spec.name_en}</p>
                  <p className="text-uni-text text-sm mt-2">{spec.description}</p>
                </div>
              </div>
            </div>

            {/* Plan Type Toggle */}
            <div className="flex gap-2">
              {spec.diploma && (
                <button
                  onClick={() => setSelectedPlan('diploma')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    selectedPlan === 'diploma'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'border-uni-border/30 text-uni-muted hover:text-uni-text'
                  }`}
                >
                  <Award className="w-4 h-4" /> دبلوم (سنتان)
                </button>
              )}
              {spec.bachelor && (
                <button
                  onClick={() => setSelectedPlan('bachelor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    selectedPlan === 'bachelor'
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                      : 'border-uni-border/30 text-uni-muted hover:text-uni-text'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" /> بكالوريوس (4 سنوات)
                </button>
              )}
            </div>

            {/* Plan Content */}
            {plan ? (
              <PlanView plan={plan} spec={spec} />
            ) : (
              <div className="card-uni text-center py-12">
                <Clock className="w-12 h-12 text-uni-muted mx-auto mb-3" />
                <p className="text-uni-muted">هذه الخطة قيد الإعداد</p>
                <Link href="/roadmap" className="text-uni-gold text-sm hover:underline mt-2 inline-block">عرض خريطة التطوير</Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
