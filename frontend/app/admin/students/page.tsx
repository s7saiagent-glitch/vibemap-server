'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Search, GraduationCap, Mail, Calendar, Shield } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

export default function AdminStudentsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-students', page, search],
    queryFn: () => adminAPI.getStudents({ page, search: search || undefined, per_page: 20 }).then(r => r.data),
  })

  const students = data?.students || []
  const total = data?.total || 0

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">إدارة الطلاب</h1>
            <p className="text-uni-muted text-sm mt-1">جميع الطلاب المسجلين في الجامعة</p>
          </div>
          <div className="badge-gold text-sm px-4 py-2">{total} طالب</div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="ابحث بالاسم أو البريد..."
            className="w-full bg-uni-card border border-uni-border rounded-xl pr-10 pl-4 py-3 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 glass rounded-2xl shimmer" />)}
          </div>
        ) : students.length === 0 ? (
          <div className="card-uni text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
            <h3 className="text-xl font-bold text-uni-text mb-2">لا يوجد طلاب</h3>
            <p className="text-uni-muted text-sm">لم يتم العثور على طلاب مطابقين للبحث</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student: Record<string, unknown>, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-uni flex items-center gap-4 hover:border-uni-gold/30 transition-all"
              >
                <div className="w-11 h-11 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-uni-gold">
                    {((student.first_name_ar || student.first_name || '?') as string).charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-uni-text">
                    {student.first_name_ar as string} {student.last_name_ar as string}
                    {student.first_name && <span className="text-uni-muted text-xs mr-2">({student.first_name as string} {student.last_name as string})</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-uni-muted mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email as string}</span>
                    {student.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(student.created_at as string).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge-gold text-xs ${
                    student.is_active ? 'text-uni-green border-uni-green/40 bg-uni-green/10' : 'text-uni-red border-uni-red/40 bg-uni-red/10'
                  }`}>
                    {student.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                  <span className="badge-gold text-xs">
                    <Shield className="w-3 h-3 inline ml-1" />
                    {student.role as string}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-uni-border text-uni-muted text-sm hover:border-uni-gold/30 disabled:opacity-40 transition-all"
            >
              السابق
            </button>
            <span className="text-uni-muted text-sm">صفحة {page} من {Math.ceil(total / 20)}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 rounded-xl border border-uni-border text-uni-muted text-sm hover:border-uni-gold/30 disabled:opacity-40 transition-all"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
