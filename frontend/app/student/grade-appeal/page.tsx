'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentAPI } from '@/lib/api'

type AppealStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected'

interface Appeal {
  id: number
  course: string
  grade: string
  reason: string
  status: AppealStatus
  submittedAt: string
}

interface ApiAppeal {
  id: number
  course_name?: string
  course?: string
  current_grade?: string
  grade?: string
  reason?: string
  status?: string
  created_at?: string
  submitted_at?: string
}

const STATUS_CONFIG: Record<AppealStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'في الانتظار', color: 'text-uni-gold', icon: Clock },
  reviewing: { label: 'قيد المراجعة', color: 'text-uni-blue', icon: Info },
  resolved: { label: 'تم الحل', color: 'text-uni-green', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'text-uni-red', icon: AlertCircle },
}

function normalizeStatus(raw?: string): AppealStatus {
  if (raw === 'reviewing' || raw === 'resolved' || raw === 'rejected') return raw
  return 'pending'
}

export default function GradeAppealPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ course: '', currentGrade: '', expectedGrade: '', reason: '', details: '' })

  const { data: transcriptData } = useQuery({
    queryKey: ['transcript-appeal'],
    queryFn: () => studentAPI.getTranscript().then(r => r.data),
  })

  const { data: appealsData } = useQuery({
    queryKey: ['grade-appeals'],
    queryFn: () => studentAPI.getGradeAppeals().then(r => r.data),
  })

  const transcript: Record<string, unknown>[] = transcriptData?.transcript || transcriptData || []

  const rawAppeals: ApiAppeal[] = Array.isArray(appealsData)
    ? appealsData
    : appealsData?.appeals ?? appealsData?.results ?? []

  const appeals: Appeal[] = rawAppeals.map((a: ApiAppeal) => ({
    id: a.id,
    course: a.course_name || a.course || '',
    grade: a.current_grade || a.grade || '',
    reason: a.reason || '',
    status: normalizeStatus(a.status),
    submittedAt: a.created_at
      ? new Date(a.created_at).toLocaleDateString('ar-SA')
      : a.submitted_at
      ? new Date(a.submitted_at).toLocaleDateString('ar-SA')
      : '',
  }))

  const submitMutation = useMutation({
    mutationFn: () =>
      studentAPI.submitGradeAppeal({
        course_name: form.course,
        reason: form.reason,
        current_grade: form.currentGrade || undefined,
        expected_grade: form.expectedGrade || undefined,
        details: form.details || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-appeals'] })
      setForm({ course: '', currentGrade: '', expectedGrade: '', reason: '', details: '' })
      setShowForm(false)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    },
  })

  const handleSubmit = () => {
    if (!form.course || !form.reason) return
    submitMutation.mutate()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-uni-gold" /> تظلمات الدرجات
            </h1>
            <p className="text-uni-muted text-sm mt-1">تقديم اعتراضات رسمية على الدرجات الدراسية</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="btn-gold px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Send className="w-4 h-4" /> تقديم تظلم
          </button>
        </div>

        {submitted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-uni-green/10 border border-uni-green/30 text-uni-green text-sm font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> تم تقديم تظلمك — سيُراجَع خلال 3 أيام عمل
          </motion.div>
        )}

        {submitMutation.isError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-uni-red/10 border border-uni-red/30 text-uni-red text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> حدث خطأ أثناء تقديم التظلم. يرجى المحاولة مجدداً.
          </motion.div>
        )}

        <div className="card-uni border-uni-blue/20 bg-uni-blue/5 flex items-start gap-3">
          <Info className="w-5 h-5 text-uni-blue flex-shrink-0 mt-0.5" />
          <p className="text-xs text-uni-muted leading-relaxed">
            <span className="font-bold text-uni-text">سياسة التظلمات:</span> يمكن تقديم التظلم خلال أسبوعين من إعلان النتائج. تُعاد تصحيح الورقة من قِبل لجنة مستقلة. القرار النهائي ملزم لجميع الأطراف.
          </p>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-uni-text">تقديم تظلم جديد</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">المادة الدراسية *</label>
                <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  <option value="">اختر المادة</option>
                  {transcript.map((t, i) => (
                    <option key={i} value={String(t.course_name_ar || t.course_name || '')}>
                      {String(t.course_name_ar || t.course_name || `مادة ${i + 1}`)} — {String(t.letter_grade || '')}
                    </option>
                  ))}
                  <option value="مادة أخرى">مادة أخرى</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الدرجة الحالية</label>
                <input type="text" value={form.currentGrade} onChange={e => setForm(f => ({ ...f, currentGrade: e.target.value }))}
                  placeholder="مثال: C+" className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الدرجة المتوقعة</label>
                <input type="text" value={form.expectedGrade} onChange={e => setForm(f => ({ ...f, expectedGrade: e.target.value }))}
                  placeholder="مثال: B" className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">سبب التظلم *</label>
                <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  <option value="">اختر السبب</option>
                  <option value="خطأ في حساب الدرجة">خطأ في حساب الدرجة</option>
                  <option value="لم تُحتسب إجابات صحيحة">لم تُحتسب إجابات صحيحة</option>
                  <option value="خطأ في نقل الدرجة">خطأ في نقل الدرجة</option>
                  <option value="ظروف استثنائية أثناء الاختبار">ظروف استثنائية أثناء الاختبار</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">تفاصيل إضافية</label>
                <textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                  rows={3} placeholder="اشرح باختصار سبب اعتراضك..."
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={!form.course || !form.reason || submitMutation.isPending}
                className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                <Send className="w-4 h-4" /> {submitMutation.isPending ? 'جارٍ الإرسال...' : 'تقديم التظلم'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-uni-muted border border-uni-border rounded-xl hover:border-uni-gold/30 transition-all">
                إلغاء
              </button>
            </div>
          </motion.div>
        )}

        {appeals.length === 0 ? (
          <div className="card-uni text-center py-12">
            <MessageSquare className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لا توجد تظلمات مقدمة</p>
            <p className="text-xs text-uni-muted mt-1">اضغط &quot;تقديم تظلم&quot; للبدء</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appeals.map((appeal, i) => {
              const status = STATUS_CONFIG[appeal.status]
              const StatusIcon = status.icon
              return (
                <motion.div key={appeal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="card-uni">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-uni-text text-sm">{appeal.course}</div>
                      <div className="text-xs text-uni-muted mt-1">{appeal.reason}</div>
                      {appeal.grade && <span className="badge-gold text-xs mt-1 inline-block">{appeal.grade}</span>}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-uni-border/20">
                    <span className="text-xs text-uni-muted">تاريخ التقديم: {appeal.submittedAt}</span>
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
