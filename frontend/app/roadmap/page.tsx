'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GraduationCap, Clock, CheckCircle, Zap, Globe, Brain, BookOpen, ChevronLeft, Users, Award, Layers, Database, Shield, BarChart3, Code2, TrendingUp, Star } from 'lucide-react'

const CURRENT_PROGRAMS = [
  {
    icon: '💻',
    name: 'كلية علوم الحاسب',
    color: 'from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    status: 'active',
    specializations: [
      { name: 'علوم الحاسب', name_en: 'Computer Science', diploma: true, bachelor: true },
      { name: 'هندسة البرمجيات', name_en: 'Software Engineering', diploma: true, bachelor: true },
      { name: 'الأمن السيبراني', name_en: 'Cybersecurity', diploma: true, bachelor: true },
      { name: 'الذكاء الاصطناعي', name_en: 'Artificial Intelligence', diploma: false, bachelor: true },
      { name: 'علم البيانات', name_en: 'Data Science', diploma: false, bachelor: true },
      { name: 'الحوسبة السحابية', name_en: 'Cloud Computing', diploma: true, bachelor: false },
    ],
  },
  {
    icon: '📊',
    name: 'كلية الإدارة والأعمال',
    color: 'from-amber-600/20 to-yellow-600/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    status: 'active',
    specializations: [
      { name: 'إدارة الأعمال', name_en: 'Business Administration', diploma: true, bachelor: true },
      { name: 'المحاسبة', name_en: 'Accounting', diploma: true, bachelor: true },
      { name: 'التسويق', name_en: 'Marketing', diploma: true, bachelor: true },
      { name: 'المالية', name_en: 'Finance', diploma: false, bachelor: true },
      { name: 'الموارد البشرية', name_en: 'Human Resources', diploma: true, bachelor: true },
      { name: 'ريادة الأعمال', name_en: 'Entrepreneurship', diploma: true, bachelor: false },
    ],
  },
]

const ROADMAP = [
  {
    phase: 'المرحلة الأولى',
    period: '2025',
    status: 'active',
    color: 'border-uni-green bg-uni-green/5',
    badge: 'text-uni-green border-uni-green/40 bg-uni-green/10',
    label: 'متاح الآن',
    icon: CheckCircle,
    items: [
      { icon: '💻', name: 'كلية علوم الحاسب', desc: '6 تخصصات — دبلوم وبكالوريوس' },
      { icon: '📊', name: 'كلية الإدارة والأعمال', desc: '6 تخصصات — دبلوم وبكالوريوس' },
      { icon: '🇬🇧', name: 'برنامج اللغة الإنجليزية', desc: '6 مستويات CEFR مع أستاذ AI' },
    ],
  },
  {
    phase: 'المرحلة الثانية',
    period: '2026 Q1',
    status: 'soon',
    color: 'border-uni-gold bg-uni-gold/5',
    badge: 'text-uni-gold border-uni-gold/40 bg-uni-gold/10',
    label: 'قريباً',
    icon: Zap,
    items: [
      { icon: '🤖', name: 'تعلم الآلة والذكاء الاصطناعي التطبيقي', desc: 'Machine Learning & Applied AI — دبلوم متخصص' },
      { icon: '📱', name: 'تطوير تطبيقات الجوال', desc: 'Mobile Development (iOS/Android/Flutter)' },
      { icon: '🔗', name: 'تقنية البلوكتشين', desc: 'Blockchain & Web3 Development' },
    ],
  },
  {
    phase: 'المرحلة الثالثة',
    period: '2026 Q2',
    status: 'planned',
    color: 'border-uni-blue bg-uni-blue/5',
    badge: 'text-uni-blue border-uni-blue/40 bg-uni-blue/10',
    label: 'مخطط',
    icon: TrendingUp,
    items: [
      { icon: '🗄️', name: 'نظم المعلومات الإدارية', desc: 'Management Information Systems — بكالوريوس' },
      { icon: '📐', name: 'هندسة الشبكات والبنية التحتية', desc: 'Network Engineering — دبلوم وبكالوريوس' },
      { icon: '📉', name: 'تحليل البيانات والذكاء التجاري', desc: 'Business Intelligence & Analytics' },
    ],
  },
  {
    phase: 'المرحلة الرابعة',
    period: '2026 Q3–Q4',
    status: 'future',
    color: 'border-uni-purple bg-uni-purple/5',
    badge: 'text-uni-purple border-uni-purple/40 bg-uni-purple/10',
    label: 'مستقبلي',
    icon: Star,
    items: [
      { icon: '⚕️', name: 'المعلوماتية الطبية', desc: 'Health Informatics — بكالوريوس' },
      { icon: '⚖️', name: 'القانون الرقمي وحوكمة البيانات', desc: 'Digital Law & Data Governance' },
      { icon: '🎨', name: 'تصميم تجربة المستخدم', desc: 'UX/UI Design — دبلوم وبكالوريوس' },
      { icon: '🌍', name: 'الدبلوماسية الرقمية والعلوم السياسية', desc: 'Digital Diplomacy — بكالوريوس' },
    ],
  },
]

const MILESTONES = [
  { year: '2025', title: 'إطلاق الجامعة', desc: 'أول جامعة ذكاء اصطناعي عربية — كليتان وبرنامج إنجليزي', done: true },
  { year: 'Q1 2026', title: 'التوسع التقني', desc: 'إضافة تخصصات AI/ML وتطوير الجوال والبلوكتشين', done: false },
  { year: 'Q2 2026', title: 'التوسع الإداري', desc: 'نظم المعلومات والشبكات وتحليل البيانات', done: false },
  { year: 'Q3 2026', title: 'التكامل الصحي والقانوني', desc: 'المعلوماتية الطبية والقانون الرقمي', done: false },
  { year: '2027', title: 'الجامعة الكاملة', desc: 'أكثر من 20 تخصصاً عبر 4 كليات متكاملة', done: false },
]

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-uni-dark" dir="rtl">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-uni-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-uni-dark" />
            </div>
            <span className="font-bold text-uni-gold">مملكة الأرض الافتراضية</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/academic/plans" className="text-uni-muted hover:text-uni-gold text-sm transition-colors">المناهج الدراسية</Link>
            <Link href="/auth/login" className="btn-ghost-gold px-4 py-2 rounded-lg text-sm">دخول</Link>
            <Link href="/auth/register" className="btn-gold px-4 py-2 rounded-lg text-sm font-bold">ابدأ مجاناً</Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto space-y-20">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <span className="badge-gold text-sm px-6 py-2 mb-6 inline-block">🗺️ خارطة تطوير الجامعة</span>
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            <span className="text-gold-gradient">مسيرة التطوير</span>
            <br />
            <span className="text-uni-text">نحو الجامعة المتكاملة</span>
          </h1>
          <p className="text-uni-muted text-lg max-w-2xl mx-auto">
            خطة واضحة لتطوير جامعة مملكة الأرض الافتراضية — من الإطلاق إلى أكثر من 20 تخصصاً أكاديمياً بحلول 2027
          </p>
        </motion.div>

        {/* Timeline Milestones */}
        <section>
          <h2 className="text-3xl font-black text-uni-text mb-10 text-center">المحطات الرئيسية</h2>
          <div className="relative">
            <div className="absolute right-8 md:right-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-uni-gold via-uni-blue to-uni-purple opacity-30" />
            <div className="space-y-8">
              {MILESTONES.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-6 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse md:flex-row'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    m.done ? 'bg-uni-green/20 border-2 border-uni-green' : 'bg-uni-border/30 border-2 border-uni-border'
                  }`}>
                    {m.done ? <CheckCircle className="w-7 h-7 text-uni-green" /> : <Clock className="w-7 h-7 text-uni-muted" />}
                  </div>
                  <div className={`card-uni flex-1 max-w-md ${m.done ? 'border-uni-green/30' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-black text-lg ${m.done ? 'text-uni-green' : 'text-uni-gold'}`}>{m.year}</span>
                      {m.done && <span className="badge-gold text-xs text-uni-green border-uni-green/40 bg-uni-green/10">مكتمل ✓</span>}
                    </div>
                    <h3 className="font-bold text-uni-text mb-1">{m.title}</h3>
                    <p className="text-uni-muted text-sm">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Current Programs */}
        <section>
          <h2 className="text-3xl font-black text-uni-text mb-4 text-center">الكليات المتاحة الآن</h2>
          <p className="text-center text-uni-muted mb-10">كليتان رئيسيتان تضمان 12 تخصصاً بخطط دبلوم وبكالوريوس</p>
          <div className="grid md:grid-cols-2 gap-8">
            {CURRENT_PROGRAMS.map((faculty, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`card-uni bg-gradient-to-br ${faculty.color} border ${faculty.border}`}>
                <div className="text-5xl mb-4">{faculty.icon}</div>
                <h3 className={`text-xl font-bold mb-1 ${faculty.text}`}>{faculty.name}</h3>
                <div className="flex gap-2 mb-4">
                  <span className="badge-gold text-xs text-uni-green border-uni-green/40 bg-uni-green/10">متاح الآن ✓</span>
                </div>
                <div className="space-y-2">
                  {faculty.specializations.map((s, j) => (
                    <div key={j} className="flex items-center justify-between p-2 rounded-lg bg-black/20">
                      <div>
                        <span className="text-sm text-uni-text font-medium">{s.name}</span>
                        <span className="text-xs text-uni-muted mr-2">/ {s.name_en}</span>
                      </div>
                      <div className="flex gap-1">
                        {s.diploma && <span className="badge-gold text-xs px-2">دبلوم</span>}
                        {s.bachelor && <span className="badge-gold text-xs px-2 text-uni-blue border-uni-blue/40 bg-uni-blue/10">بكالوريوس</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/academic/plans"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-uni-gold/10 border border-uni-gold/20 text-uni-gold text-sm font-semibold hover:bg-uni-gold/20 transition-all">
                  <BookOpen className="w-4 h-4" /> عرض المناهج الدراسية
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Roadmap Phases */}
        <section>
          <h2 className="text-3xl font-black text-uni-text mb-4 text-center">خارطة التطوير المستقبلية</h2>
          <p className="text-center text-uni-muted mb-10">التخصصات والكليات القادمة على مراحل حتى 2027</p>
          <div className="grid md:grid-cols-2 gap-6">
            {ROADMAP.map((phase, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`card-uni border ${phase.color}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-black text-uni-text">{phase.phase}</h3>
                    <div className="flex items-center gap-1 text-uni-muted text-xs mt-0.5">
                      <Clock className="w-3 h-3" /> {phase.period}
                    </div>
                  </div>
                  <span className={`badge-gold text-xs ${phase.badge}`}>{phase.label}</span>
                </div>
                <div className="space-y-3">
                  {phase.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-3 p-3 rounded-xl bg-black/20">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="font-semibold text-uni-text text-sm">{item.name}</div>
                        <div className="text-uni-muted text-xs mt-0.5">{item.desc}</div>
                      </div>
                      {phase.status !== 'active' && (
                        <span className="mr-auto text-xs text-uni-subtle flex-shrink-0">قريباً</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="card-uni border-uni-gold/20 bg-uni-gold/5">
          <h2 className="text-2xl font-black text-uni-text mb-8 text-center">رقم الجامعة بحلول 2027</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '4+', label: 'كليات أكاديمية', icon: GraduationCap },
              { value: '20+', label: 'تخصصاً دراسياً', icon: Layers },
              { value: '40+', label: 'برنامج دبلوم وبكالوريوس', icon: Award },
              { value: '24/7', label: 'أستاذ AI متاح', icon: Brain },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <stat.icon className="w-8 h-8 text-uni-gold mx-auto mb-2" />
                <div className="text-4xl font-black text-gold-gradient mb-1">{stat.value}</div>
                <div className="text-uni-muted text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link href="/auth/register" className="btn-gold px-12 py-4 rounded-xl text-xl font-bold inline-flex items-center gap-2">
            سجّل الآن وكن من الأوائل
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="glass border-t border-uni-border/30 py-6 px-4 text-center">
        <p className="text-uni-subtle text-sm">© 2025 جامعة مملكة الأرض الافتراضية · مدعوم بالذكاء الاصطناعي</p>
      </footer>
    </div>
  )
}
