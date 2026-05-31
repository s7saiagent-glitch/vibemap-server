'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Layers, Plus, X, Users, BookOpen, Power } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI, academicAPI } from '@/lib/api'

export default function AdminSectionsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    course_id: '', section_number: '', semester: '', academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), capacity: '30',
  })

  const { data: sections, isLoading } = useQuery({
    queryKey: ['admin-sections'],
    queryFn: () => adminAPI.getSections().then(r => r.data),
  })

  const { data: courses } = useQuery({
    queryKey: ['all-courses-sections'],
    queryFn: () => academicAPI.getCourses().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => adminAPI.createSection({
      course_id: Number(form.course_id),
      section_number: form.section_number,
      semester: form.semester,
      academic_year: form.academic_year,
      capacity: Number(form.capacity),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sections'] })
      setShowForm(false)
      setForm({ course_id: '', section_number: '', semester: '', academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), capacity: '30' })
      setMsg('تم إنشاء الشعبة بنجاح')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: () => setMsg('حدث خطأ أثناء الإنشاء'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      adminAPI.updateSection(id, { is_active: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sections'] }),
  })

  const courseList = Array.isArray(courses?.courses || courses) ? (courses?.courses || courses || []) : []
  const sectionList = Array.isArray(sections) ? sections : (sections?.sections || [])

  const SEMESTERS = ['الأول', 'الثاني', 'الصيفي']

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">الشُعب الدراسية</h1>
            <p className="text-uni-muted text-sm mt-1">إنشاء وإدارة الشُعب التي يسجّل فيها الطلاب</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-sm font-bold">
            <Plus className="w-4 h-4" /> إنشاء شعبة
          </button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm text-center ${msg.includes('خطأ') ? 'bg-uni-red/10 text-uni-red border border-uni-red/20' : 'bg-uni-green/10 text-uni-green border border-uni-green/20'}`}>
            {msg}
          </div>
        )}

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-uni-text">إنشاء شعبة جديدة</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">المادة الدراسية *</label>
                <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  <option value="">اختر المادة</option>
                  {courseList.map((c: Record<string, unknown>) => (
                    <option key={c.id as number} value={c.id as number}>{c.name_ar as string} ({c.code as string})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">رقم الشعبة *</label>
                <input type="text" value={form.section_number} onChange={e => setForm(f => ({ ...f, section_number: e.target.value }))}
                  placeholder="مثال: 001" className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">السعة</label>
                <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  min="1" max="200" className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الفصل الدراسي *</label>
                <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  <option value="">اختر الفصل</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>الفصل {s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">السنة الأكاديمية</label>
                <input type="text" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  placeholder="2025-2026" className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" dir="ltr" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.course_id || !form.section_number || !form.semester}
                className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الشعبة'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30 transition-all">إلغاء</button>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 glass rounded-2xl shimmer" />)}
          </div>
        ) : sectionList.length === 0 ? (
          <div className="card-uni text-center py-12">
            <Layers className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لا توجد شُعب دراسية بعد</p>
            <p className="text-xs text-uni-muted mt-1">أنشئ شعبة لتتمكن من ربط الطلاب والأساتذة والاختبارات</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sectionList.map((s: Record<string, unknown>, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="card-uni hover:border-uni-gold/20 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-uni-blue/10 border border-uni-blue/20 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-uni-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-uni-text text-sm truncate">{s.course_name as string || `مادة ${s.course_id}`}</div>
                      <div className="text-xs text-uni-muted mt-0.5">شعبة {s.section_number as string} · الفصل {s.semester as string}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-uni-muted"><Users className="w-3 h-3" /> {s.enrolled_count as number || 0}/{s.capacity as number || 30}</span>
                        <span className="flex items-center gap-1 text-xs text-uni-muted"><BookOpen className="w-3 h-3" /> {s.academic_year as string}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate({ id: s.id as number, active: !(s.is_active as boolean) })}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${s.is_active ? 'border-uni-green/30 text-uni-green hover:bg-uni-red/10 hover:text-uni-red hover:border-uni-red/30' : 'border-uni-red/30 text-uni-red hover:bg-uni-green/10 hover:text-uni-green hover:border-uni-green/30'}`}>
                    <Power className="w-3 h-3" />
                    {s.is_active ? 'نشطة' : 'معطلة'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
