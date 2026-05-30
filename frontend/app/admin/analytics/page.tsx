'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, BookOpen, TrendingUp, Award, BarChart3, GraduationCap, Activity, School } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-analytics'],
    queryFn: () => adminAPI.getDashboard().then(r => r.data),
  })

  const stats = data || {}
  const totalStudents: number = stats.total_students || 0
  const activeSections: number = stats.active_sections || 0
  const totalFaculty: number = stats.total_faculty || 0
  const gradeDistribution: Record<string, number> = stats.grade_distribution || { A: 0, B: 0, C: 0, D: 0, F: 0 }
  const enrollmentTrend: Record<string, unknown>[] = stats.enrollment_trend || []
  const topCourses: Record<string, unknown>[] = stats.top_courses || []
  const recentActivities: Record<string, unknown>[] = stats.recent_activities || []

  const maxEnrollment = Math.max(...enrollmentTrend.map(e => Number(e.count) || 0), 1)
  const maxTopCourse = Math.max(...topCourses.map(c => Number(c.enrollments) || 0), 1)
  const totalGrades = Object.values(gradeDistribution).reduce((a, b) => a + b, 0) || 1

  const GRADE_COLORS: Record<string, string> = {
    A: 'bg-uni-green',
    B: 'bg-uni-blue',
    C: 'bg-uni-gold',
    D: 'bg-orange-500',
    F: 'bg-uni-red',
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-6xl">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 glass rounded-2xl shimmer" />)}
          </div>
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 glass rounded-2xl shimmer" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text">لوحة التحليلات</h1>
          <p className="text-uni-muted text-sm mt-1">إحصاءات شاملة عن أداء الجامعة</p>
        </div>

        {/* Stats KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الطلاب', value: totalStudents, icon: Users, color: 'text-uni-blue', bg: 'bg-uni-blue/10 border-uni-blue/20' },
            { label: 'الشعب النشطة', value: activeSections, icon: BookOpen, color: 'text-uni-gold', bg: 'bg-uni-gold/10 border-uni-gold/20' },
            { label: 'أعضاء هيئة التدريس', value: totalFaculty, icon: School, color: 'text-uni-green', bg: 'bg-uni-green/10 border-uni-green/20' },
            { label: 'متوسط التسجيل', value: activeSections > 0 ? Math.round(totalStudents / activeSections) : 0, icon: GraduationCap, color: 'text-uni-muted', bg: 'bg-uni-card border-uni-border/20' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card-uni ${stat.bg}`}
            >
              <div className="flex items-center gap-3">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                <div>
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value.toLocaleString('ar-SA')}</div>
                  <div className="text-xs text-uni-muted">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Enrollment Trend Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-uni">
            <h3 className="font-bold text-uni-text flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-uni-gold" /> اتجاه التسجيل
            </h3>
            {enrollmentTrend.length > 0 ? (
              <div className="flex items-end gap-2 h-40">
                {enrollmentTrend.map((e, i) => {
                  const h = Math.round((Number(e.count) / maxEnrollment) * 100)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-uni-muted font-bold">{Number(e.count)}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-uni-gold to-amber-400 min-h-[4px]"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[10px] text-uni-muted truncate w-full text-center">{e.month as string}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map((m, i) => {
                  const mockH = [40, 60, 75, 55, 80, 65][i]
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${mockH}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="w-full rounded-t-lg bg-uni-border/30"
                        style={{ height: `${mockH}%` }}
                      />
                      <span className="text-[10px] text-uni-muted">{m.slice(0,3)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Grade Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-uni">
            <h3 className="font-bold text-uni-text flex items-center gap-2 mb-6">
              <Award className="w-4 h-4 text-uni-blue" /> توزيع الدرجات
            </h3>
            <div className="space-y-3">
              {Object.entries(gradeDistribution).map(([grade, count]) => {
                const pct = Math.round((count / totalGrades) * 100)
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-uni-text w-4">{grade}</span>
                    <div className="flex-1 h-6 bg-uni-card rounded-lg overflow-hidden border border-uni-border/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className={`h-full ${GRADE_COLORS[grade] || 'bg-uni-muted'} rounded-lg flex items-center justify-end px-2`}
                      >
                        {pct > 10 && <span className="text-xs font-bold text-white">{pct}%</span>}
                      </motion.div>
                    </div>
                    <span className="text-xs text-uni-muted w-8 text-left">{count}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Courses */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-uni">
            <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-uni-green" /> أكثر المواد تسجيلاً
            </h3>
            {topCourses.length > 0 ? (
              <div className="space-y-3">
                {topCourses.slice(0, 6).map((course, i) => {
                  const pct = Math.round((Number(course.enrollments) / maxTopCourse) * 100)
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-uni-text font-medium truncate flex-1 ml-2">{course.name as string || course.name_ar as string}</span>
                        <span className="text-uni-muted flex-shrink-0">{Number(course.enrollments)} طالب</span>
                      </div>
                      <div className="h-2 bg-uni-card rounded-full overflow-hidden border border-uni-border/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="h-full bg-gradient-to-l from-uni-green to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-uni-muted text-sm text-center py-6">لا توجد بيانات تسجيل بعد</p>
            )}
          </motion.div>

          {/* Recent Activities */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-uni">
            <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-uni-gold" /> آخر النشاطات
            </h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.slice(0, 8).map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-uni-border/20 last:border-0">
                    <span className="text-lg flex-shrink-0">{activity.icon as string || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-uni-text truncate">{activity.title as string || activity.description as string}</div>
                      <div className="text-xs text-uni-muted mt-0.5">{activity.time as string || activity.created_at as string || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-uni-muted text-sm text-center py-6">لا توجد نشاطات حديثة</p>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
