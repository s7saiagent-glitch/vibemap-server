'use client'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Clock, Target, Award, ChevronRight, FileText, User, Calendar } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI, academicAPI } from '@/lib/api'

export default function SyllabusPage() {
  const params = useParams()
  const router = useRouter()
  const sectionId = parseInt(params.sectionId as string)

  const { data: materialsData, isLoading } = useQuery({
    queryKey: ['syllabus-materials', sectionId],
    queryFn: () => studentAPI.getSectionMaterials(sectionId).then(r => r.data),
  })

  const { data: coursesData } = useQuery({
    queryKey: ['my-courses-syllabus'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  // Suppress unused import warning for academicAPI — available for future use
  void academicAPI

  const enrollments: Record<string, unknown>[] = coursesData?.enrollments || coursesData?.courses || coursesData || []
  const currentSection = enrollments.find((e: Record<string, unknown>) =>
    Number(e.section_id) === sectionId || Number(e.id) === sectionId
  )
  const materials: Record<string, unknown>[] = materialsData || []

  const MATERIAL_ICONS: Record<string, string> = {
    pdf: '📄', video: '🎬', link: '🔗', note: '📝', presentation: '📊',
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-4xl">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 glass rounded-2xl shimmer" />)}
        </div>
      </DashboardLayout>
    )
  }

  const courseName = currentSection?.course_name_ar as string || currentSection?.course_name as string || 'المادة الدراسية'
  const courseCode = currentSection?.course_code as string || ''
  const instructor = currentSection?.instructor_name as string || currentSection?.professor_name as string || 'الأستاذ'
  const creditHours = Number(currentSection?.credit_hours) || 3
  const semester = currentSection?.semester as string || currentSection?.term as string || 'الفصل الدراسي الحالي'

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-uni-muted hover:text-uni-gold text-sm mb-3 transition-colors"
          >
            <ChevronRight className="w-4 h-4" /> العودة للمواد
          </button>
          <h1 className="text-2xl font-black text-uni-text">{courseName}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-uni-muted">
            {courseCode && <span className="badge-blue">{courseCode}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {creditHours} ساعات</span>
          </div>
        </div>

        {/* Course Info */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: User, label: 'المدرس', value: instructor },
            { icon: Calendar, label: 'الفصل الدراسي', value: String(semester) },
            { icon: Award, label: 'الساعات المعتمدة', value: `${creditHours} ساعات` },
          ].map((info, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-uni flex items-center gap-3"
            >
              <info.icon className="w-5 h-5 text-uni-gold flex-shrink-0" />
              <div>
                <div className="text-xs text-uni-muted">{info.label}</div>
                <div className="text-sm font-medium text-uni-text">{info.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Course Objectives */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card-uni">
          <h2 className="font-bold text-uni-text flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-uni-gold" /> أهداف المقرر
          </h2>
          <div className="space-y-2 text-sm text-uni-muted">
            {[
              'اكتساب المعرفة النظرية والعملية في مجال المادة',
              'تطبيق المفاهيم المكتسبة في مشاريع واقعية',
              'تنمية مهارات التفكير النقدي وحل المشكلات',
              'التعاون مع الزملاء في المشاريع الجماعية',
            ].map((obj, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-uni-gold mt-0.5">{i + 1}</div>
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Grading Policy */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-uni">
          <h2 className="font-bold text-uni-text flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-uni-blue" /> سياسة التقييم
          </h2>
          <div className="space-y-3">
            {[
              { name: 'الاختبارات الفصلية', weight: 40, color: 'bg-uni-blue' },
              { name: 'الاختبار النهائي', weight: 30, color: 'bg-uni-gold' },
              { name: 'الواجبات والمشاريع', weight: 20, color: 'bg-uni-green' },
              { name: 'المشاركة والحضور', weight: 10, color: 'bg-uni-muted/50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-uni-text w-44 flex-shrink-0">{item.name}</span>
                <div className="flex-1 h-3 bg-uni-card rounded-full overflow-hidden border border-uni-border/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.weight}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className={`h-full ${item.color} rounded-full`}
                  />
                </div>
                <span className="text-sm font-bold text-uni-text w-8 text-left">{item.weight}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Study Materials */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card-uni">
          <h2 className="font-bold text-uni-text flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-uni-green" /> المصادر والمراجع
          </h2>
          {materials.length > 0 ? (
            <div className="space-y-3">
              {materials.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30 hover:border-uni-gold/20 transition-all">
                  <span className="text-xl">{MATERIAL_ICONS[m.material_type as string] || '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-uni-text">{m.title as string}</div>
                    {!!(m.description) && <p className="text-xs text-uni-muted mt-0.5">{m.description as string}</p>}
                  </div>
                  {!!(m.file_url) && (
                    <a href={m.file_url as string} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-uni-blue hover:underline flex-shrink-0">
                      فتح ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-uni-muted mx-auto mb-2" />
              <p className="text-uni-muted text-sm">لم تُضف مصادر بعد</p>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
