'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, BookOpen, Brain, BarChart3, TrendingUp,
  GraduationCap, Zap, Award, PlusCircle, FileDown, Settings
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const CHART_COLORS = ['#D4AF37', '#00D4FF', '#8B5CF6', '#10B981', '#EF4444']

const ENROLLMENT_DATA = [
  { name: 'CS', count: 420 }, { name: 'SE', count: 380 }, { name: 'AI', count: 290 },
  { name: 'BA', count: 350 }, { name: 'ACC', count: 280 }, { name: 'MKT', count: 240 },
]

const GRADE_DIST = [
  { name: 'A', value: 30 }, { name: 'B', value: 35 }, { name: 'C', value: 20 },
  { name: 'D', value: 10 }, { name: 'F', value: 5 },
]

function StatCard({ value, label, icon: Icon, color = 'gold', change }: {
  value: string | number; label: string; icon: React.ElementType
  color?: string; change?: string
}) {
  const colorMap: Record<string, string> = {
    gold: 'text-uni-gold bg-uni-gold/10 border-uni-gold/20',
    blue: 'text-uni-blue bg-uni-blue/10 border-uni-blue/20',
    green: 'text-uni-green bg-uni-green/10 border-uni-green/20',
    purple: 'text-uni-purple bg-uni-purple/10 border-uni-purple/20',
    orange: 'text-uni-orange bg-uni-orange/10 border-uni-orange/20',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-uni glass-hover"
    >
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${colorMap[color] || colorMap.gold}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={`text-3xl font-black mb-1 ${colorMap[color]?.split(' ')[0] || 'text-uni-gold'}`}>{value}</div>
      <div className="text-uni-muted text-sm">{label}</div>
      {change && <div className="text-xs text-uni-green mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />{change}</div>}
    </motion.div>
  )
}

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then(r => r.data),
  })

  const stats = dashboard?.stats || {}

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">لوحة إدارة الجامعة</h1>
            <p className="text-uni-muted text-sm">إدارة شاملة لجامعة مملكة الأرض الافتراضية</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost-gold px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
              <FileDown className="w-4 h-4" /> تصدير تقرير
            </button>
            <button className="btn-gold px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> إضافة مادة
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard value={stats.total_students || 0} label="إجمالي الطلاب" icon={Users} color="blue" change="+12% هذا الشهر" />
          <StatCard value={stats.active_sections || 0} label="شعب نشطة" icon={BookOpen} color="gold" />
          <StatCard value={stats.total_enrollments || 0} label="تسجيل نشط" icon={GraduationCap} color="green" />
          <StatCard value={stats.ai_interactions || 0} label="تفاعل AI" icon={Brain} color="purple" change="اليوم" />
          <StatCard value={stats.total_programs || 0} label="البرامج" icon={Award} color="orange" />
          <StatCard value={stats.ai_professors || 0} label="أساتذة AI" icon={Zap} color="blue" />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Enrollment Chart */}
          <div className="lg:col-span-3 card-uni">
            <h2 className="text-lg font-bold text-uni-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-uni-gold" />
              التسجيل حسب التخصص
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ENROLLMENT_DATA}>
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, color: '#E2E8F0' }}
                  cursor={{ fill: 'rgba(212,175,55,0.05)' }}
                />
                <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grade Distribution */}
          <div className="lg:col-span-2 card-uni">
            <h2 className="text-lg font-bold text-uni-text mb-4">توزيع الدرجات</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={GRADE_DIST} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                  {GRADE_DIST.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-uni">
          <h2 className="text-lg font-bold text-uni-text mb-4">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'إدارة الطلاب', desc: 'عرض وإدارة ملفات الطلاب', href: '/admin/students', color: 'blue' },
              { icon: Brain, label: 'إنشاء أستاذ AI', desc: 'إضافة أستاذ ذكي لمادة جديدة', href: '/admin/ai-professors', color: 'purple' },
              { icon: BookOpen, label: 'إضافة مادة', desc: 'إنشاء مادة دراسية جديدة', href: '/admin/courses', color: 'gold' },
              { icon: BarChart3, label: 'التقارير', desc: 'تحليلات أكاديمية مفصلة', href: '/admin/analytics', color: 'green' },
            ].map((action, i) => (
              <motion.a
                key={i}
                href={action.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl border border-uni-border/30 hover:border-uni-gold/30 transition-all glass-hover group"
              >
                <action.icon className={`w-6 h-6 mb-2 ${
                  action.color === 'blue' ? 'text-uni-blue' :
                  action.color === 'purple' ? 'text-uni-purple' :
                  action.color === 'green' ? 'text-uni-green' : 'text-uni-gold'
                }`} />
                <div className="text-sm font-semibold text-uni-text group-hover:text-uni-gold transition-colors">{action.label}</div>
                <div className="text-xs text-uni-muted mt-0.5">{action.desc}</div>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Recent Students */}
        {dashboard?.recent_students?.length > 0 && (
          <div className="card-uni">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-uni-text">آخر الطلاب المسجلين</h2>
              <a href="/admin/students" className="text-uni-gold text-sm hover:text-uni-gold-light">عرض الكل</a>
            </div>
            <div className="space-y-3">
              {dashboard.recent_students.map((student: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-uni-border/20 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-uni-gold">{(student.name as string).charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-uni-text truncate">{student.name as string}</div>
                    <div className="text-xs text-uni-muted">{student.email as string}</div>
                  </div>
                  <div className="text-xs text-uni-subtle">{new Date(student.created_at as string).toLocaleDateString('ar')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
