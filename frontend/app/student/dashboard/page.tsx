'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Brain, BookOpen, Award, Clock, TrendingUp, AlertCircle,
  ChevronLeft, Sparkles, Target, BarChart3, Star
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useT } from '@/lib/i18n'

const GPA_CHART_DATA = [
  { sem: 'F22', gpa: 2.8 }, { sem: 'S23', gpa: 3.1 }, { sem: 'F23', gpa: 3.3 },
  { sem: 'S24', gpa: 3.5 }, { sem: 'F24', gpa: 3.7 }, { sem: 'S25', gpa: 3.85 },
]

function StatCard({ value, label, icon: Icon, color = 'gold', trend }: {
  value: string | number
  label: string
  icon: React.ElementType
  color?: 'gold' | 'blue' | 'green' | 'purple'
  trend?: string
}) {
  const colors = {
    gold: { bg: 'bg-uni-gold/10', border: 'border-uni-gold/20', text: 'text-uni-gold', icon: 'text-uni-gold' },
    blue: { bg: 'bg-uni-blue/10', border: 'border-uni-blue/20', text: 'text-uni-blue', icon: 'text-uni-blue' },
    green: { bg: 'bg-uni-green/10', border: 'border-uni-green/20', text: 'text-uni-green', icon: 'text-uni-green' },
    purple: { bg: 'bg-uni-purple/10', border: 'border-uni-purple/20', text: 'text-uni-purple', icon: 'text-uni-purple' },
  }
  const c = colors[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-uni ${c.bg} ${c.border} border`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className={`text-3xl font-black ${c.text} mb-1`}>{value}</div>
      <div className="text-uni-muted text-sm">{label}</div>
      {trend && <div className="text-xs text-uni-green mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />{trend}</div>}
    </motion.div>
  )
}

export default function StudentDashboard() {
  const { t } = useT()
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => studentAPI.getDashboard().then(r => r.data),
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-24 glass rounded-2xl shimmer" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl shimmer" />)}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const student = dashboard?.student || {}

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-uni border-uni-gold/20 bg-gradient-to-l from-uni-gold/5 to-transparent"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-uni-gold" />
                <span className="text-uni-gold font-semibold">{t.student.welcome}</span>
              </div>
              <h1 className="text-2xl font-black text-uni-text">{student.name || 'الطالب'}</h1>
              <p className="text-uni-muted text-sm mt-1">
                {t.student.studentId}: <span className="text-uni-gold font-mono">{student.student_id || 'STU-0000'}</span>
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-gold-gradient">{student.gpa || '0.00'}</div>
              <div className="text-xs text-uni-muted">{t.student.cumulativeGpa} / 4.0</div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value={dashboard?.current_courses_count || 0} label={t.student.currentCourses} icon={BookOpen} color="blue" />
          <StatCard value={student.credits_earned || 0} label={t.student.creditsEarned} icon={Award} color="gold" trend={t.student.thisTermCredits} />
          <StatCard value={dashboard?.upcoming_assessments_count || 0} label={t.student.upcomingAssessments} icon={Clock} color="purple" />
          <StatCard value={student.academic_standing === 'good' ? t.student.standingGood : student.academic_standing || t.student.standingGood} label={t.student.academicStanding} icon={Target} color="green" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Assessments */}
          <div className="lg:col-span-2 card-uni">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-uni-text flex items-center gap-2">
                <Clock className="w-5 h-5 text-uni-gold" />
                {t.student.upcomingAssessments}
              </h2>
              <Link href="/student/assessments" className="text-uni-gold text-sm hover:text-uni-gold-light flex items-center gap-1">
                {t.common.viewAll} <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>

            {dashboard?.upcoming_assessments?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.upcoming_assessments.map((a: Record<string, unknown>, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30 hover:border-uni-gold/20 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-uni-purple/20 border border-uni-purple/30 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-uni-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-uni-text truncate">{a.title as string}</div>
                      <div className="text-xs text-uni-muted">{a.duration_minutes as number} {t.common.minutes}</div>
                    </div>
                    <span className={`badge-gold text-xs flex-shrink-0 ${
                      a.type === 'final' ? 'text-uni-red border-uni-red/40 bg-uni-red/10' :
                      a.type === 'midterm' ? 'text-uni-orange border-uni-orange/40 bg-uni-orange/10' : ''
                    }`}>
                      {a.type === 'quiz' ? t.student.quiz : a.type === 'midterm' ? t.student.midterm : a.type === 'final' ? t.student.final : a.type as string}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-uni-muted">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t.student.noUpcomingAssessments}</p>
              </div>
            )}
          </div>

          {/* Sidebar: GPA Chart + AI Recommendations */}
          <div className="space-y-4">
            {/* GPA Chart */}
            <div className="card-uni">
              <h3 className="text-sm font-bold text-uni-text mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-uni-gold" />
                {t.student.gpaProgress}
              </h3>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={GPA_CHART_DATA}>
                  <XAxis dataKey="sem" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, color: '#E2E8F0' }}
                  />
                  <Line type="monotone" dataKey="gpa" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* AI Recommendations */}
            <div className="card-uni">
              <h3 className="text-sm font-bold text-uni-text mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-uni-blue" />
                {t.student.aiRecommendations}
              </h3>
              {dashboard?.ai_recommendations?.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.ai_recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-uni-muted">
                      <Star className="w-3 h-3 text-uni-gold mt-0.5 flex-shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-uni-muted">{t.student.aiRecommendationsDesc}</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Grades */}
        {dashboard?.recent_grades?.length > 0 && (
          <div className="card-uni">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-uni-text flex items-center gap-2">
                <Award className="w-5 h-5 text-uni-gold" />
                {t.student.recentGrades}
              </h2>
              <Link href="/student/grades" className="text-uni-gold text-sm flex items-center gap-1">
                {t.student.gradeSheet} <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-uni-muted border-b border-uni-border/30">
                    <th className="text-right pb-2 font-medium">{t.student.course}</th>
                    <th className="text-right pb-2 font-medium">{t.student.courseCode}</th>
                    <th className="text-center pb-2 font-medium">{t.common.grade}</th>
                    <th className="text-center pb-2 font-medium">{t.student.letterGrade}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recent_grades.map((g: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-b border-uni-border/20 hover:bg-uni-border/10 transition-colors">
                      <td className="py-2.5 text-uni-text font-medium">{g.course_name as string}</td>
                      <td className="py-2.5 text-uni-muted font-mono text-xs">{g.course_code as string}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-uni-gold font-bold">{g.grade as number}%</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`badge-gold ${
                          (g.letter_grade as string)?.startsWith('A') ? 'text-uni-green border-uni-green/40 bg-uni-green/10' :
                          (g.letter_grade as string)?.startsWith('F') ? 'text-uni-red border-uni-red/40 bg-uni-red/10' : ''
                        }`}>
                          {g.letter_grade as string}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
