'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Award, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { academicAPI, adminAPI } from '@/lib/api'

export default function AdminCoursesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', name_ar: '', code: '', credits: 3, description_ar: '', faculty_id: '' })
  const [msg, setMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['all-courses'],
    queryFn: () => academicAPI.getCourses().then(r => r.data),
  })

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => academicAPI.getFaculties().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => adminAPI.createCourse({ ...form, credits: Number(form.credits), faculty_id: Number(form.faculty_id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-courses'] })
      setShowForm(false)
      setForm({ name: '', name_ar: '', code: '', credits: 3, description_ar: '', faculty_id: '' })
      setMsg('تم إنشاء المادة بنجاح')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: () => setMsg('حدث خطأ أثناء الإنشاء'),
  })

  const courses = data?.courses || data || []

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">إدارة المواد الدراسية</h1>
            <p className="text-uni-muted text-sm mt-1">إنشاء وإدارة المواد الدراسية</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> إضافة مادة
          </button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm text-center ${msg.includes('خطأ') ? 'bg-uni-red/10 text-uni-red border border-uni-red/20' : 'bg-uni-green/10 text-uni-green border border-uni-green/20'}`}>
            {msg}
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-uni-text">إضافة مادة جديدة</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: 'اسم المادة (عربي)', key: 'name_ar' },
                { label: 'Course Name', key: 'name' },
                { label: 'كود المادة', key: 'code' },
                { label: 'الساعات المعتمدة', key: 'credits', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs text-uni-muted mb-1 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">الكلية</label>
                <select
                  value={form.faculty_id}
                  onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                >
                  <option value="">اختر الكلية</option>
                  {(faculties?.faculties || faculties || []).map((f: Record<string, unknown>) => (
                    <option key={f.id as number} value={f.id as number}>{f.name_ar as string}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">الوصف (عربي)</label>
                <textarea
                  value={form.description_ar}
                  onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))}
                  rows={2}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none"
                />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.name_ar || !form.code}
              className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المادة'}
            </button>
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-36 glass rounded-2xl shimmer" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(courses) ? courses : []).map((course: Record<string, unknown>, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-uni hover:border-uni-gold/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-uni-blue" />
                  </div>
                  <span className="badge-gold text-xs font-mono">{course.code as string}</span>
                </div>
                <h3 className="font-bold text-uni-text mb-1">{course.name_ar as string}</h3>
                <p className="text-uni-muted text-xs font-mono mb-3">{course.name as string}</p>
                <div className="flex items-center gap-2 text-xs text-uni-muted">
                  <Award className="w-3 h-3" />
                  <span>{course.credits as number} ساعات معتمدة</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
