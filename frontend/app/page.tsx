'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/store'
import { useT, useI18nStore } from '@/lib/i18n'
import {
  Brain, GraduationCap, Users, BookOpen, Award,
  ChevronLeft, BarChart3, Globe, Shield,
  Play, CheckCircle, Menu, X, Clock, Languages, Star
} from 'lucide-react'

const STATS = [
  { value: 'AI', label: 'مدعوم بالذكاء الاصطناعي', icon: Brain },
  { value: '20+', label: 'تخصص أكاديمي', icon: GraduationCap },
  { value: '6', label: 'مستويات إنجليزية CEFR', icon: Languages },
  { value: '24/7', label: 'أساتذة متاحون', icon: Users },
]

const PROGRAM_TYPES = [
  { key: 'courses', label: 'دورات تدريبية', icon: '📚', duration: 'أسابيع – أشهر', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10' },
  { key: 'diploma', label: 'دبلومات', icon: '🏅', duration: '1 – 2 سنة', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
  { key: 'bachelor', label: 'بكالوريوس', icon: '🎓', duration: '4 سنوات', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
]

const DIPLOMA_PROGRAMS = [
  { icon: '💻', name: 'دبلوم تطوير البرمجيات', desc: 'Full-Stack Development بـ React و Node.js', units: 12, hours: 360, color: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/30' },
  { icon: '🤖', name: 'دبلوم الذكاء الاصطناعي', desc: 'Python, Machine Learning, Deep Learning', units: 14, hours: 420, color: 'from-violet-600/20 to-purple-600/20', border: 'border-violet-500/30' },
  { icon: '🔐', name: 'دبلوم الأمن السيبراني', desc: 'Network Security, Ethical Hacking', units: 10, hours: 300, color: 'from-red-600/20 to-rose-600/20', border: 'border-red-500/30' },
  { icon: '📊', name: 'دبلوم إدارة الأعمال', desc: 'MBA مصغّر – إدارة، تسويق، مالية', units: 12, hours: 360, color: 'from-amber-600/20 to-yellow-600/20', border: 'border-amber-500/30' },
]

const FACULTIES = [
  {
    icon: '💻',
    color: 'from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    name: 'كلية علوم الحاسب',
    programs: ['علوم الحاسب', 'هندسة البرمجيات', 'الأمن السيبراني', 'الذكاء الاصطناعي', 'علم البيانات', 'الحوسبة السحابية'],
  },
  {
    icon: '📊',
    color: 'from-amber-600/20 to-yellow-600/20',
    border: 'border-amber-500/30',
    name: 'كلية الإدارة والأعمال',
    programs: ['إدارة الأعمال', 'المحاسبة', 'التسويق', 'المالية', 'الموارد البشرية', 'ريادة الأعمال'],
  },
]

const FEATURES = [
  { icon: Brain, title: 'أساتذة ذكاء اصطناعي', desc: 'أستاذ AI مخصص لكل مادة مع شخصية أكاديمية فريدة' },
  { icon: Users, title: 'التوأم الأكاديمي', desc: 'نظام AI يعرف نقاط قوتك وضعفك ويصمم تجربة تعلم شخصية' },
  { icon: BarChart3, title: 'تقييم ذكي', desc: 'اختبارات تلقائية مع تصحيح فوري وتغذية راجعة مفصلة' },
  { icon: Shield, title: 'نظام مكافحة الغش', desc: 'تقنية AI متقدمة لضمان نزاهة الاختبارات الأكاديمية' },
  { icon: Globe, title: 'برنامج اللغة الإنجليزية', desc: '6 مستويات CEFR من A1 إلى C2 مع مدرب AI متخصص' },
  { icon: Award, title: 'شهادات معتمدة', desc: 'شهادات رقمية قابلة للتحقق مع رمز QR فريد' },
]

const ENGLISH_LEVELS = [
  { level: 'A1', name: 'مبتدئ', color: 'bg-red-500/20 border-red-500/40 text-red-400' },
  { level: 'A2', name: 'أساسي', color: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
  { level: 'B1', name: 'متوسط', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
  { level: 'B2', name: 'فوق المتوسط', color: 'bg-green-500/20 border-green-500/40 text-green-400' },
  { level: 'C1', name: 'متقدم', color: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { level: 'C2', name: 'إتقان تام', color: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'سجّل وحدد تخصصك', desc: 'اختر كليتك وتخصصك، أجب على اختبار التشخيص' },
  { step: '02', title: 'تعلّم مع أساتذة AI', desc: 'محاضرات تفاعلية، واجبات، ومحادثة مباشرة مع أستاذك الذكي' },
  { step: '03', title: 'احصل على شهادتك', desc: 'أكمل متطلبات الدرجة واحصل على شهادتك المعتمدة' },
]

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [programTab, setProgramTab] = useState<'courses' | 'diploma' | 'bachelor'>('courses')
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const { t, lang } = useT()

  return (
    <div className="min-h-screen bg-uni-dark overflow-x-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-uni-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-uni-dark" />
            </div>
            <span className="font-bold text-base md:text-lg text-uni-gold">{t.home.heroTitle}</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="#programs" className="text-uni-muted hover:text-uni-gold text-sm transition-colors">الدورات</Link>
            <Link href="/roadmap" className="text-uni-muted hover:text-uni-gold text-sm transition-colors">خريطة التطوير</Link>
            <Link href="/academic/plans" className="text-uni-muted hover:text-uni-gold text-sm transition-colors">الخطط الدراسية</Link>
            <Link href="/pricing" className="text-uni-muted hover:text-uni-gold text-sm transition-colors">الأسعار</Link>
            <button onClick={() => useI18nStore.getState().toggleLang()} className="text-uni-muted hover:text-uni-gold text-xs border border-uni-border/30 rounded-lg px-2 py-1 hover:border-uni-gold/30 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> {lang === 'ar' ? 'EN' : 'AR'}
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => router.push(isAdmin ? '/admin/dashboard' : '/student/dashboard')}
                className="btn-gold px-5 py-2 rounded-lg text-sm font-semibold"
              >
                {t.nav.dashboard}
              </button>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost-gold px-5 py-2 rounded-lg text-sm font-semibold">
                  {t.auth.login}
                </Link>
                <Link href="/auth/register" className="btn-gold px-5 py-2 rounded-lg text-sm font-semibold">
                  {t.home.getStarted}
                </Link>
              </>
            )}
          </div>
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="sm:hidden text-uni-muted hover:text-uni-gold p-1">
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <div className="sm:hidden border-t border-uni-border/30 px-4 py-4 flex flex-col gap-3 glass">
            <Link href="/roadmap" onClick={() => setMobileMenu(false)} className="text-uni-muted hover:text-uni-gold text-sm py-1">خريطة التطوير</Link>
            <Link href="/academic/plans" onClick={() => setMobileMenu(false)} className="text-uni-muted hover:text-uni-gold text-sm py-1">الخطط الدراسية</Link>
            <Link href="/pricing" onClick={() => setMobileMenu(false)} className="text-uni-muted hover:text-uni-gold text-sm py-1">الأسعار</Link>
            {isAuthenticated ? (
              <button
                onClick={() => { setMobileMenu(false); router.push(isAdmin ? '/admin/dashboard' : '/student/dashboard') }}
                className="btn-gold px-5 py-3 rounded-lg text-sm font-semibold text-center"
              >
                {t.nav.dashboard}
              </button>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileMenu(false)} className="btn-ghost-gold px-5 py-3 rounded-lg text-sm font-semibold text-center">
                  {t.auth.login}
                </Link>
                <Link href="/auth/register" onClick={() => setMobileMenu(false)} className="btn-gold px-5 py-3 rounded-lg text-sm font-semibold text-center">
                  {t.home.getStarted}
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-uni-gold/20"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animation: `float ${4 + Math.random() * 6}s ease-in-out ${Math.random() * 3}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <span className="badge-gold text-base px-6 py-2">
              🎓 أول جامعة ذكاء اصطناعي عربية عالمية
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-black mb-6 leading-tight"
          >
            <span className="text-gold-gradient">جامعة مملكة</span>
            <br />
            <span className="text-uni-text">الأرض الافتراضية</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-uni-muted mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            منظومة جامعية متكاملة مدعومة بالذكاء الاصطناعي — تدريس، تقييم، إرشاد،
            وشهادات أكاديمية معتمدة في بيئة رقمية مستقبلية
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {isAuthenticated ? (
              <button
                onClick={() => router.push(isAdmin ? '/admin/dashboard' : '/student/dashboard')}
                className="btn-gold px-10 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 group"
              >
                انتقل للوحتك الدراسية
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            ) : (
              <Link
                href="/auth/register"
                className="btn-gold px-10 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 group"
              >
                ابدأ رحلتك التعليمية
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Link>
            )}
            <Link
              href="#programs"
              className="btn-ghost-gold px-10 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              استكشف التخصصات
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 border border-uni-gold/40 text-uni-gold rounded-xl font-bold hover:bg-uni-gold/10 transition-all flex items-center gap-2 justify-center"
            >
              عرض الأسعار والباقات
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 glass border-y border-uni-border/30">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-6 h-6 text-uni-gold mx-auto mb-2" />
              <div className="text-3xl font-black text-gold-gradient">{stat.value}</div>
              <div className="text-sm text-uni-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Programs Section - Three Types */}
      <section id="programs" className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl font-black text-uni-text mb-4">
            استكشف <span className="text-gold-gradient">البرامج التعليمية</span>
          </h2>
          <p className="text-uni-muted">ثلاثة مسارات تعليمية تناسب جميع الأهداف والمراحل</p>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {PROGRAM_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => setProgramTab(type.key as 'courses' | 'diploma' | 'bachelor')}
              className={`flex flex-col items-center gap-1 px-8 py-4 rounded-2xl font-bold transition-all border ${
                programTab === type.key
                  ? `${type.bg} ${type.border} ${type.color}`
                  : 'glass border-uni-border/30 text-uni-muted hover:border-uni-gold/30'
              }`}
            >
              <span className="text-3xl">{type.icon}</span>
              <span className="text-base font-black">{type.label}</span>
              <span className="text-xs opacity-70 flex items-center gap-1">
                <Clock className="w-3 h-3" />{type.duration}
              </span>
            </button>
          ))}
        </div>

        {/* ── دورات تدريبية ── */}
        {programTab === 'courses' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* English Course Feature Card */}
            <div className="relative rounded-2xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 glass p-8 mb-8">
              <div className="absolute top-4 left-4">
                <span className="badge-gold text-xs">⭐ الأكثر طلباً</span>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                      <Languages className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-uni-text">دورة اللغة الإنجليزية</h3>
                      <p className="text-blue-400 text-sm">الإطار الأوروبي CEFR — من مبتدئ إلى إتقان</p>
                    </div>
                  </div>
                  <p className="text-uni-muted text-sm leading-relaxed mb-6">
                    برنامج متكامل بـ 6 مستويات، يشمل المفردات والقواعد والقراءة والتمارين التفاعلية
                    مع أستاذ ذكاء اصطناعي متخصص يرافقك في كل خطوة. كل مستوى يمنحك شهادة رقمية معتمدة.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['6 وحدات لكل مستوى', 'شهادة معتمدة', 'أستاذ AI', 'A1 → C2'].map(f => (
                      <span key={f} className="flex items-center gap-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />{f}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {ENGLISH_LEVELS.map((level) => (
                      <div key={level.level} className={`p-3 rounded-xl border text-center ${level.color} glass-hover`}>
                        <div className="text-xl font-black mb-0.5">{level.level}</div>
                        <div className="text-xs">{level.name}</div>
                        <div className="text-xs opacity-60 mt-1">
                          {['A1','A2'].includes(level.level) ? 'مجاني' : 'مدفوع'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={isAuthenticated ? '/student/english' : '/auth/register'}
                    className="btn-gold w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Languages className="w-5 h-5" />
                    {isAuthenticated ? 'ادخل للدورة' : 'ابدأ مجاناً من A1'}
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* More Courses Coming Soon */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: '💻', name: 'أساسيات البرمجة', desc: 'Python للمبتدئين', badge: 'قريباً' },
                { icon: '🎨', name: 'تصميم الجرافيك', desc: 'Figma & Illustrator', badge: 'قريباً' },
                { icon: '📈', name: 'ريادة الأعمال', desc: 'بناء الشركات الناشئة', badge: 'قريباً' },
              ].map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="card-uni glass-hover opacity-70 relative">
                  <span className="absolute top-3 left-3 text-xs bg-uni-gold/20 text-uni-gold border border-uni-gold/30 px-2 py-0.5 rounded-full">{c.badge}</span>
                  <div className="text-3xl mb-3">{c.icon}</div>
                  <h4 className="font-bold text-uni-text mb-1">{c.name}</h4>
                  <p className="text-uni-muted text-sm">{c.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── دبلومات ── */}
        {programTab === 'diploma' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="grid md:grid-cols-2 gap-6">
              {DIPLOMA_PROGRAMS.map((dp, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={`card-uni bg-gradient-to-br ${dp.color} border ${dp.border} glass-hover relative overflow-hidden`}>
                  <span className="absolute top-3 left-3 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">قريباً</span>
                  <div className="text-4xl mb-3">{dp.icon}</div>
                  <h3 className="text-xl font-black text-uni-text mb-2">{dp.name}</h3>
                  <p className="text-uni-muted text-sm mb-4">{dp.desc}</p>
                  <div className="flex gap-4 text-xs text-uni-muted">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{dp.units} وحدة</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{dp.hours} ساعة</span>
                    <span className="flex items-center gap-1"><Award className="w-3 h-3" />شهادة دبلوم</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center glass rounded-2xl p-6 border border-amber-500/20">
              <Star className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-uni-muted text-sm">الدبلومات قيد الإعداد — سجّل الآن واحصل على إشعار عند الإطلاق</p>
              <Link href="/auth/register" className="btn-gold mt-4 inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold">
                أبلّغني عند الإطلاق <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── بكالوريوس ── */}
        {programTab === 'bachelor' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="grid md:grid-cols-2 gap-8">
              {FACULTIES.map((faculty, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`card-uni bg-gradient-to-br ${faculty.color} border ${faculty.border} glass-hover`}
                >
                  <div className="text-5xl mb-4">{faculty.icon}</div>
                  <h3 className="text-2xl font-bold text-uni-text mb-4">{faculty.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {faculty.programs.map((prog) => (
                      <span key={prog} className="badge-gold text-xs">{prog}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-uni-muted mt-2 pt-4 border-t border-uni-border/20">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />4 سنوات</span>
                    <span className="flex items-center gap-1"><Award className="w-3 h-3" />درجة بكالوريوس</span>
                    <span className="flex items-center gap-1"><Brain className="w-3 h-3" />أستاذ AI لكل مادة</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/auth/register" className="btn-gold inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold">
                سجّل في البكالوريوس <ChevronLeft className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-uni-text mb-4">
            مزايا <span className="text-gold-gradient">استثنائية</span>
          </h2>
          <p className="text-uni-muted">تقنيات الذكاء الاصطناعي الأكثر تقدماً في خدمة تعليمك</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card-uni glass-hover group"
            >
              <div className="w-12 h-12 rounded-xl bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center mb-4 group-hover:bg-uni-gold/20 transition-colors">
                <feature.icon className="w-6 h-6 text-uni-gold" />
              </div>
              <h3 className="text-lg font-bold text-uni-text mb-2">{feature.title}</h3>
              <p className="text-uni-muted text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-uni-text mb-4">
            كيف <span className="text-gold-gradient">تبدأ؟</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="text-center card-uni"
            >
              <div className="text-6xl font-black text-gold-gradient mb-4">{step.step}</div>
              <h3 className="text-xl font-bold text-uni-text mb-2">{step.title}</h3>
              <p className="text-uni-muted text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto text-center card-uni border-uni-gold/30 animate-glow-pulse"
        >
          <GraduationCap className="w-16 h-16 text-uni-gold mx-auto mb-6" />
          <h2 className="text-4xl font-black text-uni-text mb-4">
            ابدأ رحلتك الأكاديمية اليوم
          </h2>
          <p className="text-uni-muted mb-8 text-lg">
            انضم إلى جيل جديد من الطلاب يتعلمون بأحدث تقنيات الذكاء الاصطناعي
          </p>
          {isAuthenticated ? (
            <button
              onClick={() => router.push(isAdmin ? '/admin/dashboard' : '/student/dashboard')}
              className="btn-gold px-12 py-4 rounded-xl text-xl font-bold inline-flex items-center gap-2"
            >
              انتقل للوحتك الدراسية
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/auth/register"
              className="btn-gold px-12 py-4 rounded-xl text-xl font-bold inline-flex items-center gap-2"
            >
              سجّل الآن مجاناً
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-uni-border/30 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-uni-gold" />
          <span className="font-bold text-uni-gold">جامعة مملكة الأرض الافتراضية</span>
        </div>
        <p className="text-uni-subtle text-sm">
          © 2025 Virtual Earth Kingdom University · مدعوم بالذكاء الاصطناعي
        </p>
      </footer>
    </div>
  )
}
