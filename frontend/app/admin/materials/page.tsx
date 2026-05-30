'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookMarked, Plus, X, Upload, Link, FileText, Video, StickyNote } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI, academicAPI } from '@/lib/api'

const MATERIAL_TYPES = [
  { value: 'pdf', label: 'ملف PDF', icon: FileText },
  { value: 'video', label: 'فيديو', icon: Video },
  { value: 'link', label: 'رابط', icon: Link },
  { value: 'note', label: 'ملاحظة', icon: StickyNote },
  { value: 'presentation', label: 'عرض تقديمي', icon: Upload },
]

export default function AdminMaterialsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    course_id: '',
    title: '',
    material_type: 'pdf',
    description: '',
    file_url: '',
    content: '',
  })

  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['all-courses-mat'],
    queryFn: () => academicAPI.getCourses().then(r => r.data),
  })

  const { data: materials, isLoading } = useQuery({
    queryKey: ['admin-materials', form.course_id],
    queryFn: () => adminAPI.getMaterials(form.course_id ? { course_id: Number(form.course_id) } : {}).then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      adminAPI.addMaterial({
        course_id: Number(form.course_id),
        title: form.title,
        material_type: form.material_type,
        description: form.description || undefined,
        file_url: form.file_url || undefined,
        content: form.content || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-materials'] })
      setShowForm(false)
      setForm({ course_id: form.course_id, title: '', material_type: 'pdf', description: '', file_url: '', content: '' })
      setMsg('تم إضافة المادة التعليمية بنجاح')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: () => setMsg('حدث خطأ أثناء الإضافة'),
  })

  const courseList = Array.isArray(courses?.courses || courses) ? (courses?.courses || courses || []) : []
  const materialList = Array.isArray(materials) ? materials : []

  const ICONS: Record<string, React.ElementType> = {
    pdf: FileText, video: Video, link: Link, note: StickyNote, presentation: Upload,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">المواد التعليمية</h1>
            <p className="text-uni-muted text-sm mt-1">إضافة وإدارة مصادر التعلم للمواد الدراسية</p>
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

        {/* Filter by course */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-uni-muted">تصفية حسب المادة:</label>
          <select
            value={form.course_id}
            onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
            className="bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
          >
            <option value="">جميع المواد</option>
            {courseList.map((c: Record<string, unknown>) => (
              <option key={c.id as number} value={c.id as number}>{c.name_ar as string} ({c.code as string})</option>
            ))}
          </select>
        </div>

        {/* Add Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-uni-text">إضافة مادة تعليمية</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-uni-muted mb-1 block">المادة الدراسية *</label>
                <select
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                >
                  <option value="">اختر المادة</option>
                  {courseList.map((c: Record<string, unknown>) => (
                    <option key={c.id as number} value={c.id as number}>{c.name_ar as string} ({c.code as string})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">نوع المادة</label>
                <select
                  value={form.material_type}
                  onChange={e => setForm(f => ({ ...f, material_type: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                >
                  {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: محاضرة مقدمة في البرمجة"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">الوصف</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                />
              </div>
              {(form.material_type === 'pdf' || form.material_type === 'video' || form.material_type === 'link' || form.material_type === 'presentation') && (
                <div className="col-span-2">
                  <label className="text-xs text-uni-muted mb-1 block">الرابط / URL</label>
                  <input
                    type="url"
                    value={form.file_url}
                    onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                    dir="ltr"
                  />
                </div>
              )}
              {form.material_type === 'note' && (
                <div className="col-span-2">
                  <label className="text-xs text-uni-muted mb-1 block">محتوى الملاحظة</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={4}
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending || !form.title || !form.course_id}
                className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30 transition-all">
                إلغاء
              </button>
            </div>
          </motion.div>
        )}

        {/* Materials list */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 glass rounded-2xl shimmer" />)}
          </div>
        ) : materialList.length === 0 ? (
          <div className="card-uni text-center py-12">
            <BookMarked className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لا توجد مواد تعليمية بعد</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {materialList.map((m: Record<string, unknown>, i: number) => {
              const Icon = ICONS[m.material_type as string] || BookMarked
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-uni hover:border-uni-gold/20 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-uni-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-uni-text text-sm">{m.title as string}</div>
                      {!!(m.description) && <p className="text-xs text-uni-muted mt-0.5 truncate">{m.description as string}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="badge-gold text-xs">{MATERIAL_TYPES.find(t => t.value === m.material_type)?.label || String(m.material_type)}</span>
                        {!!(m.file_url) && (
                          <a href={m.file_url as string} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-uni-blue hover:underline truncate max-w-32">
                            فتح الرابط ↗
                          </a>
                        )}
                      </div>
                    </div>
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
