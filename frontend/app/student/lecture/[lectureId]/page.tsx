'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ChevronRight, CheckCircle, Clock, BookOpen,
  Target, Lightbulb, StickyNote, Save, Brain, Star, ArrowRight
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

export default function LectureViewerPage() {
  const params = useParams()
  const router = useRouter()
  const lectureId = parseInt(params.lectureId as string)
  const [activeTab, setActiveTab] = useState<'content' | 'objectives' | 'notes' | 'materials'>('content')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const startTime = useRef(Date.now())

  const { data: lecture, isLoading } = useQuery({
    queryKey: ['lecture', lectureId],
    queryFn: () => studentAPI.getLecture(lectureId).then(r => r.data),
  })

  const progressMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => studentAPI.saveLectureProgress(lectureId, params),
  })

  useEffect(() => {
    if (lecture) {
      setNotes(lecture.notes || '')
      setCompleted(lecture.completed || false)
      setReadProgress(lecture.progress_percent || 0)
    }
  }, [lecture])

  // Track scroll progress
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const onScroll = () => {
      const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
      setReadProgress(p => Math.max(p, Math.min(100, pct || 0)))
      if (pct >= 80) setShowComplete(true)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [lecture])

  const saveNotes = () => {
    const timeSpent = Math.round((Date.now() - startTime.current) / 60000)
    progressMutation.mutate({ notes, progress_percent: readProgress, time_spent_minutes: timeSpent })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const markComplete = () => {
    const timeSpent = Math.round((Date.now() - startTime.current) / 60000)
    progressMutation.mutate({
      completed: true,
      progress_percent: 100,
      time_spent_minutes: timeSpent,
      notes,
    })
    setCompleted(true)
    setReadProgress(100)
    // Award points via API
    studentAPI.awardPoints(10, 'أكملت محاضرة', 'lecture').catch(() => {})
  }

  const MATERIAL_ICONS: Record<string, string> = {
    pdf: '📄', video: '🎬', link: '🔗', note: '📝', presentation: '📊', code: '💻',
  }

  // suppress unused import warning
  void Star

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl shimmer" />)}
        </div>
      </DashboardLayout>
    )
  }

  if (!lecture) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-uni-muted">المحاضرة غير موجودة</p>
          <button onClick={() => router.back()} className="mt-4 btn-gold px-6 py-2 rounded-xl text-sm">رجوع</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-uni-muted hover:text-uni-gold text-sm mb-2 transition-colors"
            >
              <ChevronRight className="w-4 h-4" /> العودة للمواد
            </button>
            <h1 className="text-xl font-black text-uni-text">{lecture.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-uni-muted">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lecture.duration_minutes} دقيقة</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {lecture.view_count} مشاهدة</span>
              {completed && <span className="flex items-center gap-1 text-uni-green"><CheckCircle className="w-3.5 h-3.5" /> مكتملة</span>}
            </div>
          </div>
          {completed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-uni-green/10 border border-uni-green/30 text-uni-green text-sm font-bold flex-shrink-0">
              <CheckCircle className="w-4 h-4" /> مكتملة
            </div>
          ) : showComplete ? (
            <button
              onClick={markComplete}
              className="flex items-center gap-2 btn-gold px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
            >
              <CheckCircle className="w-4 h-4" /> أكمل المحاضرة (+10 نقطة)
            </button>
          ) : null}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-uni-border/30 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${readProgress}%` }}
            className="h-full bg-gradient-to-l from-uni-gold to-amber-500 rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-uni-card/50 rounded-xl p-1 border border-uni-border/30 w-fit">
          {([
            { key: 'content', label: 'المحتوى', icon: BookOpen },
            { key: 'objectives', label: 'الأهداف', icon: Target },
            { key: 'notes', label: 'ملاحظاتي', icon: StickyNote },
            { key: 'materials', label: 'المواد', icon: Lightbulb },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-uni-gold text-uni-dark' : 'text-uni-muted hover:text-uni-text'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <AnimatePresence mode="wait">
          {activeTab === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card-uni"
            >
              {lecture.key_concepts && lecture.key_concepts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-uni-border/30">
                  {lecture.key_concepts.map((c: string, i: number) => (
                    <span key={i} className="badge-blue text-xs">{c}</span>
                  ))}
                </div>
              )}
              <div ref={contentRef} className="max-h-[60vh] overflow-y-auto pr-1">
                {lecture.content ? (
                  <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{lecture.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-uni-muted mx-auto mb-3" />
                    <p className="text-uni-muted text-sm">لا يوجد محتوى لهذه المحاضرة بعد</p>
                    <p className="text-xs text-uni-muted mt-1">يمكنك التحدث مع الأستاذ الذكي للحصول على شرح المادة</p>
                  </div>
                )}
              </div>
              {lecture.summary && (
                <div className="mt-4 p-4 rounded-xl bg-uni-blue/5 border border-uni-blue/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-uni-blue" />
                    <span className="text-xs font-bold text-uni-blue">ملخص ذكي</span>
                  </div>
                  <p className="text-xs text-uni-muted leading-relaxed">{lecture.summary}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'objectives' && (
            <motion.div
              key="objectives"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card-uni space-y-3"
            >
              <h3 className="font-bold text-uni-text flex items-center gap-2">
                <Target className="w-4 h-4 text-uni-gold" /> أهداف المحاضرة
              </h3>
              {lecture.learning_objectives && lecture.learning_objectives.length > 0 ? (
                <div className="space-y-2">
                  {lecture.learning_objectives.map((obj: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
                      <div className="w-6 h-6 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-uni-gold">{i + 1}</div>
                      <p className="text-sm text-uni-text">{obj}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-uni-muted text-sm">لم تُحدد أهداف لهذه المحاضرة</p>
              )}
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card-uni"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-uni-text flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-uni-gold" /> ملاحظاتي الشخصية
                </h3>
                <button
                  onClick={saveNotes}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${notesSaved ? 'bg-uni-green/10 text-uni-green border border-uni-green/30' : 'btn-gold'}`}
                >
                  {notesSaved ? <><CheckCircle className="w-3 h-3" /> محفوظ</> : <><Save className="w-3 h-3" /> حفظ</>}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={10}
                placeholder="اكتب ملاحظاتك هنا... سيتم حفظها تلقائياً"
                className="w-full bg-uni-dark border border-uni-border/30 rounded-xl px-4 py-3 text-uni-text text-sm focus:border-uni-gold outline-none resize-none leading-relaxed"
              />
            </motion.div>
          )}

          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card-uni"
            >
              <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-uni-gold" /> مصادر إضافية
              </h3>
              {lecture.materials && lecture.materials.length > 0 ? (
                <div className="space-y-3">
                  {lecture.materials.map((m: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30 hover:border-uni-gold/20 transition-all">
                      <span className="text-2xl">{MATERIAL_ICONS[m.material_type as string] || '📚'}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-uni-text">{m.title as string}</div>
                        {!!(m.description) && <p className="text-xs text-uni-muted mt-0.5">{m.description as string}</p>}
                      </div>
                      {!!(m.file_url) && (
                        <a href={m.file_url as string} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-uni-blue hover:underline flex items-center gap-1">
                          فتح <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-uni-muted text-sm text-center py-6">لا توجد مواد إضافية</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {lecture.section_id && (
          <div className="flex justify-between gap-3">
            <button
              onClick={() => router.push(`/student/ai-professor/${lecture.section_id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-blue/40 hover:text-uni-blue transition-all"
            >
              <Brain className="w-4 h-4" /> اسأل الأستاذ الذكي
            </button>
            {!completed && (
              <button
                onClick={markComplete}
                className="flex items-center gap-2 btn-gold px-6 py-2 rounded-xl text-sm font-bold"
              >
                <CheckCircle className="w-4 h-4" /> إكمال المحاضرة
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
