'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Plus, X, Zap, BookOpen } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

export default function AdminAIProfessorsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    name: '', name_ar: '', personality: 'professional', subject_expertise: '',
    teaching_style: 'socratic', language_preference: 'arabic', section_id: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-professors'],
    queryFn: () => adminAPI.getAIProfessors().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => adminAPI.createAIProfessor({
      ...form,
      section_id: Number(form.section_id),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai-professors'] })
      setShowForm(false)
      setMsg('تم إنشاء الأستاذ الذكي بنجاح')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: () => setMsg('حدث خطأ أثناء الإنشاء'),
  })

  const professors = data?.professors || data || []

  const PERSONALITIES: Record<string, string> = {
    professional: 'محترف وأكاديمي',
    friendly: 'ودود وتحفيزي',
    strict: 'صارم ومنضبط',
    mentor: 'مرشد وداعم',
  }

  const STYLES: Record<string, string> = {
    socratic: 'سقراطي - أسئلة وحوار',
    lecture: 'محاضرة تقليدية',
    problem_based: 'حل المشكلات',
    project_based: 'قائم على المشاريع',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">الأساتذة الذكاء الاصطناعي</h1>
            <p className="text-uni-muted text-sm mt-1">إدارة وإنشاء أساتذة AI لكل مادة</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> إنشاء أستاذ
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
              <h3 className="font-bold text-uni-text">إنشاء أستاذ AI جديد</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الاسم بالعربية</label>
                <input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">Professor Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الشخصية</label>
                <select value={form.personality} onChange={e => setForm(f => ({ ...f, personality: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  {Object.entries(PERSONALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">أسلوب التدريس</label>
                <select value={form.teaching_style} onChange={e => setForm(f => ({ ...f, teaching_style: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  {Object.entries(STYLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">تخصص المادة</label>
                <input value={form.subject_expertise} onChange={e => setForm(f => ({ ...f, subject_expertise: e.target.value }))}
                  placeholder="مثال: خوارزميات، تحليل بيانات..."
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">ID الشعبة (Section ID)</label>
                <input value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                  type="number"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.name_ar || !form.section_id}
              className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الأستاذ'}
            </button>
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-36 glass rounded-2xl shimmer" />)}
          </div>
        ) : professors.length === 0 ? (
          <div className="card-uni text-center py-16">
            <Brain className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
            <h3 className="text-xl font-bold text-uni-text mb-2">لا يوجد أساتذة AI حتى الآن</h3>
            <p className="text-uni-muted text-sm">ابدأ بإنشاء أستاذ AI لأول مادة دراسية</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {(Array.isArray(professors) ? professors : []).map((prof: Record<string, unknown>, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="card-uni hover:border-uni-gold/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-uni-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-uni-text">{prof.name_ar as string || prof.name as string}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="badge-gold text-xs text-uni-gold">{PERSONALITIES[prof.personality as string] || prof.personality as string}</span>
                      <span className="badge-gold text-xs text-uni-blue border-uni-blue/40 bg-uni-blue/10">
                        <Zap className="w-3 h-3 inline ml-1" />{prof.teaching_style as string}
                      </span>
                    </div>
                    {!!(prof.subject_expertise as string) && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-uni-muted">
                        <BookOpen className="w-3 h-3" />
                        <span>{prof.subject_expertise as string}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
