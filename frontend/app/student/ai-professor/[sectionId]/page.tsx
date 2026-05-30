'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Send, Brain, MessageSquare, Zap, FileQuestion,
  BookOpen, Loader2, Copy, Lightbulb, X,
  CheckCircle, XCircle, Trophy, RefreshCw, BookMarked
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { aiProfessorAPI, studentAPI } from '@/lib/api'

const QUICK_ACTIONS = [
  { icon: BookOpen, label: 'اشرح لي المفهوم', prompt: 'شرح مفصل للمفهوم الأساسي في هذه المادة', isQuiz: false },
  { icon: FileQuestion, label: 'اختبرني', prompt: '', isQuiz: true },
  { icon: Zap, label: 'لخص الدرس', prompt: 'لخص أهم نقاط الدرس بشكل موجز ومنظم', isQuiz: false },
  { icon: Lightbulb, label: 'أمثلة عملية', prompt: 'أعطني أمثلة عملية من الواقع للمفاهيم المدروسة', isQuiz: false },
]

type QuizQuestion = {
  question: string
  options: string[]
  correct_answer: string
  explanation?: string
  difficulty?: string
}

type QuizState = {
  questions: QuizQuestion[]
  answers: Record<number, string>
  submitted: boolean
  score: number
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="w-9 h-9 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center flex-shrink-0">
        <Brain className="w-4 h-4 text-uni-blue" />
      </div>
      <div className="chat-ai px-4 py-3 max-w-[200px]">
        <div className="flex gap-1.5 items-center">
          <span className="text-xs text-uni-muted me-1">يكتب</span>
          {[0, 1, 2].map(i => (
            <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ role, content, suggestedTopics }: {
  role: 'user' | 'assistant'
  content: string
  suggestedTopics?: string[]
}) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        role === 'user'
          ? 'bg-uni-gold/20 border border-uni-gold/30'
          : 'bg-uni-blue/20 border border-uni-blue/30'
      }`}>
        {role === 'user' ? (
          <span className="text-sm font-bold text-uni-gold">أ</span>
        ) : (
          <Brain className="w-4 h-4 text-uni-blue" />
        )}
      </div>

      <div className="flex flex-col gap-2 max-w-[75%]">
        <div className={`px-4 py-3 text-sm leading-relaxed relative group ${role === 'user' ? 'chat-user' : 'chat-ai'}`}>
          {role === 'assistant' ? (
            <div className="markdown-body prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-uni-text">{content}</p>
          )}
          <button
            onClick={copy}
            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-uni-subtle hover:text-uni-text p-1 rounded"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>

        {role === 'assistant' && suggestedTopics && suggestedTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestedTopics.map((topic, i) => (
              <span key={i} className="badge-blue text-xs cursor-pointer hover:bg-uni-blue/20 transition-colors">
                🔗 {topic}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function QuizCard({ quiz, onClose, onRetry }: {
  quiz: QuizState
  onClose: () => void
  onRetry: () => void
}) {
  const [localAnswers, setLocalAnswers] = useState<Record<number, string>>(quiz.answers)
  const [submitted, setSubmitted] = useState(quiz.submitted)
  const [score, setScore] = useState(quiz.score)

  const handleSubmit = () => {
    let correct = 0
    quiz.questions.forEach((q, i) => {
      if (localAnswers[i] === q.correct_answer) correct++
    })
    setScore(correct)
    setSubmitted(true)
  }

  const pct = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="chat-ai p-4 max-w-[90%]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-uni-blue" />
          </div>
          <div>
            <div className="text-sm font-bold text-uni-text">اختبر معلوماتك</div>
            <div className="text-xs text-uni-muted">{quiz.questions.length} أسئلة</div>
          </div>
        </div>
        <button onClick={onClose} className="text-uni-muted hover:text-uni-red transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Score (after submit) */}
      {submitted && (
        <div className={`rounded-xl p-3 mb-4 text-center ${pct >= 70 ? 'bg-uni-green/10 border border-uni-green/20' : 'bg-uni-red/10 border border-uni-red/20'}`}>
          <div className={`text-2xl font-black ${pct >= 70 ? 'text-uni-green' : 'text-uni-red'}`}>
            {score}/{quiz.questions.length}
          </div>
          <div className={`text-sm font-medium mt-0.5 ${pct >= 70 ? 'text-uni-green' : 'text-uni-red'}`}>
            {pct}% · {pct >= 90 ? 'ممتاز!' : pct >= 70 ? 'جيد!' : pct >= 50 ? 'تحتاج للمراجعة' : 'راجع المادة'}
          </div>
          {pct >= 70 && <Trophy className="w-5 h-5 text-uni-gold mx-auto mt-1" />}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {quiz.questions.map((q, qi) => {
          const selected = localAnswers[qi]
          const isCorrect = selected === q.correct_answer
          return (
            <div key={qi} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="badge-gold text-xs flex-shrink-0 mt-0.5">{qi + 1}</span>
                <p className="text-sm text-uni-text leading-relaxed">{q.question}</p>
              </div>
              <div className="space-y-1.5 pr-6">
                {q.options.map((opt, oi) => {
                  let cls = 'border border-uni-border/30 bg-uni-card/50 text-uni-muted hover:border-uni-gold/30 hover:text-uni-text'
                  if (submitted) {
                    if (opt === q.correct_answer) cls = 'border border-uni-green/40 bg-uni-green/10 text-uni-green'
                    else if (opt === selected && !isCorrect) cls = 'border border-uni-red/40 bg-uni-red/10 text-uni-red line-through'
                  } else if (selected === opt) {
                    cls = 'border border-uni-gold/40 bg-uni-gold/10 text-uni-gold'
                  }
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setLocalAnswers(prev => ({ ...prev, [qi]: opt }))}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs transition-all ${cls}`}
                    >
                      <span className="font-mono text-uni-muted ml-1">{String.fromCharCode(65 + oi)}.</span> {opt}
                    </button>
                  )
                })}
              </div>
              {submitted && q.explanation && (
                <div className="pr-6">
                  <div className="text-xs text-uni-muted bg-uni-blue/5 border border-uni-blue/20 rounded-lg px-3 py-2">
                    💡 {q.explanation}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(localAnswers).length < quiz.questions.length}
            className="flex-1 btn-gold py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            تسليم الإجابات
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> اختبار جديد
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function AIProfessorChatPage() {
  const params = useParams()
  const sectionId = parseInt(params.sectionId as string)
  const [message, setMessage] = useState('')
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant' | 'quiz'
    content: string
    suggestedTopics?: string[]
    quiz?: QuizState
  }>>([])
  const [conversationId, setConversationId] = useState<number | undefined>()
  const [isTyping, setIsTyping] = useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'materials'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: professor } = useQuery({
    queryKey: ['professor', sectionId],
    queryFn: () => aiProfessorAPI.getSectionProfessor(sectionId).then(r => r.data),
  })

  const { data: materials } = useQuery({
    queryKey: ['materials', sectionId],
    queryFn: () => studentAPI.getSectionMaterials(sectionId).then(r => r.data),
    enabled: activeTab === 'materials',
  })

  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      aiProfessorAPI.chat({
        section_id: sectionId,
        message: msg,
        conversation_id: conversationId,
        language: 'ar',
      }).then(r => r.data),
    onSuccess: (data) => {
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id)
      }
      setLocalMessages(prev => [...prev, {
        id: String(data.message_id),
        role: 'assistant',
        content: data.response,
        suggestedTopics: data.suggested_topics,
      }])
      setIsTyping(false)
    },
    onError: () => {
      setIsTyping(false)
      setLocalMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
      }])
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, isTyping])

  const sendMessage = useCallback(async (msg: string) => {
    if (!msg.trim()) return
    setMessage('')
    setLocalMessages(prev => [...prev, { id: 'user-' + Date.now(), role: 'user', content: msg }])
    setIsTyping(true)
    chatMutation.mutate(msg)
  }, [chatMutation])

  const handleQuizAction = async () => {
    setIsGeneratingQuiz(true)
    setLocalMessages(prev => [...prev, {
      id: 'user-quiz-' + Date.now(),
      role: 'user',
      content: 'اختبرني في هذه المادة',
    }])
    try {
      const res = await aiProfessorAPI.generateQuiz({
        section_id: sectionId,
        num_questions: 5,
        difficulty: 'medium',
        topic: 'المفاهيم الأساسية للمادة',
      })
      const quizData = res.data
      const questions: QuizQuestion[] = (quizData.questions || []).map((q: Record<string, unknown>) => {
        const opts = (q.options as string[]) || []
        // Backend returns `correct` as a letter (e.g. "أ"), find matching full option
        const correctLetter = (q.correct as string) || (q.correct_answer as string) || ''
        const correctFull = opts.find(o => o.startsWith(correctLetter)) || correctLetter
        return {
          question: (q.question as string) || (q.content as string) || '',
          options: opts,
          correct_answer: correctFull,
          explanation: q.explanation as string,
          difficulty: q.difficulty as string,
        }
      })
      if (questions.length > 0) {
        setLocalMessages(prev => [...prev, {
          id: 'quiz-' + Date.now(),
          role: 'quiz',
          content: '',
          quiz: { questions, answers: {}, submitted: false, score: 0 },
        }])
      } else {
        setLocalMessages(prev => [...prev, {
          id: 'quiz-err-' + Date.now(),
          role: 'assistant',
          content: 'تعذّر توليد الاختبار، جرّب مرة أخرى.',
        }])
      }
    } catch {
      setLocalMessages(prev => [...prev, {
        id: 'quiz-fail-' + Date.now(),
        role: 'assistant',
        content: 'عذراً، لم أتمكن من إنشاء الاختبار. تأكد من وجود أستاذ ذكاء اصطناعي مرتبط بهذه المادة.',
      }])
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(message)
    }
  }

  const materialList = Array.isArray(materials) ? materials : []

  const MATERIAL_ICONS: Record<string, string> = {
    pdf: '📄', video: '🎬', link: '🔗', note: '📝', flashcard: '🃏', presentation: '📊', code: '💻',
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-4">
        {/* Sidebar Info */}
        <div className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">
          {/* Professor Card */}
          <div className="card-uni border-uni-blue/20 bg-uni-blue/5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-uni-blue/20 border-2 border-uni-blue/40 flex items-center justify-center mx-auto mb-3 animate-glow-pulse">
                <Brain className="w-8 h-8 text-uni-blue" />
              </div>
              <div className="font-bold text-uni-text">{professor?.name_ar || 'الأستاذ الذكي'}</div>
              <div className="text-xs text-uni-muted mt-1">{professor?.teaching_style || 'تفاعلي'}</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-xs ${i < Math.round(professor?.avg_rating || 5) ? 'text-uni-gold' : 'text-uni-border'}`}>★</span>
                ))}
                <span className="text-xs text-uni-muted mr-1">{professor?.avg_rating || 5.0}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-uni">
            <h3 className="text-sm font-bold text-uni-text mb-3">إجراءات سريعة</h3>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.isQuiz ? handleQuizAction() : sendMessage(action.prompt)}
                  disabled={isGeneratingQuiz && action.isQuiz}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg text-right hover:bg-uni-gold/10 border border-transparent hover:border-uni-gold/20 transition-all text-sm text-uni-muted hover:text-uni-text disabled:opacity-50"
                >
                  {isGeneratingQuiz && action.isQuiz ? (
                    <Loader2 className="w-4 h-4 text-uni-gold flex-shrink-0 animate-spin" />
                  ) : (
                    <action.icon className="w-4 h-4 text-uni-gold flex-shrink-0" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="card-uni text-center">
            <MessageSquare className="w-6 h-6 text-uni-gold mx-auto mb-1" />
            <div className="text-xl font-black text-gold-gradient">{professor?.total_conversations || 0}</div>
            <div className="text-xs text-uni-muted">محادثة أكاديمية</div>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col glass rounded-2xl border border-uni-border/30 overflow-hidden">
          {/* Header with tabs */}
          <div className="px-5 py-3 border-b border-uni-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                <Brain className="w-4 h-4 text-uni-blue animate-pulse" />
              </div>
              <div>
                <div className="font-semibold text-uni-text text-sm">{professor?.name_ar || 'الأستاذ الذكي'}</div>
                <div className="text-xs text-uni-green">● متاح الآن</div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-uni-card rounded-xl p-1 border border-uni-border/30">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'chat' ? 'bg-uni-gold text-uni-dark' : 'text-uni-muted hover:text-uni-text'}`}
              >
                <Brain className="w-3.5 h-3.5" /> المحادثة
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'materials' ? 'bg-uni-gold text-uni-dark' : 'text-uni-muted hover:text-uni-text'}`}
              >
                <BookMarked className="w-3.5 h-3.5" /> المواد
              </button>
            </div>
          </div>

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {localMessages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-uni-blue/10 border-2 border-uni-blue/30 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-10 h-10 text-uni-blue" />
                    </div>
                    <h3 className="text-xl font-bold text-uni-text mb-2">
                      مرحباً! أنا {professor?.name_ar || 'أستاذك الذكي'}
                    </h3>
                    <p className="text-uni-muted text-sm max-w-md mx-auto">
                      يسعدني مساعدتك في فهم المادة. اسألني أي سؤال، أو اضغط "اختبرني" لاختبار مستوى فهمك.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {QUICK_ACTIONS.map((a, i) => (
                        <button
                          key={i}
                          onClick={() => a.isQuiz ? handleQuizAction() : sendMessage(a.prompt)}
                          className="badge-blue text-xs py-1.5 px-3 cursor-pointer hover:bg-uni-blue/20 transition-colors"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {localMessages.map((msg) => {
                  if (msg.role === 'quiz' && msg.quiz) {
                    return (
                      <div key={msg.id} className="flex items-end gap-3">
                        <div className="w-9 h-9 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-uni-blue" />
                        </div>
                        <QuizCard
                          quiz={msg.quiz}
                          onClose={() => setLocalMessages(prev => prev.filter(m => m.id !== msg.id))}
                          onRetry={handleQuizAction}
                        />
                      </div>
                    )
                  }
                  return (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role as 'user' | 'assistant'}
                      content={msg.content}
                      suggestedTopics={msg.suggestedTopics}
                    />
                  )
                })}

                {(isTyping || isGeneratingQuiz) && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-uni-border/30">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="اكتب سؤالك هنا... (Enter للإرسال)"
                      rows={1}
                      className="input-uni w-full px-4 py-3 rounded-xl text-sm resize-none max-h-32 overflow-y-auto"
                      style={{ minHeight: '48px' }}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage(message)}
                    disabled={!message.trim() || isTyping}
                    className="btn-gold w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTyping ? (
                      <Loader2 className="w-5 h-5 animate-spin text-uni-dark" />
                    ) : (
                      <Send className="w-5 h-5 text-uni-dark" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-uni-subtle mt-2 text-center">
                  الأستاذ الذكي يعمل بنماذج Claude · للأغراض التعليمية فقط
                </p>
              </div>
            </>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="flex-1 overflow-y-auto p-5">
              {materialList.length === 0 ? (
                <div className="text-center py-16">
                  <BookMarked className="w-12 h-12 text-uni-muted mx-auto mb-3" />
                  <p className="text-uni-muted">لا توجد مواد دراسية بعد</p>
                  <p className="text-xs text-uni-muted mt-1">سيضيف الأستاذ المواد قريباً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materialList.map((m: Record<string, unknown>, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-uni-card/50 border border-uni-border/30 hover:border-uni-gold/20 transition-all"
                    >
                      <span className="text-2xl flex-shrink-0">{MATERIAL_ICONS[m.material_type as string] || '📚'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-uni-text text-sm">{m.title as string}</div>
                        {!!(m.description) && <p className="text-xs text-uni-muted mt-0.5 line-clamp-2">{m.description as string}</p>}
                        {!!(m.content) && <p className="text-xs text-uni-muted mt-1 line-clamp-3 whitespace-pre-wrap">{m.content as string}</p>}
                        {!!(m.file_url) && (
                          <a
                            href={m.file_url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-uni-blue hover:underline"
                          >
                            📎 فتح الملف
                          </a>
                        )}
                      </div>
                      <span className="badge-gold text-xs flex-shrink-0">{m.material_type as string}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
