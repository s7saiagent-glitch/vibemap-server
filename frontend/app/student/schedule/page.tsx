'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WORK_DAYS = [0, 1, 2, 3, 4] // Sun-Thu

const COLORS = [
  'border-uni-gold/40 bg-uni-gold/5 text-uni-gold',
  'border-uni-blue/40 bg-uni-blue/5 text-uni-blue',
  'border-uni-green/40 bg-uni-green/5 text-uni-green',
  'border-purple-500/40 bg-purple-500/5 text-purple-400',
  'border-pink-500/40 bg-pink-500/5 text-pink-400',
]

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8) // 8 AM - 5 PM

interface ScheduleSlot {
  day: number
  startHour: number
  endHour: number
  courseName: string
  location: string
  colorIdx: number
}

export default function SchedulePage() {
  const today = new Date()
  const [weekOffset, setWeekOffset] = useState(0)

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['my-courses-schedule'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  const enrollments: Record<string, unknown>[] = coursesData?.enrollments || coursesData || []

  // Build schedule slots from enrollment data
  // Parse schedule strings like "الأحد 10:00-12:00" or day+time fields
  const scheduleSlots: ScheduleSlot[] = []

  enrollments.forEach((e, idx) => {
    const schedule = String(e.schedule || e.meeting_time || '')
    const location = String(e.location || e.room || e.classroom || 'القاعة ' + (idx + 1))
    const courseName = String(e.course_name_ar || e.course_name || 'مادة ' + (idx + 1))

    // Try to parse "Day HH:MM-HH:MM" format
    let parsed = false
    for (let d = 0; d < DAYS_AR.length; d++) {
      if (schedule.includes(DAYS_AR[d]) || schedule.toLowerCase().includes(DAYS_EN[d].toLowerCase())) {
        const timeMatch = schedule.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
        if (timeMatch) {
          scheduleSlots.push({
            day: d, startHour: parseInt(timeMatch[1]), endHour: parseInt(timeMatch[3]),
            courseName, location, colorIdx: idx % COLORS.length,
          })
          parsed = true
        }
      }
    }

    // Fallback: distribute courses evenly across weekdays
    if (!parsed && enrollments.length <= 5) {
      const fallbackDay = WORK_DAYS[idx % WORK_DAYS.length]
      const startHour = 8 + (idx * 2)
      scheduleSlots.push({
        day: fallbackDay, startHour: Math.min(startHour, 16), endHour: Math.min(startHour + 2, 18),
        courseName, location, colorIdx: idx % COLORS.length,
      })
    }
  })

  // Get week start date
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (weekOffset * 7))

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-5xl">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl shimmer" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
              <Calendar className="w-6 h-6 text-uni-gold" /> الجدول الدراسي
            </h1>
            <p className="text-uni-muted text-sm mt-1">جدولك الأسبوعي للمواد الدراسية</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg border border-uni-border/30 hover:border-uni-gold/30 flex items-center justify-center text-uni-muted hover:text-uni-gold transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm text-uni-muted px-2">
              {weekOffset === 0 ? 'هذا الأسبوع' : weekOffset === -1 ? 'الأسبوع الماضي' : weekOffset === 1 ? 'الأسبوع القادم' : `أسبوع ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg border border-uni-border/30 hover:border-uni-gold/30 flex items-center justify-center text-uni-muted hover:text-uni-gold transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="text-xs px-3 py-1.5 rounded-lg border border-uni-gold/30 text-uni-gold hover:bg-uni-gold/5 transition-all">
              اليوم
            </button>
          </div>
        </div>

        {/* Schedule grid */}
        <div className="card-uni overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header row */}
            <div className="grid grid-cols-6 gap-0 border-b border-uni-border/30">
              <div className="p-3 text-xs text-uni-muted font-medium">الوقت</div>
              {WORK_DAYS.map(d => {
                const date = new Date(weekStart)
                date.setDate(weekStart.getDate() + d)
                const isToday = date.toDateString() === today.toDateString()
                return (
                  <div key={d} className={`p-3 text-center ${isToday ? 'bg-uni-gold/5' : ''}`}>
                    <div className={`text-xs font-bold ${isToday ? 'text-uni-gold' : 'text-uni-text'}`}>{DAYS_AR[d]}</div>
                    <div className={`text-xs mt-0.5 ${isToday ? 'text-uni-gold' : 'text-uni-muted'}`}>{date.getDate()}/{date.getMonth() + 1}</div>
                  </div>
                )
              })}
            </div>

            {/* Time rows */}
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-6 gap-0 border-b border-uni-border/10">
                <div className="p-3 text-xs text-uni-muted border-l border-uni-border/20">
                  {hour}:00
                </div>
                {WORK_DAYS.map(d => {
                  const slot = scheduleSlots.find(s => s.day === d && s.startHour === hour)
                  const isToday = (() => {
                    const date = new Date(weekStart)
                    date.setDate(weekStart.getDate() + d)
                    return date.toDateString() === today.toDateString()
                  })()
                  return (
                    <div key={d} className={`min-h-[52px] p-1 relative ${isToday ? 'bg-uni-gold/3' : ''}`}>
                      {slot && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-lg border p-2 h-full ${COLORS[slot.colorIdx]}`}
                          style={{ minHeight: `${(slot.endHour - slot.startHour) * 52}px` }}
                        >
                          <div className="text-xs font-bold leading-tight truncate">{slot.courseName}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="text-[10px] truncate">{slot.startHour}:00-{slot.endHour}:00</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="text-[10px] truncate">{slot.location}</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Course legend */}
        {enrollments.length > 0 && (
          <div className="card-uni">
            <h3 className="font-bold text-uni-text flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-uni-gold" /> المواد المسجلة ({enrollments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {enrollments.map((e, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${COLORS[i % COLORS.length]}`}>
                  <div className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
                  {String(e.course_name_ar || e.course_name || `مادة ${i + 1}`)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
