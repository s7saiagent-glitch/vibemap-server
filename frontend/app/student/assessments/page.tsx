'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle, AlertCircle, BookOpen, Calendar } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

export default function AssessmentsPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => studentAPI.getDashboard().then(r => r.data),
  })

  const assessments = dashboard?.upcoming_assessments || []

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text">الاختبارات والواجبات</h1>
          <p className="text-uni-muted text-sm mt-1">جميع اختباراتك وواجباتك القادمة</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl shimmer" />)}</div>
        ) : assessments.length === 0 ? (
          <div className="card-uni text-center py-16">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-uni-green opacity-50" />
            <h3 className="text-xl font-bold text-uni-text mb-2">لا توجد اختبارات قادمة</h3>
            <p className="text-uni-muted text-sm">أحسنت! ليس لديك اختبارات في الوقت الحالي</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a: Record<string, unknown>, i: number) => {
              const typeColors: Record<string, string> = {
                quiz: 'text-uni-blue border-uni-blue/40 bg-uni-blue/10',
                midterm: 'text-uni-gold border-uni-gold/40 bg-uni-gold/10',
                final: 'text-uni-red border-uni-red/40 bg-uni-red/10',
                assignment: 'text-uni-green border-uni-green/40 bg-uni-green/10',
              }
              const typeLabel: Record<string, string> = {
                quiz: 'اختبار قصير', midterm: 'منتصف الفصل',
                final: 'اختبار نهائي', assignment: 'واجب',
              }
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="card-uni flex items-center gap-4 hover:border-uni-gold/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-uni-purple/20 border border-uni-purple/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-uni-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-uni-text truncate">{a.title as string}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-uni-muted">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.duration_minutes as number} دقيقة</span>
                      {a.end_datetime && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.end_datetime as string).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`badge-gold text-xs flex-shrink-0 ${typeColors[a.type as string] || 'text-uni-muted'}`}>
                    {typeLabel[a.type as string] || a.type as string}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Info Card */}
        <div className="card-uni border-uni-blue/20 bg-uni-blue/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-uni-blue flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-uni-text mb-1">كيف تعمل الاختبارات؟</h4>
              <p className="text-uni-muted text-sm">
                يقوم الأستاذ الذكي بإنشاء اختبارات تلقائية مخصصة بناءً على مستوى أدائك.
                يمكنك التحدث مع الأستاذ في أي وقت لطلب اختبار تجريبي.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
