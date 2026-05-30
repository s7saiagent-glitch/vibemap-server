'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, CheckCircle, XCircle, AlertCircle,
  Play, ChevronRight, ChevronLeft, Send, Award,
  BookOpen, Brain, Timer, AlertTriangle, Star, X
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI, assessmentAPI } from '@/lib/api'
import { useProctoring } from '@/lib/useProctoring'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionOption { text: string }

interface Question {
  id: number
  question_type: 'mcq' | 'true_false' | 'essay' | 'short_answer' | 'fill_blank' | 'coding'
  content: string
  content_ar?: string
  options?: QuestionOption[]
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  order_index: number
}

interface Assessment {
  id: number
  title: string
  title_ar?: string
  assessment_type: string
  total_points: number
  passing_score: number
  duration_minutes: number
  attempts_allowed: number
  start_datetime?: string
  end_datetime?: string
  question_count?: number
  weight_percent?: number
  questions?: Question[]
  _courseName?: string
  _sectionId?: number
}

interface QuestionDetail {
  question: string
  student_answer: string
  correct_answer?: string
  is_correct: boolean
  points_earned: number
  max_points: number
  ai_feedback?: string
  explanation?: string
}

interface GradeReport {
  submission_id: number
  assessment_title: string
  total_score: number
  max_score: number
  percentage: number
  letter_grade: string
  passed: boolean
  ai_feedback: string
  question_details: QuestionDetail[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  quiz: 'اختبار قصير', midterm: 'منتصف الفصل',
  final: 'اختبار نهائي', assignment: 'واجب',
  project: 'مشروع', coding_exam: 'اختبار برمجي', practical: 'عملي',
}

const TYPE_COLOR: Record<string, string> = {
  quiz: 'text-uni-blue border-uni-blue/40 bg-uni-blue/10',
  midterm: 'text-uni-gold border-uni-gold/40 bg-uni-gold/10',
  final: 'text-uni-red border-uni-red/40 bg-uni-red/10',
  assignment: 'text-uni-green border-uni-green/40 bg-uni-green/10',
  project: 'text-violet-400 border-violet-400/40 bg-violet-400/10',
  coding_exam: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10',
  practical: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
}

const DIFF_COLOR: Record<string, string> = {
  easy: 'text-uni-green', medium: 'text-uni-gold', hard: 'text-uni-red',
}
const DIFF_LABEL: Record<string, string> = {
  easy: 'سهل', medium: 'متوسط', hard: 'صعب',
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function ExamTimer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(interval); expireRef.current(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const isUrgent = remaining < 300

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold transition-all ${
      isUrgent ? 'border-uni-red/50 bg-uni-red/10 text-uni-red animate-pulse' : 'border-uni-border/40 bg-uni-card/50 text-uni-text'
    }`}>
      <Timer className="w-4 h-4" />
      {formatTime(remaining)}
    </div>
  )
}

// ─── Question View ────────────────────────────────────────────────────────────

function QuestionView({ question, index, answer, onAnswer }: {
  question: Question; index: number; answer: string; onAnswer: (v: string) => void
}) {
  const text = question.content_ar || question.content
  return (
    <motion.div key={question.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-uni-gold/10 border border-uni-gold/30 flex items-center justify-center flex-shrink-0 text-uni-gold text-sm font-black">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium ${DIFF_COLOR[question.difficulty]}`}>{DIFF_LABEL[question.difficulty]}</span>
            <span className="text-xs text-uni-muted">· {question.points} {question.points === 1 ? 'نقطة' : 'نقاط'}</span>
          </div>
          <p className="text-uni-text font-semibold leading-relaxed text-base">{text}</p>
        </div>
      </div>

      {question.question_type === 'mcq' && question.options && (
        <div className="space-y-2 pr-11">
          {question.options.map((opt, i) => (
            <button key={i} onClick={() => onAnswer(opt.text)}
              className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${
                answer === opt.text
                  ? 'border-uni-gold bg-uni-gold/10 text-uni-text font-semibold'
                  : 'border-uni-border/40 text-uni-muted hover:border-uni-border hover:text-uni-text hover:bg-uni-card/50'
              }`}>
              <span className="inline-flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answer === opt.text ? 'border-uni-gold' : 'border-uni-border/60'}`}>
                  {answer === opt.text && <span className="w-2.5 h-2.5 rounded-full bg-uni-gold" />}
                </span>
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'true_false' && (
        <div className="grid grid-cols-2 gap-3 pr-11">
          {[['صحيح', 'true'], ['خطأ', 'false']].map(([label, val], i) => (
            <button key={val} onClick={() => onAnswer(val)}
              className={`py-4 rounded-xl border font-bold text-sm transition-all ${
                answer === val
                  ? i === 0 ? 'border-uni-green bg-uni-green/10 text-uni-green' : 'border-uni-red bg-uni-red/10 text-uni-red'
                  : 'border-uni-border/40 text-uni-muted hover:border-uni-border hover:text-uni-text'
              }`}>
              {i === 0 ? '✓' : '✗'} {label}
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'essay' && (
        <div className="pr-11">
          <textarea value={answer} onChange={e => onAnswer(e.target.value)} rows={6} placeholder="اكتب إجابتك هنا..."
            className="w-full bg-uni-card border border-uni-border rounded-xl px-4 py-3 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors resize-none" />
          <p className="text-xs text-uni-muted mt-1">{answer.length} حرف</p>
        </div>
      )}

      {(question.question_type === 'short_answer' || question.question_type === 'fill_blank') && (
        <div className="pr-11">
          <input value={answer} onChange={e => onAnswer(e.target.value)}
            placeholder={question.question_type === 'fill_blank' ? 'أكمل الفراغ...' : 'إجابة قصيرة...'}
            className="w-full bg-uni-card border border-uni-border rounded-xl px-4 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors" />
        </div>
      )}

      {question.question_type === 'coding' && (
        <div className="pr-11">
          <textarea value={answer} onChange={e => onAnswer(e.target.value)} rows={10} placeholder="// اكتب الكود هنا..." dir="ltr"
            className="w-full bg-uni-dark border border-uni-border rounded-xl px-4 py-3 text-green-400 text-sm font-mono focus:border-uni-gold outline-none transition-colors resize-none" />
        </div>
      )}
    </motion.div>
  )
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsView({ report, onClose }: { report: GradeReport; onClose: () => void }) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={`card-uni text-center py-8 border-2 ${report.passed ? 'border-uni-green/40 bg-uni-green/5' : 'border-uni-red/40 bg-uni-red/5'}`}>
        <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${report.passed ? 'border-uni-green bg-uni-green/10' : 'border-uni-red bg-uni-red/10'}`}>
          {report.passed ? <CheckCircle className="w-10 h-10 text-uni-green" /> : <XCircle className="w-10 h-10 text-uni-red" />}
        </div>
        <div className={`text-5xl font-black mb-1 ${report.passed ? 'text-uni-green' : 'text-uni-red'}`}>{Math.round(report.percentage)}%</div>
        <div className={`text-2xl font-bold mb-2 ${report.passed ? 'text-uni-gold' : 'text-uni-muted'}`}>{report.letter_grade}</div>
        <p className="text-uni-muted text-sm">{report.total_score} من {report.max_score} نقطة</p>
        <div className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${report.passed ? 'bg-uni-green/10 text-uni-green border border-uni-green/30' : 'bg-uni-red/10 text-uni-red border border-uni-red/30'}`}>
          {report.passed ? <><CheckCircle className="w-4 h-4" /> اجتزت الاختبار</> : <><XCircle className="w-4 h-4" /> لم تجتز الاختبار</>}
        </div>
        {report.ai_feedback && (
          <div className="mt-4 p-3 rounded-xl bg-uni-card border border-uni-border/30 text-sm text-uni-text text-right max-w-md mx-auto">
            <Brain className="w-4 h-4 text-uni-gold inline ml-1" />{report.ai_feedback}
          </div>
        )}
      </motion.div>

      {report.question_details.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-uni-text flex items-center gap-2"><FileText className="w-4 h-4 text-uni-gold" /> تفاصيل الإجابات</h3>
          {report.question_details.map((detail, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`card-uni border-r-4 ${detail.is_correct ? 'border-r-uni-green' : 'border-r-uni-red'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-uni-text mb-2">{detail.question}</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-uni-muted">إجابتك: <span className="text-uni-text font-medium">{detail.student_answer || '—'}</span></p>
                    {detail.correct_answer && !detail.is_correct && (
                      <p className="text-uni-muted">الصحيحة: <span className="text-uni-green font-medium">{detail.correct_answer}</span></p>
                    )}
                    {detail.ai_feedback && <p className="text-uni-muted italic">{detail.ai_feedback}</p>}
                    {detail.explanation && <p className="text-uni-gold">{detail.explanation}</p>}
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  {detail.is_correct ? <CheckCircle className="w-5 h-5 text-uni-green" /> : <XCircle className="w-5 h-5 text-uni-red" />}
                  <div className="text-xs text-uni-muted mt-0.5">{detail.points_earned}/{detail.max_points}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <button onClick={onClose} className="btn-gold w-full py-3 rounded-xl font-bold text-uni-dark flex items-center justify-center gap-2">
        <BookOpen className="w-4 h-4" /> العودة إلى الاختبارات
      </button>
    </div>
  )
}

// ─── Exam Modal ───────────────────────────────────────────────────────────────

function ExamModal({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [phase, setPhase] = useState<'exam' | 'confirm' | 'results'>('exam')
  const [gradeReport, setGradeReport] = useState<GradeReport | null>(null)
  const startTime = useRef(Date.now())

  const questions: Question[] = assessment.questions || []
  const question = questions[currentQ]
  const answeredCount = Object.values(answers).filter(a => a.trim() !== '').length

  const submitMutation = useMutation({
    mutationFn: () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 60000)
      return assessmentAPI.submitAssessment(assessment.id, {
        answers: Object.entries(answers).map(([qId, answer]) => ({ question_id: parseInt(qId), answer })),
        time_spent_minutes: timeSpent,
      }).then(r => r.data)
    },
    onSuccess: async (submission: { id: number }) => {
      try {
        const res = await assessmentAPI.getResults(assessment.id, submission.id)
        setGradeReport(res.data)
        setPhase('results')
      } catch {
        toast.success('تم تسليم الاختبار بنجاح!')
        onClose()
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'فشل تسليم الاختبار'
      toast.error(msg)
      setPhase('exam')
    },
  })

  const handleTimeExpire = useCallback(() => {
    toast.error('انتهى الوقت! سيتم تسليم إجاباتك')
    submitMutation.mutate()
  }, [])

  if (phase === 'results' && gradeReport) {
    return (
      <div className="fixed inset-0 z-50 bg-uni-dark overflow-y-auto" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-black text-uni-text mb-6">نتيجة الاختبار</h2>
          <ResultsView report={gradeReport} onClose={onClose} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-uni-dark flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-uni-border/30 px-4 py-3 flex items-center gap-3 glass">
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-uni-text text-sm truncate">{assessment.title_ar || assessment.title}</h2>
          <div className="text-xs text-uni-muted">السؤال {currentQ + 1} من {questions.length} · {answeredCount} مجاب</div>
        </div>
        <ExamTimer totalSeconds={assessment.duration_minutes * 60} onExpire={handleTimeExpire} />
        <button onClick={() => { if (window.confirm('هل تريد الخروج؟ سيتم فقدان إجاباتك.')) onClose() }} className="text-uni-muted hover:text-uni-red transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="h-1 bg-uni-border/20 flex-shrink-0">
        <div className="h-full bg-gold-gradient transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {question && (
            <QuestionView key={question.id} question={question} index={currentQ}
              answer={answers[question.id] || ''} onAnswer={val => setAnswers(prev => ({ ...prev, [question.id]: val }))} />
          )}
        </AnimatePresence>

        {/* Question dots nav */}
        <div className="flex flex-wrap gap-2 mt-8 justify-center">
          {questions.map((q, i) => (
            <button key={q.id} onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                i === currentQ ? 'bg-uni-gold text-uni-dark'
                  : answers[q.id]?.trim() ? 'bg-uni-green/20 text-uni-green border border-uni-green/40'
                  : 'bg-uni-border/30 text-uni-muted hover:bg-uni-border/50'
              }`}>{i + 1}</button>
          ))}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 border-t border-uni-border/30 px-4 py-3 glass flex items-center gap-3">
        <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-uni-border/40 text-uni-muted text-sm hover:text-uni-text hover:border-uni-border transition-all disabled:opacity-30">
          <ChevronRight className="w-4 h-4" /> السابق
        </button>
        <div className="flex-1 text-center text-xs text-uni-muted">{answeredCount}/{questions.length}</div>
        {currentQ < questions.length - 1 ? (
          <button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-uni-card border border-uni-border/40 text-uni-text text-sm hover:border-uni-gold/40 transition-all">
            التالي <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => setPhase('confirm')} disabled={submitMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-uni-gold text-uni-dark text-sm font-bold hover:bg-uni-gold-light transition-all disabled:opacity-50">
            <Send className="w-4 h-4" /> تسليم
          </button>
        )}
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {phase === 'confirm' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-uni-card border border-uni-border rounded-2xl p-6 max-w-sm w-full text-center">
              <AlertTriangle className="w-12 h-12 text-uni-gold mx-auto mb-3" />
              <h3 className="text-lg font-black text-uni-text mb-2">تأكيد التسليم</h3>
              {answeredCount < questions.length && (
                <p className="text-uni-red text-sm mb-2 font-medium">{questions.length - answeredCount} سؤال لم تجب عليه</p>
              )}
              <p className="text-uni-muted text-sm mb-5">أجبت على {answeredCount} من {questions.length} سؤال. هل أنت متأكد؟</p>
              <div className="flex gap-3">
                <button onClick={() => setPhase('exam')} className="flex-1 py-2.5 rounded-xl border border-uni-border/40 text-uni-muted text-sm hover:text-uni-text transition-all">رجوع</button>
                <button onClick={() => { setPhase('exam'); submitMutation.mutate() }} disabled={submitMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-uni-gold text-uni-dark text-sm font-bold hover:bg-uni-gold-light transition-all disabled:opacity-50">
                  {submitMutation.isPending ? 'جاري التسليم...' : 'تسليم نهائي'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Assessment Card ──────────────────────────────────────────────────────────

function AssessmentCard({ assessment, courseName, onStart }: {
  assessment: Assessment; courseName: string; onStart: () => void
}) {
  const now = new Date()
  const end = assessment.end_datetime ? new Date(assessment.end_datetime) : null
  const start = assessment.start_datetime ? new Date(assessment.start_datetime) : null
  const isExpired = !!(end && end < now)
  const notStarted = !!(start && start > now)
  const canTake = !isExpired && !notStarted

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`card-uni transition-all ${canTake ? 'hover:border-uni-gold/30' : 'opacity-70'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-uni-card border border-uni-border/40 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-uni-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-uni-text text-sm leading-tight mb-1">{assessment.title_ar || assessment.title}</h3>
          <p className="text-xs text-uni-muted truncate">{courseName}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ${TYPE_COLOR[assessment.assessment_type] || TYPE_COLOR.quiz}`}>
          {TYPE_LABEL[assessment.assessment_type] || assessment.assessment_type}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-uni-muted mb-3">
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {assessment.duration_minutes} د</div>
        <div className="flex items-center gap-1"><Star className="w-3 h-3" /> {assessment.total_points} نقطة</div>
        <div className="flex items-center gap-1"><Award className="w-3 h-3" /> {assessment.passing_score}%</div>
      </div>

      {assessment.question_count !== undefined && (
        <p className="text-xs text-uni-muted mb-3">{assessment.question_count} سؤال · {assessment.weight_percent}% من الدرجة</p>
      )}

      {end && (
        <p className={`text-xs mb-3 ${isExpired ? 'text-uni-red' : 'text-uni-muted'}`}>
          {isExpired ? '⚠ انتهى في ' : '⏰ ينتهي في '}
          {end.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      <button onClick={onStart} disabled={!canTake}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
          isExpired ? 'bg-uni-border/20 text-uni-muted cursor-not-allowed'
            : notStarted ? 'bg-uni-border/20 text-uni-muted cursor-not-allowed'
            : 'bg-uni-gold text-uni-dark hover:bg-uni-gold-light'
        }`}>
        {isExpired ? <><XCircle className="w-4 h-4" /> انتهى الوقت</>
          : notStarted ? <><Clock className="w-4 h-4" /> لم يبدأ بعد</>
          : <><Play className="w-4 h-4" /> ابدأ الاختبار</>}
      </button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssessmentsPage() {
  const [activeExam, setActiveExam] = useState<Assessment | null>(null)
  const [loadingExamId, setLoadingExamId] = useState<number | null>(null)
  const [violations, setViolations] = useState(0)
  const [proctoringWarning, setProctoringWarning] = useState('')
  const isTestActive = !!activeExam

  useProctoring({
    enabled: isTestActive,
    onViolation: (type, count) => {
      setViolations(count)
      const messages: Record<string, string> = {
        tab_switch: 'تحذير: لا تغادر صفحة الاختبار!',
        copy: 'تحذير: النسخ غير مسموح أثناء الاختبار!',
        paste: 'تحذير: اللصق غير مسموح أثناء الاختبار!',
        right_click: 'تحذير: النقر الأيمن غير مسموح أثناء الاختبار!',
        devtools: 'تحذير: لا يُسمح بفتح أدوات المطور!',
      }
      setProctoringWarning(messages[type] || 'تحذير: سلوك مشبوه اكتُشف!')
      setTimeout(() => setProctoringWarning(''), 3000)
    },
  })

  const { data: myCoursesData } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => studentAPI.getMyCourses().then(r => r.data),
  })

  const courses: Record<string, unknown>[] = myCoursesData?.courses || []
  const sectionIds: number[] = Array.from(new Set(
    courses.map(c => c.section_id as number).filter(Boolean)
  ))

  const { data: allAssessments, isLoading } = useQuery({
    queryKey: ['all-assessments', sectionIds.join(',')],
    queryFn: async () => {
      if (!sectionIds.length) return []
      const results = await Promise.all(
        sectionIds.map(id =>
          assessmentAPI.getSectionAssessments(id)
            .then(r => (r.data as Assessment[]).map(a => ({
              ...a,
              _sectionId: id,
              _courseName: (courses.find(c => c.section_id === id))?.course_name as string || '',
            })))
            .catch(() => [])
        )
      )
      return results.flat() as Assessment[]
    },
    enabled: sectionIds.length > 0,
  })

  const assessments: Assessment[] = allAssessments || []
  const now = new Date()
  const upcoming = assessments.filter(a => !a.end_datetime || new Date(a.end_datetime) > now)
  const past = assessments.filter(a => a.end_datetime && new Date(a.end_datetime) <= now)

  const handleStartExam = async (a: Assessment) => {
    setLoadingExamId(a.id)
    try {
      const res = await assessmentAPI.getAssessment(a.id)
      setActiveExam({ ...res.data, _courseName: a._courseName })
    } catch {
      toast.error('فشل تحميل الاختبار')
    } finally {
      setLoadingExamId(null)
    }
  }

  return (
    <>
      {proctoringWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-uni-red text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 animate-pulse">
          ⚠️ {proctoringWarning}
        </div>
      )}
      {violations >= 3 && isTestActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-uni-red/90 text-white px-6 py-3 rounded-xl shadow-2xl text-sm text-center max-w-sm">
          <div className="font-bold mb-1">⛔ تحذير أخير</div>
          <div>تم تسجيل {violations} مخالفات. سيتم إرسال تقرير للأستاذ عند الإنهاء.</div>
        </div>
      )}
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl">
          <div>
            <h1 className="text-2xl font-black text-uni-text">الاختبارات والواجبات</h1>
            <p className="text-uni-muted text-sm mt-1">جميع اختباراتك عبر موادك المسجلة</p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-52 glass rounded-2xl shimmer" />)}
            </div>
          ) : assessments.length === 0 ? (
            <div className="card-uni text-center py-16">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-uni-green opacity-50" />
              <h3 className="text-xl font-bold text-uni-text mb-2">لا توجد اختبارات متاحة</h3>
              <p className="text-uni-muted text-sm">
                {courses.length === 0 ? 'سجّل في مواد أولاً لتظهر اختباراتها هنا' : 'لا توجد اختبارات منشورة في موادك حالياً'}
              </p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div>
                  <h2 className="font-bold text-uni-text mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-uni-gold" /> اختبارات متاحة ({upcoming.length})
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {upcoming.map(a => (
                      <AssessmentCard key={a.id} assessment={a} courseName={a._courseName || ''} onStart={() => handleStartExam(a)} />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="font-bold text-uni-text mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-uni-muted" /> اختبارات منتهية ({past.length})
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4 opacity-70">
                    {past.map(a => (
                      <AssessmentCard key={a.id} assessment={a} courseName={a._courseName || ''} onStart={() => {}} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>

      {loadingExamId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-uni-card rounded-2xl p-6 flex items-center gap-3 border border-uni-border">
            <Brain className="w-6 h-6 text-uni-gold animate-pulse" />
            <span className="text-uni-text font-medium">جاري تحميل الاختبار...</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeExam && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ExamModal assessment={activeExam} onClose={() => setActiveExam(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
