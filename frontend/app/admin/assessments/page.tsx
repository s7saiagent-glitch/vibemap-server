'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, X, ChevronRight, ChevronLeft,
  CheckCircle, Eye, EyeOff, Trash2, BookOpen, Clock, Target
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'

const ASSESSMENT_TYPES = [
  { value: 'quiz', label: 'اختبار قصير' },
  { value: 'midterm', label: 'امتحان منتصف الفصل' },
  { value: 'final', label: 'امتحان نهائي' },
  { value: 'assignment', label: 'واجب' },
  { value: 'project', label: 'مشروع' },
]

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد' },
  { value: 'true_false', label: 'صح أو خطأ' },
  { value: 'essay', label: 'مقال' },
  { value: 'short_answer', label: 'إجابة قصيرة' },
]

type QuestionDraft = {
  content: string
  content_ar: string
  question_type: string
  points: number
  options: { text: string; is_correct: boolean }[]
  correct_answer: string
  difficulty: string
}

const emptyQuestion = (): QuestionDraft => ({
  content: '',
  content_ar: '',
  question_type: 'mcq',
  points: 1,
  options: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
  correct_answer: 'true',
  difficulty: 'medium',
})

export default function AdminAssessmentsPage() {
  const qc = useQueryClient()
  const [step, setStep] = useState(0) // 0=list, 1=basic, 2=questions, 3=review
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    assessment_type: 'quiz',
    section_id: '',
    duration_minutes: 60,
    total_points: 100,
    passing_score: 60,
    weight_percent: 20,
    start_datetime: '',
    end_datetime: '',
    instructions: '',
  })
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()])
  const [currentQ, setCurrentQ] = useState(0)
  const [publish, setPublish] = useState(false)

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['admin-assessments'],
    queryFn: () => adminAPI.getAssessments().then(r => r.data),
    enabled: step === 0,
  })

  const { data: sections } = useQuery({
    queryKey: ['admin-sections'],
    queryFn: () => adminAPI.getSections().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        section_id: Number(form.section_id),
        title: form.title_ar || form.title,
        title_ar: form.title_ar,
        assessment_type: form.assessment_type,
        instructions: form.instructions,
        total_points: Number(form.total_points),
        passing_score: Number(form.passing_score),
        duration_minutes: Number(form.duration_minutes),
        weight_percent: Number(form.weight_percent),
        attempts_allowed: 1,
        is_randomized: true,
        anti_cheat_enabled: true,
        start_datetime: form.start_datetime || null,
        end_datetime: form.end_datetime || null,
        questions: questions.map((q) => {
          const base = {
            content: q.content_ar || q.content,
            content_ar: q.content_ar || q.content,
            question_type: q.question_type,
            points: q.points,
            difficulty: q.difficulty,
          }
          if (q.question_type === 'mcq') {
            return { ...base, options: q.options.filter(o => o.text.trim()) }
          }
          if (q.question_type === 'true_false') {
            return { ...base, correct_answer: q.correct_answer }
          }
          return base
        }),
      }
      return adminAPI.createAssessment(payload, publish)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-assessments'] })
      setMsg('تم إنشاء الاختبار بنجاح')
      setStep(0)
      resetForm()
      setTimeout(() => setMsg(''), 4000)
    },
    onError: () => setMsg('حدث خطأ أثناء الإنشاء'),
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, pub }: { id: number; pub: boolean }) => adminAPI.publishAssessment(id, pub),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-assessments'] }),
  })

  const resetForm = () => {
    setForm({ title: '', title_ar: '', assessment_type: 'quiz', section_id: '', duration_minutes: 60, total_points: 100, passing_score: 60, weight_percent: 20, start_datetime: '', end_datetime: '', instructions: '' })
    setQuestions([emptyQuestion()])
    setCurrentQ(0)
    setPublish(false)
  }

  const q = questions[currentQ]
  const updateQ = (updates: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map((item, i) => i === currentQ ? { ...item, ...updates } : item))
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()])
    setCurrentQ(questions.length)
  }

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    setCurrentQ(Math.max(0, currentQ - 1))
  }

  const sectionList = Array.isArray(sections) ? sections : []
  const assessmentList = Array.isArray(assessments) ? assessments : []

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">إدارة الاختبارات</h1>
            <p className="text-uni-muted text-sm mt-1">إنشاء وإدارة اختبارات الطلاب</p>
          </div>
          {step === 0 && (
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-sm font-bold">
              <Plus className="w-4 h-4" /> إنشاء اختبار
            </button>
          )}
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm text-center ${msg.includes('خطأ') ? 'bg-uni-red/10 text-uni-red border border-uni-red/20' : 'bg-uni-green/10 text-uni-green border border-uni-green/20'}`}>
            {msg}
          </div>
        )}

        {/* Step 0: List */}
        {step === 0 && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 glass rounded-2xl shimmer" />)}</div>
            ) : assessmentList.length === 0 ? (
              <div className="card-uni text-center py-12">
                <FileText className="w-12 h-12 text-uni-muted mx-auto mb-3" />
                <p className="text-uni-muted">لا توجد اختبارات بعد</p>
                <button onClick={() => setStep(1)} className="mt-4 btn-gold px-6 py-2 rounded-xl text-sm font-bold">
                  إنشاء أول اختبار
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {assessmentList.map((a: Record<string, unknown>, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="card-uni flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-uni-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-uni-text truncate">{a.title as string}</div>
                      <div className="text-xs text-uni-muted mt-0.5">
                        {a.course_name as string} · {ASSESSMENT_TYPES.find(t => t.value === a.assessment_type)?.label} · {a.duration_minutes as number} دقيقة · {a.total_points as number} نقطة
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${a.is_published ? 'bg-uni-green/10 text-uni-green border border-uni-green/20' : 'bg-uni-muted/10 text-uni-muted border border-uni-border/20'}`}>
                        {a.is_published ? 'منشور' : 'مسودة'}
                      </span>
                      <button
                        onClick={() => publishMutation.mutate({ id: a.id as number, pub: !a.is_published })}
                        className="p-2 rounded-lg hover:bg-uni-gold/10 text-uni-muted hover:text-uni-gold transition-colors"
                        title={a.is_published ? 'إلغاء النشر' : 'نشر'}
                      >
                        {a.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-gold/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-uni-text">معلومات الاختبار الأساسية</h3>
              <button onClick={() => { setStep(0); resetForm() }}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">عنوان الاختبار (عربي) *</label>
                <input
                  type="text"
                  value={form.title_ar}
                  onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                  placeholder="مثال: اختبار منتصف الفصل - مقدمة البرمجة"
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">نوع الاختبار *</label>
                <select value={form.assessment_type} onChange={e => setForm(f => ({ ...f, assessment_type: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  {ASSESSMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">الشعبة الدراسية *</label>
                <select value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                  <option value="">اختر الشعبة</option>
                  {sectionList.map((s: Record<string, unknown>) => (
                    <option key={s.id as number} value={s.id as number}>
                      {s.course_code as string} - {s.course_name as string}
                    </option>
                  ))}
                </select>
              </div>
              {[
                { label: 'مدة الاختبار (دقيقة)', key: 'duration_minutes', type: 'number' },
                { label: 'إجمالي النقاط', key: 'total_points', type: 'number' },
                { label: 'درجة النجاح', key: 'passing_score', type: 'number' },
                { label: 'الوزن من الدرجة الكلية (%)', key: 'weight_percent', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs text-uni-muted mb-1 block">{label}</label>
                  <input type={type} value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
                </div>
              ))}
              <div>
                <label className="text-xs text-uni-muted mb-1 block">تاريخ البداية</label>
                <input type="datetime-local" value={form.start_datetime}
                  onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div>
                <label className="text-xs text-uni-muted mb-1 block">تاريخ الانتهاء</label>
                <input type="datetime-local" value={form.end_datetime}
                  onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-uni-muted mb-1 block">تعليمات الاختبار</label>
                <textarea value={form.instructions}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  rows={2}
                  className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setStep(0); resetForm() }} className="px-4 py-2 rounded-xl text-sm text-uni-muted hover:text-uni-text border border-uni-border hover:border-uni-gold/30 transition-all">
                إلغاء
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!form.title_ar || !form.section_id}
                className="btn-gold px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
              >
                التالي: الأسئلة <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="card-uni border-uni-blue/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-uni-text">أسئلة الاختبار</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-uni-muted">{questions.length} سؤال</span>
                  <button onClick={addQuestion} className="flex items-center gap-1 px-3 py-1.5 rounded-lg btn-gold text-xs font-bold">
                    <Plus className="w-3 h-3" /> إضافة سؤال
                  </button>
                </div>
              </div>

              {/* Question tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {questions.map((_, i) => (
                  <button key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${i === currentQ ? 'bg-uni-gold text-uni-dark' : 'bg-uni-card border border-uni-border text-uni-muted hover:border-uni-gold/30'}`}
                  >
                    س{i + 1}
                    {questions.length > 1 && (
                      <span onClick={(e) => { e.stopPropagation(); removeQuestion(i) }} className="text-uni-red hover:bg-uni-red/20 rounded p-0.5">
                        <X className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Current Question Editor */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-uni-muted mb-1 block">نوع السؤال</label>
                    <select value={q.question_type} onChange={e => updateQ({ question_type: e.target.value })}
                      className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none">
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-uni-muted mb-1 block">النقاط</label>
                    <input type="number" min="0.5" step="0.5" value={q.points}
                      onChange={e => updateQ({ points: Number(e.target.value) })}
                      className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-uni-muted mb-1 block">نص السؤال *</label>
                    <textarea
                      value={q.content_ar}
                      onChange={e => updateQ({ content_ar: e.target.value, content: e.target.value })}
                      rows={2}
                      placeholder="اكتب نص السؤال هنا..."
                      className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none"
                    />
                  </div>
                </div>

                {/* MCQ Options */}
                {q.question_type === 'mcq' && (
                  <div className="space-y-2">
                    <label className="text-xs text-uni-muted block">الخيارات (حدد الإجابة الصحيحة)</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-${currentQ}`}
                          checked={opt.is_correct}
                          onChange={() => updateQ({ options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) })}
                          className="w-4 h-4 accent-uni-gold"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => updateQ({ options: q.options.map((o, j) => j === oi ? { ...o, text: e.target.value } : o) })}
                          placeholder={`الخيار ${oi + 1}`}
                          className="flex-1 bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                        />
                        {opt.is_correct && <CheckCircle className="w-4 h-4 text-uni-green flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False */}
                {q.question_type === 'true_false' && (
                  <div>
                    <label className="text-xs text-uni-muted mb-2 block">الإجابة الصحيحة</label>
                    <div className="flex gap-3">
                      {['true', 'false'].map(v => (
                        <button key={v}
                          onClick={() => updateQ({ correct_answer: v })}
                          className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${q.correct_answer === v ? 'btn-gold' : 'border border-uni-border text-uni-muted hover:border-uni-gold/30'}`}
                        >
                          {v === 'true' ? '✓ صح' : '✗ خطأ'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30 transition-all">
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <button onClick={() => setStep(3)} className="btn-gold px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                مراجعة وحفظ <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-green/20">
            <h3 className="font-bold text-uni-text mb-4">مراجعة الاختبار</h3>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-uni-muted">
                  <BookOpen className="w-4 h-4" />
                  <span>العنوان: <span className="text-uni-text font-medium">{form.title_ar}</span></span>
                </div>
                <div className="flex items-center gap-2 text-uni-muted">
                  <Clock className="w-4 h-4" />
                  <span>المدة: <span className="text-uni-text font-medium">{form.duration_minutes} دقيقة</span></span>
                </div>
                <div className="flex items-center gap-2 text-uni-muted">
                  <Target className="w-4 h-4" />
                  <span>النقاط: <span className="text-uni-text font-medium">{form.total_points} نقطة</span></span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-uni-muted">
                  <FileText className="w-4 h-4" />
                  <span>النوع: <span className="text-uni-text font-medium">{ASSESSMENT_TYPES.find(t => t.value === form.assessment_type)?.label}</span></span>
                </div>
                <div className="flex items-center gap-2 text-uni-muted">
                  <CheckCircle className="w-4 h-4" />
                  <span>عدد الأسئلة: <span className="text-uni-text font-medium">{questions.length} سؤال</span></span>
                </div>
                <div className="flex items-center gap-2 text-uni-muted">
                  <Target className="w-4 h-4" />
                  <span>درجة النجاح: <span className="text-uni-text font-medium">{form.passing_score} نقطة</span></span>
                </div>
              </div>
            </div>

            {/* Questions summary */}
            <div className="space-y-2 mb-6">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
                  <span className="badge-gold text-xs w-8 text-center">س{i + 1}</span>
                  <span className="text-sm text-uni-text flex-1 truncate">{q.content_ar || 'سؤال غير مكتمل'}</span>
                  <span className="text-xs text-uni-muted">{QUESTION_TYPES.find(t => t.value === q.question_type)?.label}</span>
                  <span className="text-xs badge-blue">{q.points} ن</span>
                </div>
              ))}
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-uni-gold/5 border border-uni-gold/20 mb-4">
              <button
                onClick={() => setPublish(!publish)}
                className={`w-12 h-6 rounded-full transition-all relative ${publish ? 'bg-uni-green' : 'bg-uni-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${publish ? 'right-1' : 'left-1'}`} />
              </button>
              <div>
                <div className="text-sm font-medium text-uni-text">نشر الاختبار فوراً</div>
                <div className="text-xs text-uni-muted">{publish ? 'سيكون مرئياً للطلاب' : 'سيُحفظ كمسودة'}</div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30 transition-all">
                <ChevronRight className="w-4 h-4" /> تعديل الأسئلة
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="btn-gold px-8 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : publish ? 'حفظ ونشر' : 'حفظ كمسودة'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
