'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, AlertTriangle, Calendar, BarChart3 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { attendanceAPI, studentAPI } from '@/lib/api'
import { useT } from '@/lib/i18n'

export default function AttendancePage() {
  const { t, lang } = useT()
  const [selectedSection, setSelectedSection] = useState<number | undefined>()

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    present: { label: t.attendance.present, color: 'text-uni-green', icon: CheckCircle },
    absent: { label: t.attendance.absent, color: 'text-uni-red', icon: XCircle },
    late: { label: t.attendance.late, color: 'text-uni-gold', icon: Clock },
    excused: { label: t.attendance.excused, color: 'text-uni-blue', icon: CheckCircle },
  }

  const { data: coursesData } = useQuery({
    queryKey: ['my-courses-att'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  const { data: attData, isLoading } = useQuery({
    queryKey: ['my-attendance', selectedSection],
    queryFn: () => attendanceAPI.getMyAttendance(selectedSection).then(r => r.data),
  })

  const enrollments: Record<string, unknown>[] = coursesData?.enrollments || coursesData || []
  const records: Record<string, unknown>[] = attData?.records || []
  const stats = attData?.stats || { total: 0, present: 0, absent: 0, late: 0, attendance_percentage: 100, at_risk: false }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <Calendar className="w-6 h-6 text-uni-gold" /> {t.attendance.title}
          </h1>
          <p className="text-uni-muted text-sm mt-1">تتبع حضورك في المواد الدراسية</p>
        </div>

        {/* Section filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-uni-muted">{t.attendance.selectCourse}:</label>
          <select value={selectedSection || ''} onChange={e => setSelectedSection(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-uni-card border border-uni-border/30 rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
            <option value="">{t.attendance.allCourses}</option>
            {enrollments.map((e: Record<string, unknown>, i: number) => (
              <option key={i} value={Number(e.section_id || e.id)}>{String(e.course_name_ar || e.course_name || `مادة ${i + 1}`)}</option>
            ))}
          </select>
        </div>

        {/* At risk warning */}
        {stats.at_risk && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="card-uni border-uni-red/30 bg-uni-red/5 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-uni-red flex-shrink-0" />
            <div>
              <div className="font-bold text-uni-red text-sm">{t.attendance.warningThreshold}</div>
              <p className="text-xs text-uni-muted mt-0.5">نسبة حضورك {stats.attendance_percentage}% — الحد الأدنى المطلوب 75%</p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t.attendance.attendanceRate, value: `${stats.attendance_percentage}%`, color: stats.at_risk ? 'text-uni-red' : 'text-uni-green', icon: BarChart3 },
            { label: t.attendance.present, value: stats.present, color: 'text-uni-green', icon: CheckCircle },
            { label: t.attendance.absent, value: stats.absent, color: 'text-uni-red', icon: XCircle },
            { label: t.attendance.late, value: stats.late, color: 'text-uni-gold', icon: Clock },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-uni text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-uni-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Attendance bar */}
        <div className="card-uni">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-uni-text">{t.attendance.attendanceRate}</span>
            <span className={`text-sm font-bold ${stats.at_risk ? 'text-uni-red' : 'text-uni-green'}`}>{stats.attendance_percentage}%</span>
          </div>
          <div className="h-3 bg-uni-card rounded-full overflow-hidden border border-uni-border/20">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.attendance_percentage}%` }} transition={{ duration: 1 }}
              className={`h-full rounded-full ${stats.attendance_percentage >= 90 ? 'bg-uni-green' : stats.attendance_percentage >= 75 ? 'bg-uni-gold' : 'bg-uni-red'}`} />
          </div>
          <div className="flex justify-between text-xs text-uni-muted mt-1">
            <span>0%</span>
            <span className="text-uni-red">الحد الأدنى 75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Records */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 glass rounded-xl shimmer" />)}</div>
        ) : records.length === 0 ? (
          <div className="card-uni text-center py-10">
            <Calendar className="w-10 h-10 text-uni-muted mx-auto mb-2" />
            <p className="text-uni-muted text-sm">لا توجد سجلات حضور بعد</p>
            <p className="text-xs text-uni-muted mt-1">ستظهر هنا سجلات حضورك بعد بدء الفصل الدراسي</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-bold text-uni-text text-sm">{t.attendance.attendedSessions}</h3>
            {records.map((r, i) => {
              const statusKey = String(r.status || 'present')
              const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.present
              const Icon = sc.icon
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/20">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${sc.color}`} />
                  <div className="flex-1">
                    <span className={`text-xs font-bold ${sc.color}`}>{sc.label}</span>
                    {!!(r.notes) && <span className="text-xs text-uni-muted mr-2">{r.notes as string}</span>}
                  </div>
                  <span className="text-xs text-uni-muted">{r.date ? new Date(r.date as string).toLocaleDateString('ar-SA') : ''}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
