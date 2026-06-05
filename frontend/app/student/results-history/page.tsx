'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Clock, Award, TrendingUp } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useT } from '@/lib/i18n'
import { studentAPI } from '@/lib/api'

export default function ResultsHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => studentAPI.getMySubmissions().then(r => r.data),
  })

  const submissions: Record<string, unknown>[] = Array.isArray(data) ? data : []

  const avgPct = submissions.length > 0
    ? Math.round(submissions.reduce((s, x) => s + (Number(x.percentage) || 0), 0) / submissions.length)
    : 0
  const passed = submissions.filter(s => s.passed).length

  const TYPE_LABELS: Record<string, string> = {
    quiz: 'اختبار قصير', midterm: 'منتصف الفصل', final: 'نهائي', assignment: 'واجب', project: 'مشروع',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <FileText className="w-6 h-6 text-uni-gold" /> سجل نتائجي
          </h1>
          <p className="text-uni-muted text-sm mt-1">جميع نتائجك في الاختبارات والواجبات</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center">
            <Award className="w-6 h-6 text-uni-gold mx-auto mb-2" />
            <div className="text-2xl font-black text-gold-gradient">{submissions.length}</div>
            <div className="text-xs text-uni-muted">اختبار مؤدى</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-uni text-center">
            <TrendingUp className="w-6 h-6 text-uni-blue mx-auto mb-2" />
            <div className="text-2xl font-black text-uni-blue">{avgPct}%</div>
            <div className="text-xs text-uni-muted">متوسط الدرجات</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni text-center">
            <CheckCircle className="w-6 h-6 text-uni-green mx-auto mb-2" />
            <div className="text-2xl font-black text-uni-green">{passed}</div>
            <div className="text-xs text-uni-muted">اختبار مجتاز</div>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl shimmer" />)}</div>
        ) : submissions.length === 0 ? (
          <div className="card-uni text-center py-12">
            <FileText className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لم تؤدِّ أي اختبار بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s, i) => {
              const pct = Number(s.percentage) || 0
              const isPassed = s.passed as boolean
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`card-uni border-r-4 transition-all ${isPassed ? 'border-r-uni-green' : 'border-r-uni-red'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg ${isPassed ? 'bg-uni-green/10 border border-uni-green/30 text-uni-green' : 'bg-uni-red/10 border border-uni-red/30 text-uni-red'}`}>
                      {Math.round(pct)}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-uni-text text-sm truncate">{s.assessment_title as string}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge-blue text-xs">{TYPE_LABELS[s.assessment_type as string] || String(s.assessment_type)}</span>
                        <span className="text-xs text-uni-muted">{s.letter_grade as string}</span>
                        {!!(s.time_spent_minutes) && <span className="flex items-center gap-1 text-xs text-uni-muted"><Clock className="w-3 h-3" />{s.time_spent_minutes as number} د</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {isPassed ? <CheckCircle className="w-5 h-5 text-uni-green" /> : <XCircle className="w-5 h-5 text-uni-red" />}
                      <div className="text-xs text-uni-muted mt-1">{s.submitted_at ? new Date(s.submitted_at as string).toLocaleDateString('ar-SA') : ''}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-uni-card rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.04 }}
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-uni-green' : pct >= 60 ? 'bg-uni-gold' : 'bg-uni-red'}`} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
