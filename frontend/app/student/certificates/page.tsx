'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, Download, GraduationCap, Star, CheckCircle, Clock } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function CertificatesPage() {
  const { user } = useAuthStore()
  const [generating, setGenerating] = useState<number | null>(null)

  const { data: coursesData } = useQuery({
    queryKey: ['my-courses-certs'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  const { data: transcriptData } = useQuery({
    queryKey: ['transcript-certs'],
    queryFn: () => studentAPI.getTranscript().then(r => r.data),
  })

  const enrollments: Record<string, unknown>[] = coursesData?.enrollments || coursesData || []
  const transcript: Record<string, unknown>[] = transcriptData?.transcript || transcriptData || []

  // Courses with grade >= 60 (passed)
  const passedCourses = transcript.filter(t => {
    const grade = Number(t.grade_points) || 0
    const letter = String(t.letter_grade || '')
    return grade >= 1.0 || ['A', 'B', 'C', 'A+', 'B+', 'C+', 'A-', 'B-', 'C-'].some(g => letter.startsWith(g))
  })

  const totalCredits = passedCourses.reduce((sum, t) => sum + (Number(t.credit_hours) || 3), 0)
  const gpa = passedCourses.length > 0
    ? passedCourses.reduce((sum, t) => sum + (Number(t.grade_points) || 0), 0) / passedCourses.length
    : 0

  const canGetDegree = totalCredits >= 120

  const generateCertificate = (courseId: number, courseName: string) => {
    setGenerating(courseId)
    setTimeout(() => {
      // Create a simple printable certificate
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      const name = user?.first_name_ar || user?.first_name || 'الطالب'
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>شهادة إتمام - ${courseName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    body { font-family: 'Amiri', serif; margin: 0; padding: 40px; background: #fff; color: #1a1a1a; }
    .cert { border: 8px double #b8860b; padding: 60px; text-align: center; min-height: 600px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .title { font-size: 36px; color: #b8860b; font-weight: 700; margin-bottom: 20px; }
    .subtitle { font-size: 18px; color: #666; margin-bottom: 40px; }
    .name { font-size: 28px; font-weight: 700; color: #1a1a1a; border-bottom: 2px solid #b8860b; padding-bottom: 10px; margin: 20px 0; }
    .course { font-size: 22px; color: #2563eb; margin: 20px 0; }
    .footer { margin-top: 60px; font-size: 14px; color: #999; }
    .logo { font-size: 48px; margin-bottom: 20px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="cert">
    <div class="logo">🎓</div>
    <div class="title">شهادة إتمام مادة دراسية</div>
    <div class="subtitle">جامعة مملكة الأرض الافتراضية</div>
    <p>يشهد بأن الطالب/ة</p>
    <div class="name">${name}</div>
    <p>قد أتم/أتمت بنجاح دراسة مادة</p>
    <div class="course">${courseName}</div>
    <p>وحصل/حصلت على الدرجة المطلوبة للاجتياز</p>
    <div class="footer">
      تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}
      &nbsp;|&nbsp; رقم الشهادة: UNI-${Date.now().toString(36).toUpperCase()}
    </div>
  </div>
</body>
</html>`
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { printWindow.print(); }, 500)
      setGenerating(null)
    }, 1000)
  }

  // Suppress unused variable warning
  void enrollments

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <Award className="w-6 h-6 text-uni-gold" /> شهاداتي
          </h1>
          <p className="text-uni-muted text-sm mt-1">شهادات إتمام المواد الدراسية</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center">
            <CheckCircle className="w-6 h-6 text-uni-green mx-auto mb-2" />
            <div className="text-2xl font-black text-uni-green">{passedCourses.length}</div>
            <div className="text-xs text-uni-muted">مادة مجتازة</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-uni text-center">
            <Star className="w-6 h-6 text-uni-gold mx-auto mb-2" />
            <div className="text-2xl font-black text-gold-gradient">{gpa.toFixed(2)}</div>
            <div className="text-xs text-uni-muted">المعدل التراكمي</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni text-center">
            <GraduationCap className="w-6 h-6 text-uni-blue mx-auto mb-2" />
            <div className="text-2xl font-black text-uni-blue">{totalCredits}</div>
            <div className="text-xs text-uni-muted">ساعة معتمدة</div>
          </motion.div>
        </div>

        {/* Degree eligibility */}
        {canGetDegree && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-uni border-uni-gold/30 bg-uni-gold/5 flex items-center gap-4"
          >
            <GraduationCap className="w-10 h-10 text-uni-gold flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-uni-text">مؤهل للتخرج! 🎉</div>
              <div className="text-sm text-uni-muted mt-0.5">أتممت {totalCredits} ساعة معتمدة — يمكنك التقدم لشهادة التخرج</div>
            </div>
            <button
              onClick={() => generateCertificate(0, 'شهادة التخرج')}
              className="btn-gold px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> طباعة شهادة التخرج
            </button>
          </motion.div>
        )}

        {/* Course certificates */}
        {passedCourses.length === 0 ? (
          <div className="card-uni text-center py-12">
            <Clock className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لم تُتم أي مادة دراسية بعد</p>
            <p className="text-xs text-uni-muted mt-1">أتم موادك الدراسية لتحصل على شهاداتك</p>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-bold text-uni-muted mb-3 uppercase tracking-wide">شهادات المواد المجتازة ({passedCourses.length})</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {passedCourses.map((course, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-uni hover:border-uni-gold/30 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-uni-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-uni-text text-sm truncate">
                      {course.course_name_ar as string || course.course_name as string || `مادة ${i + 1}`}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-gold text-xs">{course.letter_grade as string || 'اجتياز'}</span>
                      <span className="text-xs text-uni-muted">{course.credit_hours as number || 3} ساعات</span>
                    </div>
                  </div>
                  <button
                    onClick={() => generateCertificate(Number(course.course_id) || i, course.course_name_ar as string || course.course_name as string || `مادة ${i + 1}`)}
                    disabled={generating === (Number(course.course_id) || i)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs btn-gold disabled:opacity-50"
                  >
                    {generating === (Number(course.course_id) || i) ? (
                      <span>جاري...</span>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> طباعة</>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
