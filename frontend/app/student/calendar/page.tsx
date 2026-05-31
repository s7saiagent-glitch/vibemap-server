'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, BookOpen, AlertTriangle } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { academicAPI } from '@/lib/api'

export default function AcademicCalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['academic-calendar'],
    queryFn: () => academicAPI.getCalendar().then(r => r.data),
  })

  const SEMESTER_EVENTS = [
    { icon: '📚', type: 'semester_start', label: 'بداية الفصل الدراسي', color: 'text-uni-green', bg: 'bg-uni-green/10 border-uni-green/20' },
    { icon: '📝', type: 'midterm_start', label: 'بداية اختبارات منتصف الفصل', color: 'text-uni-gold', bg: 'bg-uni-gold/10 border-uni-gold/20' },
    { icon: '🎯', type: 'final_start', label: 'بداية الاختبارات النهائية', color: 'text-uni-red', bg: 'bg-uni-red/10 border-uni-red/20' },
    { icon: '🏖️', type: 'break_start', label: 'بداية الإجازة', color: 'text-uni-blue', bg: 'bg-uni-blue/10 border-uni-blue/20' },
    { icon: '🎓', type: 'graduation', label: 'يوم التخرج', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ]

  const events = data ? [
    data.semester_start && { type: 'semester_start', date: data.semester_start, label: 'بداية الفصل الدراسي' },
    data.midterm_start && { type: 'midterm_start', date: data.midterm_start, label: 'بداية اختبارات منتصف الفصل' },
    data.midterm_end && { type: 'midterm_start', date: data.midterm_end, label: 'نهاية اختبارات منتصف الفصل' },
    data.final_exam_start && { type: 'final_start', date: data.final_exam_start, label: 'بداية الاختبارات النهائية' },
    data.final_exam_end && { type: 'final_start', date: data.final_exam_end, label: 'نهاية الاختبارات النهائية' },
    data.semester_end && { type: 'break_start', date: data.semester_end, label: 'نهاية الفصل الدراسي' },
  ].filter(Boolean) : []

  const today = new Date()

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <Calendar className="w-6 h-6 text-uni-gold" /> التقويم الأكاديمي
          </h1>
          <p className="text-uni-muted text-sm mt-1">جدول الفصل الدراسي الحالي والمواعيد المهمة</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl shimmer" />)}</div>
        ) : !data ? (
          <div className="card-uni text-center py-12">
            <Calendar className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لم يُضف التقويم الأكاديمي بعد</p>
            <p className="text-xs text-uni-muted mt-1">تواصل مع الإدارة لإضافة مواعيد الفصل الدراسي</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current semester info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20 bg-uni-gold/5">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-uni-gold flex-shrink-0" />
                <div>
                  <div className="font-bold text-uni-text">{String(data.name || data.semester || 'الفصل الدراسي الحالي')}</div>
                  <div className="text-xs text-uni-muted mt-0.5">
                    {data.academic_year ? `العام الأكاديمي ${data.academic_year}` : ''}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Events timeline */}
            <div className="relative">
              <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-uni-border/30" />
              <div className="space-y-4">
                {events.map((event, i) => {
                  if (!event) return null
                  const evtConfig = SEMESTER_EVENTS.find(e => e.type === event.type) || SEMESTER_EVENTS[0]
                  const evtDate = new Date(event.date as string)
                  const isPast = evtDate < today
                  const isUpcoming = !isPast && (evtDate.getTime() - today.getTime()) < 7 * 24 * 3600000
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-4 pr-8 relative">
                      <div className={`absolute right-3 w-4 h-4 rounded-full border-2 ${isPast ? 'border-uni-muted bg-uni-border' : 'border-uni-gold bg-uni-gold/20'} flex-shrink-0`} />
                      <div className={`flex-1 card-uni ${evtConfig.bg} ${isPast ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{evtConfig.icon}</span>
                            <span className={`text-sm font-medium ${isPast ? 'text-uni-muted' : 'text-uni-text'}`}>{event.label as string}</span>
                          </div>
                          <div className="text-left">
                            <div className="text-xs text-uni-muted">{evtDate.toLocaleDateString('ar-SA')}</div>
                            {isUpcoming && <span className="text-[10px] text-uni-gold border border-uni-gold/30 rounded px-1">قريباً</span>}
                            {isPast && <span className="text-[10px] text-uni-muted">انتهى</span>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Important notes */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card-uni">
              <h3 className="font-bold text-uni-text flex items-center gap-2 mb-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-uni-gold" /> تنبيهات مهمة
              </h3>
              <ul className="space-y-2 text-xs text-uni-muted">
                <li className="flex items-start gap-2"><span className="text-uni-gold mt-0.5">•</span> الحضور بنسبة أقل من 75% يُعرّضك للحرمان من الاختبار النهائي</li>
                <li className="flex items-start gap-2"><span className="text-uni-gold mt-0.5">•</span> يجب تسليم الواجبات قبل الموعد المحدد بيوم على الأقل</li>
                <li className="flex items-start gap-2"><span className="text-uni-gold mt-0.5">•</span> تقديم التظلمات يجب أن يتم خلال أسبوعين من إعلان النتائج</li>
              </ul>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
