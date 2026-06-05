'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, GraduationCap, Mail, Calendar, Shield, Pencil, X, Check } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'
import { useT } from '@/lib/i18n'

type Student = Record<string, unknown>

const ACADEMIC_STANDING_OPTIONS = [
  { value: 'good', label: 'جيد' },
  { value: 'warning', label: 'تحذير' },
  { value: 'probation', label: 'إنذار' },
]

const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'مسجل' },
  { value: 'suspended', label: 'موقوف' },
  { value: 'graduated', label: 'خريج' },
]

function EditRow({ student, onSave, onCancel }: { student: Student; onSave: (data: Record<string, unknown>) => void; onCancel: () => void }) {
  const [isActive, setIsActive] = useState(!!student.is_active)
  const [academicStanding, setAcademicStanding] = useState((student.academic_standing as string) || 'good')
  const [enrollmentStatus, setEnrollmentStatus] = useState((student.enrollment_status as string) || 'active')

  return (
    <div className="card-uni border-uni-gold/40 bg-uni-gold/5 flex flex-wrap items-center gap-3 py-3">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-uni-text text-sm">
          {student.first_name_ar as string} {student.last_name_ar as string}
        </div>
        <div className="text-xs text-uni-muted">{student.email as string}</div>
      </div>

      {/* is_active toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-uni-muted">نشط</span>
        <button
          onClick={() => setIsActive(v => !v)}
          className={`w-10 h-5 rounded-full transition-colors relative ${isActive ? 'bg-uni-green' : 'bg-uni-border'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-0.5' : 'translate-x-5'}`} />
        </button>
      </div>

      {/* academic_standing */}
      <select
        value={academicStanding}
        onChange={e => setAcademicStanding(e.target.value)}
        className="bg-uni-card border border-uni-border rounded-lg px-2 py-1 text-xs text-uni-text focus:border-uni-gold outline-none"
      >
        {ACADEMIC_STANDING_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* enrollment_status */}
      <select
        value={enrollmentStatus}
        onChange={e => setEnrollmentStatus(e.target.value)}
        className="bg-uni-card border border-uni-border rounded-lg px-2 py-1 text-xs text-uni-text focus:border-uni-gold outline-none"
      >
        {ENROLLMENT_STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave({ is_active: isActive, academic_standing: academicStanding, enrollment_status: enrollmentStatus })}
          className="w-8 h-8 rounded-lg bg-uni-green/20 border border-uni-green/40 flex items-center justify-center hover:bg-uni-green/30 transition-colors"
        >
          <Check className="w-4 h-4 text-uni-green" />
        </button>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-lg bg-uni-red/10 border border-uni-red/30 flex items-center justify-center hover:bg-uni-red/20 transition-colors"
        >
          <X className="w-4 h-4 text-uni-red" />
        </button>
      </div>
    </div>
  )
}

export default function AdminStudentsPage() {
  const { t, lang } = useT()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-students', page, search],
    queryFn: () => adminAPI.getStudents({ page, search: search || undefined, per_page: 20 }).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      adminAPI.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] })
      setEditingId(null)
    },
  })

  const students: Student[] = data?.students || []
  const total = data?.total || 0

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">{t.admin.studentsList}</h1>
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
            placeholder={t.admin.searchStudents}
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
            <p className="text-uni-muted text-sm">{t.common.noData}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {students.map((student: Student, i: number) => {
                const id = student.id as number
                return editingId === id ? (
                  <motion.div key={id ?? i} layout>
                    <EditRow
                      student={student}
                      onSave={(data) => updateMutation.mutate({ id, data })}
                      onCancel={() => setEditingId(null)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={id ?? i}
                    layout
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
                        {!!(student.first_name as string) && <span className="text-uni-muted text-xs mr-2">({student.first_name as string} {student.last_name as string})</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-uni-muted mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email as string}</span>
                        {!!(student.created_at as string) && (
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
                        {student.is_active ? t.common.active : t.common.inactive}
                      </span>
                      <span className="badge-gold text-xs">
                        <Shield className="w-3 h-3 inline ml-1" />
                        {student.role as string}
                      </span>
                      {id != null && (
                        <button
                          onClick={() => setEditingId(id)}
                          className="w-8 h-8 rounded-lg bg-uni-card border border-uni-border flex items-center justify-center hover:border-uni-gold/40 hover:text-uni-gold transition-all text-uni-muted"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
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
              {t.common.prev}
            </button>
            <span className="text-uni-muted text-sm">صفحة {page} من {Math.ceil(total / 20)}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 rounded-xl border border-uni-border text-uni-muted text-sm hover:border-uni-gold/30 disabled:opacity-40 transition-all"
            >
              {t.common.next}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
