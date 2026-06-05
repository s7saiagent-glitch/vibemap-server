'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code, Globe, Database, Brain, Shield, Lock, ChevronDown,
  ChevronUp, CheckCircle, Play, BookOpen, Zap, Star, Trophy,
  Terminal, Layers, BarChart2, Eye, Server, Cpu, FileCode,
  Activity, Network, AlertTriangle, Key, Search
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useT } from '@/lib/i18n'
import { paymentAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lesson {
  title: string
  icon: React.ElementType
  duration: string
  free?: boolean
}

interface Course {
  id: string
  title: string
  description: string
  emoji: string
  category: 'برمجة' | 'ويب' | 'بيانات' | 'ذكاء' | 'أمن'
  level: string
  levelColor: string
  price: number | null
  lessons: Lesson[]
  gradientFrom: string
  gradientTo: string
  accentColor: string
  bgPattern: string
  progress?: number
}

// ─── Course Data ──────────────────────────────────────────────────────────────
const COURSES: Course[] = [
  {
    id: 'python-basics',
    title: 'Python للمبتدئين',
    description: 'تعلم أساسيات البرمجة بلغة Python من الصفر، مع تطبيقات عملية ومشاريع حقيقية',
    emoji: '🐍',
    category: 'برمجة',
    level: 'مبتدئ',
    levelColor: 'text-green-400',
    price: null,
    gradientFrom: 'from-green-900/40',
    gradientTo: 'to-emerald-900/20',
    accentColor: 'border-green-500/40',
    bgPattern: 'bg-green-500/5',
    progress: 35,
    lessons: [
      { title: 'مقدمة للبرمجة', icon: Terminal, duration: '20 د', free: true },
      { title: 'المتغيرات والأنواع', icon: FileCode, duration: '25 د', free: true },
      { title: 'الشروط والحلقات', icon: Activity, duration: '30 د' },
      { title: 'الدوال', icon: Code, duration: '25 د' },
      { title: 'القوائم', icon: Layers, duration: '20 د' },
      { title: 'القواميس', icon: Database, duration: '20 د' },
      { title: 'الملفات', icon: FileCode, duration: '25 د' },
      { title: 'المشاريع العملية', icon: Trophy, duration: '45 د' },
    ],
  },
  {
    id: 'web-dev',
    title: 'تطوير الويب',
    description: 'من HTML وCSS إلى React والـ APIs — بناء تطبيقات ويب احترافية ومتكاملة',
    emoji: '🌐',
    category: 'ويب',
    level: 'متوسط',
    levelColor: 'text-blue-400',
    price: 19,
    gradientFrom: 'from-blue-900/40',
    gradientTo: 'to-cyan-900/20',
    accentColor: 'border-blue-500/40',
    bgPattern: 'bg-blue-500/5',
    progress: 0,
    lessons: [
      { title: 'HTML الأساسية', icon: Code, duration: '25 د', free: true },
      { title: 'CSS التصميم', icon: Layers, duration: '30 د', free: true },
      { title: 'JavaScript', icon: Terminal, duration: '35 د' },
      { title: 'React', icon: Activity, duration: '40 د' },
      { title: 'APIs', icon: Network, duration: '30 د' },
      { title: 'قواعد البيانات', icon: Database, duration: '35 د' },
      { title: 'النشر', icon: Server, duration: '25 د' },
      { title: 'المشاريع', icon: Trophy, duration: '60 د' },
    ],
  },
  {
    id: 'data-science',
    title: 'علم البيانات',
    description: 'تحليل البيانات وتصويرها والتعلم الآلي باستخدام Python وأدواتها القوية',
    emoji: '📊',
    category: 'بيانات',
    level: 'متوسط',
    levelColor: 'text-purple-400',
    price: 29,
    gradientFrom: 'from-purple-900/40',
    gradientTo: 'to-violet-900/20',
    accentColor: 'border-purple-500/40',
    bgPattern: 'bg-purple-500/5',
    progress: 0,
    lessons: [
      { title: 'مقدمة لـ NumPy', icon: BarChart2, duration: '25 د', free: true },
      { title: 'Pandas', icon: Database, duration: '30 د', free: true },
      { title: 'التصوير البياني', icon: Activity, duration: '25 د' },
      { title: 'تنظيف البيانات', icon: Search, duration: '30 د' },
      { title: 'التحليل الإحصائي', icon: BarChart2, duration: '35 د' },
      { title: 'ML الأساسية', icon: Brain, duration: '40 د' },
      { title: 'نماذج تنبؤية', icon: Cpu, duration: '35 د' },
      { title: 'التقارير', icon: FileCode, duration: '30 د' },
    ],
  },
  {
    id: 'ai',
    title: 'الذكاء الاصطناعي',
    description: 'الغوص في عالم الذكاء الاصطناعي — من الشبكات العصبية إلى نماذج LLM وتطبيقاتها',
    emoji: '🤖',
    category: 'ذكاء',
    level: 'متقدم',
    levelColor: 'text-yellow-400',
    price: 39,
    gradientFrom: 'from-yellow-900/40',
    gradientTo: 'to-amber-900/20',
    accentColor: 'border-yellow-500/40',
    bgPattern: 'bg-yellow-500/5',
    progress: 0,
    lessons: [
      { title: 'مفاهيم AI', icon: Brain, duration: '30 د', free: true },
      { title: 'شبكات عصبية', icon: Network, duration: '35 د', free: true },
      { title: 'Computer Vision', icon: Eye, duration: '40 د' },
      { title: 'NLP', icon: FileCode, duration: '35 د' },
      { title: 'Reinforcement Learning', icon: Activity, duration: '40 د' },
      { title: 'نماذج LLM', icon: Cpu, duration: '45 د' },
      { title: 'تطبيقات عملية', icon: Zap, duration: '40 د' },
      { title: 'مشاريع', icon: Trophy, duration: '60 د' },
    ],
  },
  {
    id: 'cybersecurity',
    title: 'الأمن السيبراني',
    description: 'حماية الأنظمة والشبكات واختبار الاختراق — المسار الاحترافي لأمن المعلومات',
    emoji: '🛡️',
    category: 'أمن',
    level: 'متوسط',
    levelColor: 'text-red-400',
    price: 29,
    gradientFrom: 'from-red-900/40',
    gradientTo: 'to-rose-900/20',
    accentColor: 'border-red-500/40',
    bgPattern: 'bg-red-500/5',
    progress: 0,
    lessons: [
      { title: 'أساسيات الشبكات', icon: Network, duration: '30 د', free: true },
      { title: 'التشفير', icon: Key, duration: '35 د', free: true },
      { title: 'اختبار الاختراق', icon: Search, duration: '40 د' },
      { title: 'أمن الويب', icon: Shield, duration: '35 د' },
      { title: 'الجرائم الإلكترونية', icon: AlertTriangle, duration: '30 د' },
      { title: 'الاستجابة للحوادث', icon: Activity, duration: '35 د' },
      { title: 'الشهادات', icon: Trophy, duration: '45 د' },
    ],
  },
]

const CATEGORIES = ['الكل', 'برمجة', 'ويب', 'بيانات', 'ذكاء', 'أمن'] as const
type Category = typeof CATEGORIES[number]

// ─── Animated Background Dots ─────────────────────────────────────────────────
function AnimatedBg({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full opacity-20 ${color}`}
          style={{
            width: Math.random() * 60 + 20,
            height: Math.random() * 60 + 20,
            left: `${Math.random() * 80}%`,
            top: `${Math.random() * 80}%`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Progress Circle ──────────────────────────────────────────────────────────
function ProgressCircle({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff15" strokeWidth={4} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#D4AF37"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({
  course,
  isOpen,
  onToggle,
  hasAccess,
}: {
  course: Course
  isOpen: boolean
  onToggle: () => void
  hasAccess: boolean
}) {
  const isLocked = !hasAccess && course.price !== null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: isOpen ? 0 : -4, transition: { duration: 0.2 } }}
      className={`relative rounded-2xl border ${course.accentColor} bg-gradient-to-br ${course.gradientFrom} ${course.gradientTo} overflow-hidden cursor-pointer`}
      onClick={onToggle}
    >
      {/* Animated BG */}
      <AnimatedBg color={course.bgPattern} />

      {/* Lock overlay for paid+locked */}
      {isLocked && (
        <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
          <Lock className="w-3 h-3 text-uni-gold" />
          <span className="text-xs text-uni-gold font-semibold">${course.price}</span>
        </div>
      )}

      {/* Free badge */}
      {course.price === null && (
        <div className="absolute top-3 left-3 z-10 bg-green-500/20 border border-green-500/30 rounded-lg px-2 py-1">
          <span className="text-xs text-green-400 font-bold">مجاني</span>
        </div>
      )}

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Emoji icon */}
          <motion.div
            className="text-4xl select-none flex-shrink-0"
            animate={{ rotate: isOpen ? [0, -5, 5, 0] : 0 }}
            transition={{ duration: 0.4 }}
          >
            {course.emoji}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-bold text-uni-text leading-tight">{course.title}</h3>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <ChevronDown className="w-4 h-4 text-uni-muted flex-shrink-0" />
              </motion.div>
            </div>
            <p className="text-xs text-uni-muted leading-relaxed line-clamp-2">{course.description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 ${course.levelColor}`}>
            {course.level}
          </span>
          <span className="text-xs text-uni-muted flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {course.lessons.length} دروس
          </span>
          {course.progress !== undefined && course.progress > 0 && (
            <div className="flex items-center gap-2 mr-auto">
              <ProgressCircle value={course.progress} size={36} />
              <span className="text-xs text-uni-gold font-medium">{course.progress}%</span>
            </div>
          )}
        </div>

        {/* Progress bar (if enrolled) */}
        {course.progress !== undefined && course.progress > 0 && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-uni-gold to-yellow-300"
                initial={{ width: 0 }}
                animate={{ width: `${course.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Lessons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/10 pt-4">
              <div className="text-xs font-bold text-uni-gold mb-3 uppercase tracking-wider">
                المنهج الدراسي
              </div>
              <div className="space-y-2">
                {course.lessons.map((lesson, idx) => {
                  const LessonIcon = lesson.icon
                  const lessonLocked = isLocked && !lesson.free
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        lessonLocked
                          ? 'bg-white/5 opacity-60'
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        lessonLocked ? 'bg-white/5' : 'bg-white/10'
                      }`}>
                        {lessonLocked ? (
                          <Lock className="w-3.5 h-3.5 text-uni-muted" />
                        ) : (
                          <LessonIcon className="w-3.5 h-3.5 text-uni-gold" />
                        )}
                      </div>
                      <span className={`text-sm flex-1 min-w-0 truncate ${
                        lessonLocked ? 'text-uni-muted' : 'text-uni-text'
                      }`}>
                        {lesson.title}
                      </span>
                      <span className="text-xs text-uni-muted flex-shrink-0">{lesson.duration}</span>
                      {lesson.free && (
                        <span className="text-[10px] text-green-400 border border-green-500/30 rounded px-1 flex-shrink-0">
                          مجاني
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* CTA */}
              <div className="mt-4" onClick={e => e.stopPropagation()}>
                {isLocked ? (
                  <div className="flex gap-2">
                    <button className="flex-1 btn-gold text-sm py-2 flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      اشتراك — ${course.price}
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-uni-border/40 text-xs text-uni-muted hover:text-uni-text hover:border-uni-gold/30 transition-colors flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" />
                      معاينة
                    </button>
                  </div>
                ) : (
                  <button className="w-full btn-gold text-sm py-2 flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" />
                    {course.progress && course.progress > 0 ? 'متابعة التعلم' : 'ابدأ التعلم'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CSCoursesPage() {
  const { user } = useAuthStore()
  const { t } = useT()
  const [activeCategory, setActiveCategory] = useState<Category>('الكل')
  const [openCourse, setOpenCourse] = useState<string | null>(null)

  const userName = (user?.first_name_ar || user?.first_name || 'الطالب') as string

  // Check access for paid courses
  const { data: webAccess } = useQuery({
    queryKey: ['cs-access', 'web-dev'],
    queryFn: () => paymentAPI.checkAccess('cs_course', 'web-dev').then(r => r.data),
    retry: false,
  })
  const { data: dsAccess } = useQuery({
    queryKey: ['cs-access', 'data-science'],
    queryFn: () => paymentAPI.checkAccess('cs_course', 'data-science').then(r => r.data),
    retry: false,
  })
  const { data: aiAccess } = useQuery({
    queryKey: ['cs-access', 'ai'],
    queryFn: () => paymentAPI.checkAccess('cs_course', 'ai').then(r => r.data),
    retry: false,
  })
  const { data: secAccess } = useQuery({
    queryKey: ['cs-access', 'cybersecurity'],
    queryFn: () => paymentAPI.checkAccess('cs_course', 'cybersecurity').then(r => r.data),
    retry: false,
  })

  const accessMap: Record<string, boolean> = {
    'python-basics': true,
    'web-dev': !!(webAccess as { has_access?: boolean } | undefined)?.has_access,
    'data-science': !!(dsAccess as { has_access?: boolean } | undefined)?.has_access,
    'ai': !!(aiAccess as { has_access?: boolean } | undefined)?.has_access,
    'cybersecurity': !!(secAccess as { has_access?: boolean } | undefined)?.has_access,
  }

  const filteredCourses = activeCategory === 'الكل'
    ? COURSES
    : COURSES.filter(c => {
        if (activeCategory === 'ذكاء') return c.category === 'ذكاء'
        return c.category === activeCategory
      })

  const totalCourses = COURSES.length
  const freeCourses = COURSES.filter(c => c.price === null).length
  const enrolledCourses = COURSES.filter(c => c.progress && c.progress > 0).length

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto" dir="rtl">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-uni-gold/30 to-yellow-600/10 border border-uni-gold/30 flex items-center justify-center text-3xl flex-shrink-0">
              💻
            </div>
            <div>
              <h1 className="text-2xl font-black text-uni-text mb-1">
                دورات الحاسب الآلي
              </h1>
              <p className="text-uni-muted text-sm">
                مرحباً {userName}، اكتشف مسارات تعلم الحاسب الآلي المتكاملة
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'دورة متاحة', value: totalCourses, icon: BookOpen, color: 'text-uni-gold' },
              { label: 'دورات مجانية', value: freeCourses, icon: Star, color: 'text-green-400' },
              { label: 'قيد التعلم', value: enrolledCourses, icon: Trophy, color: 'text-blue-400' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="card-uni p-3 text-center"
              >
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-uni-muted">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Category Filter ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-1"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeCategory === cat
                  ? 'bg-uni-gold text-uni-dark shadow-lg shadow-uni-gold/20'
                  : 'bg-uni-card border border-uni-border/30 text-uni-muted hover:text-uni-text hover:border-uni-gold/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* ── Course Grid ── */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isOpen={openCourse === course.id}
                onToggle={() => setOpenCourse(openCourse === course.id ? null : course.id)}
                hasAccess={accessMap[course.id] ?? false}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredCourses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-uni-muted"
          >
            <Code className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد دورات في هذه الفئة</p>
          </motion.div>
        )}

        {/* ── Info Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 card-uni p-5 flex items-center gap-4"
        >
          <div className="text-3xl">🎓</div>
          <div>
            <div className="font-bold text-uni-text text-sm mb-0.5">اشترك في الباقة الكاملة</div>
            <div className="text-xs text-uni-muted">
              احصل على وصول غير محدود لجميع الدورات وشهادات معتمدة لكل دورة تكملها
            </div>
          </div>
          <button className="btn-gold text-sm py-2 px-4 mr-auto flex-shrink-0">
            اعرف المزيد
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
