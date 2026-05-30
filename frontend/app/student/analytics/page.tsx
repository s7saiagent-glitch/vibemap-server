'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, Award, BookOpen, Target, BarChart3, Star, CheckCircle, Clock
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

const STANDING_COLORS: Record<string, string> = {
  excellent: 'text-uni-green border-uni-green/30 bg-uni-green/10',
  good: 'text-uni-blue border-uni-blue/30 bg-uni-blue/10',
  warning: 'text-uni-gold border-uni-gold/30 bg-uni-gold/10',
  probation: 'text-uni-red border-uni-red/30 bg-uni-red/10',
}

const STANDING_LABELS: Record<string, string> = {
  excellent: 'ممتاز',
  good: 'جيد',
  warning: 'تحذير',
  probation: 'قيد المراقبة',
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22c55e', 'A': '#22c55e', 'A-': '#4ade80',
  'B+': '#3b82f6', 'B': '#3b82f6', 'B-': '#60a5fa',
  'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#fbbf24',
  'D': '#f97316', 'F': '#ef4444', '—': '#6b7280',
}

export default function StudentAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-analytics'],
    queryFn: () => studentAPI.getAnalytics().then(r => r.data),
  })

  const gpa = parseFloat(data?.gpa || '0')
  const creditsEarned = data?.total_credits_earned || 0
  const creditsTotal = 132
  const creditsPercent = Math.min(100, (creditsEarned / creditsTotal) * 100)
  const standing = data?.academic_standing || 'good'
  const courseGrades: Record<string, unknown>[] = data?.course_grades || []
  const trend: Record<string, unknown>[] = data?.performance_trend || []

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-5xl">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl shimmer" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text">التحليلات الأكاديمية</h1>
          <p className="text-uni-muted text-sm mt-1">متابعة أدائك وتقدمك الأكاديمي</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* GPA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center col-span-2 md:col-span-1">
            <Star className="w-6 h-6 text-uni-gold mx-auto mb-2" />
            <div className="text-4xl font-black text-gold-gradient">{gpa.toFixed(2)}</div>
            <div className="text-xs text-uni-muted mt-1">المعدل التراكمي</div>
            <div className="text-xs text-uni-muted">من 4.00</div>
          </motion.div>

          {/* Credits */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni text-center">
            <BookOpen className="w-6 h-6 text-uni-blue mx-auto mb-2" />
            <div className="text-3xl font-black text-uni-text">{creditsEarned}</div>
            <div className="text-xs text-uni-muted mt-1">ساعة معتمدة</div>
            <div className="text-xs text-uni-muted">من {creditsTotal}</div>
          </motion.div>

          {/* Current courses */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-uni text-center">
            <Clock className="w-6 h-6 text-uni-green mx-auto mb-2" />
            <div className="text-3xl font-black text-uni-text">{data?.current_courses || 0}</div>
            <div className="text-xs text-uni-muted mt-1">مادة حالية</div>
          </motion.div>

          {/* Standing */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-uni text-center">
            <Award className="w-6 h-6 text-uni-gold mx-auto mb-2" />
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border mt-1 ${STANDING_COLORS[standing] || STANDING_COLORS.good}`}>
              {STANDING_LABELS[standing] || standing}
            </div>
            <div className="text-xs text-uni-muted mt-1">الوضع الأكاديمي</div>
          </motion.div>
        </div>

        {/* Credits progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-uni">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-uni-text flex items-center gap-2">
              <Target className="w-4 h-4 text-uni-gold" /> تقدم الساعات نحو التخرج
            </h3>
            <span className="text-sm text-uni-muted">{creditsEarned} / {creditsTotal} ساعة</span>
          </div>
          <div className="h-4 bg-uni-card rounded-full overflow-hidden border border-uni-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${creditsPercent}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-gradient-to-l from-uni-gold to-amber-500 rounded-full"
            />
          </div>
          <div className="flex justify-between text-xs text-uni-muted mt-2">
            <span>مكتمل {creditsPercent.toFixed(0)}%</span>
            <span>{data?.credits_to_graduate || 0} ساعة متبقية</span>
          </div>
        </motion.div>

        {/* Performance trend */}
        {trend.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-uni">
            <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-uni-blue" /> منحنى الأداء في الاختبارات
            </h3>
            <div className="flex items-end gap-2 h-28 overflow-x-auto pb-2">
              {trend.map((t, i) => {
                const score = t.score as number
                const pct = Math.max(5, score)
                const color = score >= 90 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 60 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 36 }}>
                    <div className="text-xs text-uni-muted">{score.toFixed(0)}%</div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="w-7 rounded-t-lg"
                      style={{ backgroundColor: color, maxHeight: '80px', minHeight: '4px' }}
                    />
                    <div className="text-xs font-bold" style={{ color }}>{t.label as string}</div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Course grades table */}
        {courseGrades.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-uni">
            <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-uni-gold" /> درجات المواد
            </h3>
            <div className="space-y-3">
              {courseGrades.map((c, i) => {
                const grade = c.grade as number
                const pct = Math.min(100, grade)
                const letterGrade = c.letter_grade as string
                const gradeColor = GRADE_COLORS[letterGrade] || '#6b7280'
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border"
                          style={{ color: gradeColor, borderColor: gradeColor + '40', backgroundColor: gradeColor + '15' }}>
                          {letterGrade}
                        </span>
                        <div>
                          <div className="text-sm text-uni-text font-medium">{c.course_name as string}</div>
                          <div className="text-xs text-uni-muted">{c.credits as number} ساعات · {c.semester as string}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: gradeColor }}>{grade > 0 ? `${grade.toFixed(0)}%` : '—'}</div>
                    </div>
                    {grade > 0 && (
                      <div className="h-1.5 bg-uni-card rounded-full overflow-hidden mr-10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.05, duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: gradeColor }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {courseGrades.length === 0 && trend.length === 0 && (
          <div className="card-uni text-center py-12">
            <BarChart3 className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لا توجد بيانات أكاديمية بعد</p>
            <p className="text-xs text-uni-muted mt-1">ستظهر درجاتك هنا بعد إكمال اختباراتك</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
