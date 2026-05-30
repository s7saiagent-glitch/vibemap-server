'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { BookOpen, Brain, Clock, Award, Play, ChevronLeft, Loader2, CheckCircle, Lock, Star, FileText, Users, MessageSquare } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI, academicAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const LEVEL_COLORS = [
  'from-blue-600/20 to-cyan-600/20 border-blue-500/30 text-blue-400',
  'from-violet-600/20 to-purple-600/20 border-violet-500/30 text-violet-400',
  'from-amber-600/20 to-yellow-600/20 border-amber-500/30 text-amber-400',
  'from-green-600/20 to-emerald-600/20 border-green-500/30 text-green-400',
]

export default function MyCoursesPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'enrolled' | 'browse'>('enrolled')
  const [selectedCourse, setSelectedCourse] = useState<Record<string, unknown> | null>(null)

  const { data: myCoursesData, isLoading: myLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  const { data: programCoursesData, isLoading: programLoading } = useQuery({
    queryKey: ['program-courses', user?.program_id],
    queryFn: () => user?.program_id
      ? academicAPI.getProgramDetail(user.program_id).then(r => r.data)
      : Promise.resolve(null),
    enabled: !!user?.program_id,
  })

  const enrollMutation = useMutation({
    mutationFn: (sectionId: number) => studentAPI.enroll(sectionId),
    onSuccess: () => {
      toast.success('تم التسجيل في المادة بنجاح!')
      queryClient.invalidateQueries({ queryKey: ['my-courses'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'فشل التسجيل'
      toast.error(msg)
    },
  })

  const courses = myCoursesData?.courses || []
  const enrolledSectionIds = new Set(courses.map((c: Record<string, unknown>) => c.section_id as number))

  const coursesByLevel = programCoursesData?.courses_by_level || {}

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-uni-text">موادي الدراسية</h1>
            <p className="text-uni-muted text-sm mt-1">
              {user?.program_name ? `تخصص: ${user.program_name}` : 'جميع مواد فصلك الحالي'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="badge-gold text-sm px-4 py-2">{courses.length} مادة مسجلة</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-uni-border/30 pb-0">
          {[
            { key: 'enrolled', label: 'موادي المسجلة', count: courses.length },
            { key: 'browse', label: 'استعراض البرنامج', count: null },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'enrolled' | 'browse')}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-uni-gold text-uni-gold'
                  : 'border-transparent text-uni-muted hover:text-uni-text'
              }`}
            >
              {t.label}
              {t.count !== null && <span className="mr-1.5 text-xs opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── ENROLLED TAB ─────────────────────────────────────────── */}
          {tab === 'enrolled' && (
            <motion.div key="enrolled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {myLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-52 glass rounded-2xl shimmer" />)}
                </div>
              ) : courses.length === 0 ? (
                <div className="card-uni text-center py-16">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
                  <h3 className="text-xl font-bold text-uni-text mb-2">لم تسجل في أي مادة بعد</h3>
                  <p className="text-uni-muted text-sm mb-6">
                    {user?.program_id
                      ? 'اضغط على "استعراض البرنامج" لتسجيل مواد الفصل الأول'
                      : 'تواصل مع الإدارة لتحديد تخصصك الأكاديمي'}
                  </p>
                  {user?.program_id && (
                    <button onClick={() => setTab('browse')} className="btn-gold px-6 py-2.5 rounded-xl font-bold text-uni-dark">
                      استعراض المواد وتسجيلها
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course: Record<string, unknown>, i: number) => (
                    <motion.div
                      key={course.enrollment_id as number}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card-uni hover:border-uni-gold/30 transition-all group flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-uni-blue" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                          course.status === 'enrolled'
                            ? 'bg-uni-green/10 text-uni-green border-uni-green/30'
                            : course.status === 'completed'
                            ? 'bg-uni-gold/10 text-uni-gold border-uni-gold/30'
                            : 'bg-uni-border/30 text-uni-muted border-uni-border/30'
                        }`}>
                          {course.status === 'enrolled' ? '✓ مسجل' : course.status === 'completed' ? '★ مكتمل' : course.status as string}
                        </span>
                      </div>

                      <h3 className="font-bold text-uni-text mb-1 leading-snug">{course.course_name as string}</h3>
                      <p className="text-uni-muted text-xs font-mono mb-3">{course.course_code as string}</p>

                      <div className="flex items-center gap-3 text-xs text-uni-muted mb-3">
                        <span className="flex items-center gap-1"><Award className="w-3 h-3" />{course.credits as number} ساعات</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.semester === 'fall' ? 'خريف' : course.semester === 'spring' ? 'ربيع' : 'صيف'}</span>
                        <span className="text-xs">{course.academic_year as string}</span>
                      </div>

                      {course.total_grade !== null && course.total_grade !== undefined && (
                        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-uni-gold/5 border border-uni-gold/10">
                          <Star className="w-3.5 h-3.5 text-uni-gold" />
                          <span className="text-xs text-uni-text font-bold">{course.letter_grade as string}</span>
                          <span className="text-xs text-uni-muted">({course.total_grade as number}%)</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-uni-muted border-t border-uni-border/30 pt-3 mb-3 mt-auto">
                        <Brain className="w-3 h-3 text-uni-gold flex-shrink-0" />
                        <span className="truncate">{course.professor_name as string}</span>
                      </div>

                      <div className="flex gap-2">
                        {!!(course.section_id as number) && (
                          <Link
                            href={`/student/ai-professor/${course.section_id}`}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-uni-gold text-uni-dark text-xs font-bold hover:bg-uni-gold-light transition-all"
                          >
                            <Play className="w-3 h-3" /> ابدأ الدراسة
                          </Link>
                        )}
                        {!!(course.section_id as number) && (
                          <Link
                            href={`/student/forum/${course.section_id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-uni-muted border border-uni-border/30 hover:border-uni-gold/20 hover:text-uni-text transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> المنتدى
                          </Link>
                        )}
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="px-3 py-2 rounded-xl border border-uni-border/40 text-uni-muted hover:text-uni-text hover:border-uni-border text-xs transition-all"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── BROWSE TAB ──────────────────────────────────────────── */}
          {tab === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {!user?.program_id ? (
                <div className="card-uni text-center py-12">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-uni-muted opacity-30" />
                  <p className="text-uni-muted">يرجى تحديد التخصص من ملفك الشخصي أولاً</p>
                </div>
              ) : programLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl shimmer" />)}</div>
              ) : (
                <>
                  <div className="card-uni bg-gradient-to-r from-uni-gold/5 to-transparent border-uni-gold/20">
                    <h2 className="font-bold text-uni-text mb-1">{programCoursesData?.name_ar || user.program_name}</h2>
                    <p className="text-uni-muted text-sm">{programCoursesData?.total_courses || 0} مادة · {programCoursesData?.total_credits_required || 0} ساعة معتمدة · {programCoursesData?.duration_years || 4} سنوات</p>
                  </div>

                  {Object.entries(coursesByLevel).map(([level, levelCourses]: [string, unknown]) => {
                    const lvlIndex = parseInt(level) - 1
                    const colorClass = LEVEL_COLORS[lvlIndex % LEVEL_COLORS.length]
                    const [fromTo, , borderClass, textClass] = colorClass.split(' ')
                    return (
                      <div key={level} className={`rounded-2xl border bg-gradient-to-r ${fromTo} ${LEVEL_COLORS[lvlIndex % LEVEL_COLORS.length].split(' ').slice(1).join(' ').split(' ')[0]} p-4`}>
                        <h3 className={`font-bold mb-3 flex items-center gap-2 ${LEVEL_COLORS[lvlIndex % LEVEL_COLORS.length].split(' ').slice(-1)[0]}`}>
                          <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-xs font-black">{level}</span>
                          مواد المستوى {level}
                          <span className="text-xs text-uni-muted font-normal">({(levelCourses as unknown[]).length} مواد)</span>
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {(levelCourses as Record<string, unknown>[]).map((course: Record<string, unknown>) => {
                            const isEnrolled = enrolledSectionIds.has(course.section_id as number)
                            return (
                              <div key={course.id as number} className="bg-uni-dark/60 rounded-xl p-3 border border-uni-border/20 flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-uni-text text-sm truncate">{course.name_ar as string || course.name as string}</div>
                                  <div className="text-xs text-uni-muted mt-0.5">{course.code as string} · {course.credits as number} ساعات</div>
                                  {!!(course.description_ar) && (
                                    <div className="text-xs text-uni-muted mt-1 line-clamp-2">{course.description_ar as string}</div>
                                  )}
                                </div>
                                {level === '1' && (
                                  isEnrolled ? (
                                    <span className="flex items-center gap-1 text-xs text-uni-green font-medium flex-shrink-0 mt-0.5">
                                      <CheckCircle className="w-3.5 h-3.5" /> مسجل
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (course.section_id) {
                                          enrollMutation.mutate(course.section_id as number)
                                        } else {
                                          toast.error('لا يوجد فصل دراسي متاح لهذه المادة حالياً')
                                        }
                                      }}
                                      disabled={enrollMutation.isPending}
                                      className="flex-shrink-0 mt-0.5 px-2 py-1 rounded-lg bg-uni-gold/10 border border-uni-gold/30 text-uni-gold text-xs font-medium hover:bg-uni-gold/20 transition-all disabled:opacity-50"
                                    >
                                      {enrollMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'سجّل'}
                                    </button>
                                  )
                                )}
                                {level !== '1' && (
                                  <span className="flex items-center gap-1 text-xs text-uni-muted flex-shrink-0 mt-0.5">
                                    <Lock className="w-3 h-3" /> مستقبلي
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {Object.keys(coursesByLevel).length === 0 && (
                    <div className="card-uni text-center py-12">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-uni-muted opacity-30" />
                      <p className="text-uni-muted text-sm">لا توجد مواد مضافة لهذا البرنامج بعد</p>
                      <p className="text-uni-muted text-xs mt-1">ستظهر المواد بعد تهيئة قاعدة البيانات</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Course Detail Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedCourse(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-uni-card border border-uni-border rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-black text-uni-text mb-1">{selectedCourse.course_name as string}</h2>
              <p className="text-xs text-uni-muted font-mono mb-4">{selectedCourse.course_code as string}</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-uni-muted">الساعات المعتمدة</span><span className="text-uni-text font-bold">{selectedCourse.credits as number}</span></div>
                <div className="flex justify-between"><span className="text-uni-muted">الفصل الدراسي</span><span className="text-uni-text">{selectedCourse.semester as string} {selectedCourse.academic_year as string}</span></div>
                <div className="flex justify-between"><span className="text-uni-muted">الأستاذ</span><span className="text-uni-text truncate max-w-32">{selectedCourse.professor_name as string}</span></div>
                {selectedCourse.total_grade !== null && selectedCourse.total_grade !== undefined && (
                  <div className="flex justify-between"><span className="text-uni-muted">الدرجة</span><span className="text-uni-gold font-bold">{selectedCourse.letter_grade as string} ({selectedCourse.total_grade as number}%)</span></div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setSelectedCourse(null)} className="flex-1 py-2 rounded-xl border border-uni-border/40 text-uni-muted text-sm hover:text-uni-text transition-all">إغلاق</button>
                {!!(selectedCourse.section_id) && (
                  <Link href={`/student/ai-professor/${selectedCourse.section_id}`} className="flex-1 py-2 rounded-xl bg-uni-gold text-uni-dark text-sm font-bold text-center hover:bg-uni-gold-light transition-all">
                    ابدأ الدراسة
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
