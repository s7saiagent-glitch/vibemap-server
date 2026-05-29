'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Brain, GraduationCap, Users, BookOpen, Award,
  ChevronLeft, BarChart3, Globe, Shield,
  Play, CheckCircle, Menu, X
} from 'lucide-react'

const STATS = [
  { value: 'AI', label: 'مدعوم بالذكاء الاصطناعي', icon: Brain },
  { value: '20+', label: 'تخصص أكاديمي', icon: GraduationCap },
  { value: '6', label: 'مستويات إنجليزية', icon: Globe },
  { value: '24/7', label: 'أساتذة متاحون', icon: Users },
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

  return (
    <div className="min-h-screen bg-uni-dark overflow-x-hidden" dir="rtl">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-uni-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-uni-dark" />
            </div>
            <span className="font-bold text-base md:text-lg text-uni-gold">مملكة الأرض الجامعية</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <button className="text-uni-muted hover:text-uni-gold text-xs border border-uni-border/30 rounded-lg px-2 py-1 hover:border-uni-gold/30 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> AR
            </button>
            <Link href="/auth/login" className="btn-ghost-gold px-5 py-2 rounded-lg text-sm font-semibold">
              تسجيل الدخول
            </Link>
            <Link href="/auth/register" className="btn-gold px-5 py-2 rounded-lg text-sm font-semibold">
              ابدأ مجاناً
            </Link>
          </div>
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="sm:hidden text-uni-muted hover:text-uni-gold p-1">
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <div className="sm:hidden border-t border-uni-border/30 px-4 py-4 flex flex-col gap-3 glass">
            <Link href="/auth/login" onClick={() => setMobileMenu(false)} className="btn-ghost-gold px-5 py-3 rounded-lg text-sm font-semibold text-center">
              تسجيل الدخول
            </Link>
            <Link href="/auth/register" onClick={() => setMobileMenu(false)} className="btn-gold px-5 py-3 rounded-lg text-sm font-semibold text-center">
              ابدأ مجاناً
            </Link>
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
            <Link
              href="/auth/register"
              className="btn-gold px-10 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 group"
            >
              ابدأ رحلتك التعليمية
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#programs"
              className="btn-ghost-gold px-10 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              استكشف التخصصات
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

      {/* Colleges Section */}
      <section id="programs" className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-uni-text mb-4">
            الكليات و<span className="text-gold-gradient">التخصصات</span>
          </h2>
          <p className="text-uni-muted">كليتان رئيسيتان تضمان أكثر من 15 تخصصاً أكاديمياً</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {FACULTIES.map((faculty, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`card-uni bg-gradient-to-br ${faculty.color} border ${faculty.border} glass-hover`}
            >
              <div className="text-5xl mb-4">{faculty.icon}</div>
              <h3 className="text-2xl font-bold text-uni-text mb-4">{faculty.name}</h3>
              <div className="flex flex-wrap gap-2">
                {faculty.programs.map((prog) => (
                  <span key={prog} className="badge-gold text-xs">{prog}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
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

      {/* English Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-uni-text mb-4">
            برنامج <span className="text-blue-gradient">اللغة الإنجليزية</span>
          </h2>
          <p className="text-uni-muted">6 مستويات CEFR مع مدرب AI متخصص يرافقك في كل خطوة</p>
        </motion.div>

        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-uni-gold/30 to-transparent transform -translate-y-1/2 hidden md:block" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
            {ENGLISH_LEVELS.map((level, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-xl border text-center ${level.color} glass-hover cursor-pointer`}
              >
                <div className="text-2xl font-black mb-1">{level.level}</div>
                <div className="text-xs font-medium">{level.name}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {['Reading', 'Writing', 'Grammar', 'Vocabulary', 'Listening', 'Speaking'].map((skill, i) => (
            <div key={i} className="flex items-center gap-3 glass p-3 rounded-lg">
              <CheckCircle className="w-5 h-5 text-uni-gold flex-shrink-0" />
              <span className="text-uni-text text-sm">{skill}</span>
            </div>
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
          <Link
            href="/auth/register"
            className="btn-gold px-12 py-4 rounded-xl text-xl font-bold inline-flex items-center gap-2"
          >
            سجّل الآن مجاناً
            <ChevronLeft className="w-5 h-5" />
          </Link>
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
