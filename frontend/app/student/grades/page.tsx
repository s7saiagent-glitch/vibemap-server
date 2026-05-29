'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, TrendingUp, BookOpen, Star, BarChart3 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

function GradeLabel({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    'A+': 'text-uni-green border-uni-green/40 bg-uni-green/10',
    'A': 'text-uni-green border-uni-green/40 bg-uni-green/10',
    'A-': 'text-uni-green border-uni-green/40 bg-uni-green/10',
    'B+': 'text-uni-blue border-uni-blue/40 bg-uni-blue/10',
    'B': 'text-uni-blue border-uni-blue/40 bg-uni-blue/10',
    'B-': 'text-uni-blue border-uni-blue/40 bg-uni-blue/10',
    'C+': 'text-uni-gold border-uni-gold/40 bg-uni-gold/10',
    'C': 'text-uni-gold border-uni-gold/40 bg-uni-gold/10',
    'F': 'text-uni-red border-uni-red/40 bg-uni-red/10',
  }
  return (
    <span className={`badge-gold text-xs font-bold ${colors[grade] || 'text-uni-muted'}`}>{grade}</span>
  )
}

export default function GradesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['transcript'],
    queryFn: () => studentAPI.getTranscript().then(r => r.data),
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text">درجاتي ومعدلي</h1>
          <p className="text-uni-muted text-sm mt-1">سجلك الأكاديمي الكامل</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 glass rounded-2xl shimmer" />)}</div>
        ) : (
          <>
            {/* GPA Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'المعدل التراكمي', value: data?.cumulative_gpa || '0.00', icon: Star, color: 'text-uni-gold' },
                { label: 'الساعات المكتسبة', value: data?.total_credits_earned || 0, icon: Award, color: 'text-uni-blue' },
                { label: 'الوضع الأكاديمي', value: 'جيد', icon: TrendingUp, color: 'text-uni-green' },
                { label: 'الرقم الجامعي', value: data?.student_id || '-', icon: BookOpen, color: 'text-uni-purple' },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="card-uni text-center">
                  <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color}`} />
                  <div className={`text-2xl font-black ${item.color} mb-1`}>{item.value}</div>
                  <div className="text-uni-muted text-xs">{item.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Semesters */}
            {data?.semesters?.length === 0 ? (
              <div className="card-uni text-center py-16">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
                <h3 className="text-xl font-bold text-uni-text mb-2">لا توجد درجات بعد</h3>
                <p className="text-uni-muted text-sm">ستظهر درجاتك هنا بعد إتمام المواد</p>
              </div>
            ) : (
              data?.semesters?.map((sem: Record<string, unknown>, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="card-uni">
                  <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-uni-gold" />
                    {sem.academic_year as string} — {sem.semester === 'fall' ? 'الفصل الأول' : sem.semester === 'spring' ? 'الفصل الثاني' : sem.semester as string}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-uni-muted border-b border-uni-border/30">
                          <th className="text-right pb-2 font-medium">المادة</th>
                          <th className="text-center pb-2 font-medium">الساعات</th>
                          <th className="text-center pb-2 font-medium">الدرجة</th>
                          <th className="text-center pb-2 font-medium">التقدير</th>
                          <th className="text-center pb-2 font-medium">النقاط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sem.courses as Record<string, unknown>[])?.map((c, j) => (
                          <tr key={j} className="border-b border-uni-border/20 hover:bg-uni-border/10 transition-colors">
                            <td className="py-2.5">
                              <div className="font-medium text-uni-text">{c.name as string}</div>
                              <div className="text-xs text-uni-muted font-mono">{c.code as string}</div>
                            </td>
                            <td className="py-2.5 text-center text-uni-muted">{c.credits as number}</td>
                            <td className="py-2.5 text-center font-bold text-uni-gold">{c.grade as number}%</td>
                            <td className="py-2.5 text-center"><GradeLabel grade={c.letter_grade as string} /></td>
                            <td className="py-2.5 text-center text-uni-muted">{c.gpa_points as number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ))
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
