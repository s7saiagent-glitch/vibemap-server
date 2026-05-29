'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Users, BookOpen, Brain, TrendingUp, Award, MessageSquare, GraduationCap } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then(r => r.data),
  })

  const stats = [
    { label: 'إجمالي الطلاب', value: data?.total_students || 0, icon: Users, color: 'text-uni-blue', bg: 'bg-uni-blue/10', border: 'border-uni-blue/20' },
    { label: 'المواد الدراسية', value: data?.total_courses || 0, icon: BookOpen, color: 'text-uni-gold', bg: 'bg-uni-gold/10', border: 'border-uni-gold/20' },
    { label: 'أساتذة AI', value: data?.total_ai_professors || 0, icon: Brain, color: 'text-uni-purple', bg: 'bg-uni-purple/10', border: 'border-uni-purple/20' },
    { label: 'المحادثات', value: data?.total_conversations || 0, icon: MessageSquare, color: 'text-uni-green', bg: 'bg-uni-green/10', border: 'border-uni-green/20' },
    { label: 'الكليات', value: data?.total_faculties || 0, icon: GraduationCap, color: 'text-uni-gold', bg: 'bg-uni-gold/10', border: 'border-uni-gold/20' },
    { label: 'التسجيلات', value: data?.total_enrollments || 0, icon: TrendingUp, color: 'text-uni-red', bg: 'bg-uni-red/10', border: 'border-uni-red/20' },
    { label: 'المعدل التراكمي المتوسط', value: data?.avg_gpa ? Number(data.avg_gpa).toFixed(2) : '—', icon: Award, color: 'text-uni-green', bg: 'bg-uni-green/10', border: 'border-uni-green/20' },
    { label: 'الاختبارات', value: data?.total_assessments || 0, icon: BarChart3, color: 'text-uni-blue', bg: 'bg-uni-blue/10', border: 'border-uni-blue/20' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text">التحليلات والإحصائيات</h1>
          <p className="text-uni-muted text-sm mt-1">نظرة شاملة على أداء الجامعة</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 glass rounded-2xl shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`card-uni ${stat.bg} border ${stat.border} text-center`}>
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-uni-muted text-xs">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Recent students */}
        {data?.recent_students && data.recent_students.length > 0 && (
          <div className="card-uni">
            <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-uni-gold" /> أحدث الطلاب المسجلين
            </h3>
            <div className="space-y-3">
              {data.recent_students.map((student: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-uni-border/10 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-uni-gold">
                      {((student.first_name_ar || student.first_name || '?') as string).charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-uni-text text-sm">
                      {student.first_name_ar as string} {student.last_name_ar as string}
                    </div>
                    <div className="text-xs text-uni-muted">{student.email as string}</div>
                  </div>
                  <div className="text-xs text-uni-muted">
                    {student.created_at ? new Date(student.created_at as string).toLocaleDateString('ar-SA') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
