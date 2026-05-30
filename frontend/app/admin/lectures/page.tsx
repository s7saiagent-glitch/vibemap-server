'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Eye, EyeOff, X, Clock, Users } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

export default function AdminLecturesPage() {
  const qc = useQueryClient()
  const [selectedSection, setSelectedSection] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    title_ar: '',
    content: '',
    duration_minutes: 60,
    order_index: 0,
    learning_objectives: '',
    key_concepts: '',
  })

  const { data: sections } = useQuery({
    queryKey: ['admin-sections'],
    queryFn: () => adminAPI.getSections().then(r => r.data),
  })

  const { data: lectures, isLoading } = useQuery({
    queryKey: ['admin-lectures', selectedSection],
    queryFn: () => adminAPI.getSectionLectures(Number(selectedSection)).then(r => r.data),
    enabled: !!selectedSection,
  })

  const createMutation = useMutation({
    mutationFn: () => adminAPI.createLecture({
      section_id: Number(selectedSection),
      ...form,
      duration_minutes: Number(form.duration_minutes),
      order_index: Number(form.order_index),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-lectures', selectedSection] })
      setShowForm(false)
      setForm({ title_ar: '', content: '', duration_minutes: 60, order_index: 0, learning_objectives: '', key_concepts: '' })
      setMsg('تم إنشاء المحاضرة بنجاح')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: () => setMsg('حدث خطأ'),
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, pub }: { id: number; pub: boolean }) => adminAPI.publishLecture(id, pub),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lectures', selectedSection] }),
  })

  const sectionList = Array.isArray(sections) ? sections : []
  const lectureList = Array.isArray(lectures) ? lectures : []

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">إدارة المحاضرات</h1>
            <p className="text-uni-muted text-sm mt-1">إنشاء وإدارة محتوى المحاضرات</p>
          </div>
          {selectedSection && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-gold px-4 py-2 rounded-xl text-sm font-bold">
              <Plus className="w-4 h-4" /> محاضرة جديدة
            </button>
          )}
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm text-center ${msg.includes('خطأ') ? 'bg-uni-red/10 text-uni-red border border-uni-red/20' : 'bg-uni-green/10 text-uni-green border border-uni-green/20'}`}>
            {msg}
          </div>
        )}

        {/* Section Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-uni-muted flex-shrink-0">اختر الشعبة:</label>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
            className="flex-1 max-w-md bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
            <option value="">اختر شعبة لعرض محاضراتها</option>
            {sectionList.map((s: Record<string, unknown>) => (
              <option key={s.id as number} value={s.id as number}>
                {s.course_code as string} - {s.course_name as string} ({s.academic_year as string})
              </option>
            ))}
          </select>
        </div>

        {/* Create Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-uni-text">إنشاء محاضرة جديدة</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">عنوان المحاضرة *</label>
                <input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                  placeholder="مثال: مقدمة في البرمجة الكائنية"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الترتيب</label>
                <input type="number" min="0" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: Number(e.target.value) }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">المدة (دقيقة)</label>
                <input type="number" min="1" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الأهداف التعليمية (كل هدف في سطر)</label>
                <textarea value={form.learning_objectives} onChange={e => setForm(f => ({ ...f, learning_objectives: e.target.value }))}
                  rows={3} placeholder="هدف 1&#10;هدف 2&#10;هدف 3"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">المفاهيم الرئيسية (مفصولة بفاصلة)</label>
                <textarea value={form.key_concepts} onChange={e => setForm(f => ({ ...f, key_concepts: e.target.value }))}
                  rows={3} placeholder="OOP, Class, Object, Inheritance"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">محتوى المحاضرة (Markdown مدعوم)</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={8} placeholder="اكتب محتوى المحاضرة هنا... يدعم Markdown"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none font-mono" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title_ar}
                className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المحاضرة'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30">
                إلغاء
              </button>
            </div>
          </motion.div>
        )}

        {/* Lectures List */}
        {!selectedSection ? (
          <div className="card-uni text-center py-12">
            <BookOpen className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">اختر شعبة من القائمة أعلاه لعرض محاضراتها</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl shimmer" />)}</div>
        ) : lectureList.length === 0 ? (
          <div className="card-uni text-center py-12">
            <BookOpen className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لا توجد محاضرات لهذه الشعبة</p>
            <button onClick={() => setShowForm(true)} className="mt-4 btn-gold px-5 py-2 rounded-xl text-sm font-bold">
              إنشاء أول محاضرة
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lectureList.map((l: Record<string, unknown>, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card-uni flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-uni-blue">
                  {(l.order_index as number) + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-uni-text truncate">{l.title as string}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-uni-muted">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.duration_minutes as number} دقيقة</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{l.view_count as number} مشاهدة</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium border ${l.is_published ? 'bg-uni-green/10 text-uni-green border-uni-green/20' : 'bg-uni-muted/10 text-uni-muted border-uni-border/20'}`}>
                    {l.is_published ? 'منشورة' : 'مسودة'}
                  </span>
                  <button onClick={() => publishMutation.mutate({ id: l.id as number, pub: !l.is_published })}
                    className="p-2 rounded-lg hover:bg-uni-gold/10 text-uni-muted hover:text-uni-gold transition-colors">
                    {l.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
