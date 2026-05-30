'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { BookOpen, Brain, Clock, Award, ChevronLeft, Play } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

export default function MyCoursesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  const courses = data?.courses || []

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">موادي الدراسية</h1>
            <p className="text-uni-muted text-sm mt-1">جميع المواد المسجلة في فصلك الحالي</p>
          </div>
          <div className="badge-gold text-sm px-4 py-2">{courses.length} مادة</div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 glass rounded-2xl shimmer" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="card-uni text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
            <h3 className="text-xl font-bold text-uni-text mb-2">لم تسجل في أي مادة بعد</h3>
            <p className="text-uni-muted text-sm mb-6">ابدأ بتسجيل المواد لتبدأ رحلتك الأكاديمية</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course: Record<string, unknown>, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-uni hover:border-uni-gold/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-uni-blue" />
                  </div>
                  <span className={`badge-gold text-xs ${
                    course.status === 'enrolled' ? 'text-uni-green border-uni-green/40 bg-uni-green/10' :
                    course.status === 'completed' ? 'text-uni-gold' : 'text-uni-muted'
                  }`}>
                    {course.status === 'enrolled' ? 'مسجل' : course.status === 'completed' ? 'مكتمل' : course.status as string}
                  </span>
                </div>

                <h3 className="font-bold text-uni-text mb-1 leading-snug">{course.course_name as string}</h3>
                <p className="text-uni-muted text-xs font-mono mb-3">{course.course_code as string}</p>

                <div className="flex items-center gap-3 text-xs text-uni-muted mb-4">
                  <span className="flex items-center gap-1"><Award className="w-3 h-3" />{course.credits as number} ساعات</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.semester as string}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-uni-muted border-t border-uni-border/30 pt-3">
                  <Brain className="w-3 h-3 text-uni-gold" />
                  <span className="truncate">{course.professor_name as string}</span>
                </div>

                {!!(course.section_id as number) && (
                  <Link
                    href={`/student/ai-professor/${course.section_id}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-uni-gold/10 border border-uni-gold/20 text-uni-gold text-xs font-semibold hover:bg-uni-gold/20 transition-all"
                  >
                    <Play className="w-3 h-3" />
                    ابدأ مع الأستاذ الذكي
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
