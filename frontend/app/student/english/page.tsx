'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Languages, Send, Loader2, Star, CheckCircle, Award, Download, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { englishAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  A1: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  A2: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  B1: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  B2: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  C1: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  C2: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
}

const LEVEL_NAMES: Record<string, string> = {
  A1: 'مبتدئ', A2: 'أساسي', B1: 'متوسط',
  B2: 'فوق المتوسط', C1: 'متقدم', C2: 'إتقان تام',
}

const PLACEMENT_QUESTIONS = [
  { q: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Rome'], correct: 1 },
  { q: 'Choose the correct sentence:', options: ['She go to school', 'She goes to school', 'She going to school', 'She gone to school'], correct: 1 },
  { q: 'What does "enormous" mean?', options: ['Very small', 'Very fast', 'Very large', 'Very slow'], correct: 2 },
  { q: 'Choose the correct past tense: "I ___ a movie last night"', options: ['watch', 'watched', 'watching', 'watches'], correct: 1 },
  { q: 'Which word is a synonym of "happy"?', options: ['Sad', 'Angry', 'Joyful', 'Tired'], correct: 2 },
  { q: '"Despite the rain, they ___ the match." Choose correctly:', options: ['win', 'won', 'winning', 'to win'], correct: 1 },
  { q: 'What is the subjunctive mood? "I suggest that he ___ on time."', options: ['is', 'be', 'was', 'were'], correct: 1 },
  { q: 'Choose the most formal expression:', options: ['Gonna', 'Going to', 'Will be going to', 'Intended to proceed'], correct: 3 },
]

function getLevelFromScore(score: number): string {
  if (score <= 2) return 'A1'
  if (score <= 4) return 'A2'
  if (score <= 5) return 'B1'
  if (score <= 6) return 'B2'
  if (score <= 7) return 'C1'
  return 'C2'
}

function generateCertificate(userName: string, level: string, levelName: string) {
  const date = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>شهادة اللغة الإنجليزية - ${level}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo', sans-serif; background: #fff; }
  .cert { width: 800px; margin: 40px auto; padding: 60px; border: 4px solid #D4AF37; border-radius: 20px; position: relative; text-align: center; background: linear-gradient(135deg, #0a0e1a 0%, #111827 100%); color: #E2E8F0; }
  .cert::before { content: ''; position: absolute; inset: 10px; border: 1px solid #D4AF37; border-radius: 15px; opacity: 0.4; pointer-events: none; }
  .logo { font-size: 48px; margin-bottom: 10px; }
  .uni-name { font-size: 22px; font-weight: 900; color: #D4AF37; margin-bottom: 30px; }
  .cert-title { font-size: 32px; font-weight: 900; color: #fff; margin-bottom: 20px; }
  .issued-to { font-size: 16px; color: #9CA3AF; margin-bottom: 10px; }
  .student-name { font-size: 36px; font-weight: 900; color: #D4AF37; margin-bottom: 20px; border-bottom: 2px solid #D4AF37; padding-bottom: 15px; display: inline-block; }
  .level-badge { display: inline-block; font-size: 48px; font-weight: 900; color: #D4AF37; border: 3px solid #D4AF37; border-radius: 50%; width: 100px; height: 100px; line-height: 94px; margin: 20px auto; }
  .level-name { font-size: 20px; font-weight: 700; color: #E2E8F0; margin-bottom: 10px; }
  .desc { font-size: 14px; color: #9CA3AF; margin-bottom: 30px; line-height: 1.8; }
  .date { font-size: 14px; color: #9CA3AF; border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px; }
  .seal { font-size: 64px; margin-top: 20px; }
  @media print { body { background: white; } }
</style>
</head>
<body>
<div class="cert">
  <div class="logo">🎓</div>
  <div class="uni-name">جامعة مملكة الأرض الافتراضية<br><small style="font-size:14px;font-weight:400">Virtual Earth Kingdom University</small></div>
  <div class="cert-title">شهادة إتقان اللغة الإنجليزية</div>
  <div class="issued-to">تُمنح هذه الشهادة لـ</div>
  <div class="student-name">${userName}</div>
  <div class="level-badge">${level}</div>
  <div class="level-name">${levelName}</div>
  <div class="desc">لإتمام متطلبات برنامج اللغة الإنجليزية بمستوى ${level} - ${levelName}<br>وفق إطار CEFR الأوروبي للغات</div>
  <div class="date">تاريخ الإصدار: ${date}</div>
  <div class="seal">🏅</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

export default function EnglishProgramPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'levels'>('overview')
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('B1')
  const [showPlacementTest, setShowPlacementTest] = useState(false)
  const [testAnswers, setTestAnswers] = useState<number[]>([])
  const [testResult, setTestResult] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [unlockedLevels, setUnlockedLevels] = useState<string[]>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  const { data: progress } = useQuery({
    queryKey: ['english-progress'],
    queryFn: () => englishAPI.getProgress().then(r => r.data),
    retry: false,
  })

  const { data: courses } = useQuery({
    queryKey: ['english-courses'],
    queryFn: () => englishAPI.getCourses().then(r => r.data),
    retry: false,
  })

  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      englishAPI.chat(msg, selectedLevel, chatHistory.map(m => ({ role: m.role, content: m.content }))).then(r => r.data),
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }])
      setIsTyping(false)
    },
    onError: () => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't process your message. Please try again! 😊" }])
      setIsTyping(false)
    },
  })

  const sendMessage = () => {
    if (!message.trim()) return
    setChatHistory(prev => [...prev, { role: 'user', content: message }])
    setIsTyping(true)
    chatMutation.mutate(message)
    setMessage('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isTyping])

  const handlePlacementAnswer = (answerIdx: number) => {
    const newAnswers = [...testAnswers, answerIdx]
    if (currentQuestion < PLACEMENT_QUESTIONS.length - 1) {
      setTestAnswers(newAnswers)
      setCurrentQuestion(currentQuestion + 1)
    } else {
      const score = newAnswers.filter((a, i) => a === PLACEMENT_QUESTIONS[i].correct).length
      const level = getLevelFromScore(score)
      setTestResult(level)
      setSelectedLevel(level)
    }
  }

  const currentProgress = progress?.progress?.[0]
  const userName = user?.first_name_ar || user?.first_name || 'الطالب'

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-blue/20 bg-uni-blue/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center flex-shrink-0">
              <Languages className="w-7 h-7 text-uni-blue" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-uni-text">برنامج اللغة الإنجليزية</h1>
              <p className="text-uni-muted text-sm">6 مستويات CEFR · مدرب AI متخصص · من A1 إلى C2</p>
            </div>
            {(testResult || currentProgress?.current_level) && (
              <div className="text-center">
                <div className={`text-3xl font-black ${LEVEL_COLORS[testResult || currentProgress?.current_level || 'B1']?.text}`}>
                  {testResult || currentProgress?.current_level}
                </div>
                <div className="text-xs text-uni-muted">مستواك الحالي</div>
                <button
                  onClick={() => generateCertificate(userName, testResult || currentProgress?.current_level || 'B1', LEVEL_NAMES[testResult || currentProgress?.current_level || 'B1'])}
                  className="mt-1 flex items-center gap-1 text-xs text-uni-gold hover:text-uni-gold-light transition-colors"
                >
                  <Download className="w-3 h-3" /> تحميل شهادة
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'overview', label: 'نظرة عامة' },
            { key: 'chat', label: '💬 تحدث مع المدرب' },
            { key: 'levels', label: 'المستويات والشهادات' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key ? 'btn-gold text-uni-dark' : 'text-uni-muted hover:text-uni-text border border-uni-border/30 hover:border-uni-gold/20'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Level Path */}
            <div className="card-uni">
              <h2 className="text-lg font-bold text-uni-text mb-6">مسيرة تعلم اللغة الإنجليزية CEFR</h2>
              <div className="relative">
                <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 opacity-20 hidden md:block" />
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 relative z-10">
                  {Object.entries(LEVEL_NAMES).map(([level, name]) => {
                    const c = LEVEL_COLORS[level]
                    const isCurrentLevel = (testResult || currentProgress?.current_level) === level
                    return (
                      <motion.div key={level} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${c.bg} ${c.border} ${
                          isCurrentLevel ? 'ring-2 ring-uni-gold scale-105' : 'hover:scale-102'
                        }`}
                        onClick={() => { setSelectedLevel(level); setActiveTab('chat') }}>
                        {isCurrentLevel && <div className="text-xs text-uni-gold mb-1 font-bold">مستواك ★</div>}
                        <div className={`text-2xl font-black ${c.text}`}>{level}</div>
                        <div className="text-xs text-uni-muted mt-1">{name}</div>
                        <div className="text-xs text-uni-gold mt-1">ابدأ ←</div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Start CTA if no level */}
            {!testResult && !currentProgress && (
              <div className="card-uni text-center py-10 border-uni-blue/20">
                <Languages className="w-16 h-16 text-uni-blue mx-auto mb-4" />
                <h2 className="text-xl font-bold text-uni-text mb-2">ابدأ رحلتك مع اللغة الإنجليزية</h2>
                <p className="text-uni-muted mb-6">أجب على اختبار التشخيص القصير (8 أسئلة) لمعرفة مستواك الحالي</p>
                <button
                  onClick={() => { setShowPlacementTest(true); setCurrentQuestion(0); setTestAnswers([]) }}
                  className="bg-uni-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-colors"
                >
                  🎯 اختبار تحديد المستوى
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="glass rounded-2xl border border-uni-blue/20 flex flex-col" style={{ height: '60vh' }}>
            <div className="px-5 py-3 border-b border-uni-border/30 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-uni-blue" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-uni-text">Professor Sarah</div>
                  <div className="text-xs text-uni-green">● English AI Tutor</div>
                </div>
              </div>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-uni-card border border-uni-border rounded-lg text-xs py-1 px-2 text-uni-text">
                {Object.keys(LEVEL_NAMES).map(l => <option key={l} value={l}>{l} - {LEVEL_NAMES[l]}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👋</div>
                  <p className="text-uni-text font-semibold">Hello! I'm Professor Sarah</p>
                  <p className="text-uni-muted text-sm">تحدث معي بالإنجليزية!</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Tell me about yourself', 'Help me with grammar', 'Teach me vocabulary'].map(p => (
                      <button key={p} onClick={() => setMessage(p)}
                        className="badge-gold text-xs cursor-pointer hover:bg-uni-gold/20 border border-uni-gold/30 px-3 py-1 rounded-full">{p}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'flex-row-reverse' : ''} gap-3 items-end`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-uni-gold/20 border border-uni-gold/30' : 'bg-uni-blue/20 border border-uni-blue/30'
                  }`}>
                    {msg.role === 'user' ? <span className="text-xs font-bold text-uni-gold">أ</span> : <span className="text-sm">👩‍🏫</span>}
                  </div>
                  <div className={`max-w-[75%] px-4 py-3 text-sm rounded-xl leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-uni-gold/20 border border-uni-gold/20 text-uni-text'
                      : 'bg-uni-card border border-uni-border/30 text-uni-text markdown-body prose prose-invert prose-sm max-w-none'
                  }`}>
                    {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex gap-3 items-end">
                  <div className="w-8 h-8 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                    <span className="text-sm">👩‍🏫</span>
                  </div>
                  <div className="bg-uni-card border border-uni-border/30 px-4 py-3 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin text-uni-blue" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-uni-border/30 flex gap-2 flex-shrink-0">
              <input value={message} onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type in English..." dir="ltr"
                className="bg-uni-card border border-uni-border rounded-xl px-4 py-3 text-uni-text text-sm flex-1 focus:border-uni-blue outline-none" />
              <button onClick={sendMessage} disabled={!message.trim() || isTyping}
                className="bg-uni-blue text-white w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-blue-500 transition-colors">
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Levels & Certificates Tab */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            <p className="text-uni-muted text-sm">أكمل التحدث مع الأستاذ على كل مستوى واحصل على شهادتك الرقمية</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(LEVEL_NAMES).map(([level, name]) => {
                const c = LEVEL_COLORS[level]
                const isActive = (testResult || currentProgress?.current_level) === level
                return (
                  <motion.div key={level} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className={`card-uni ${c.bg} ${c.border} border transition-all ${isActive ? 'ring-2 ring-uni-gold' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`text-3xl font-black ${c.text}`}>{level}</div>
                      {isActive && <span className="badge-gold text-xs text-uni-gold">مستواك ★</span>}
                    </div>
                    <div className="font-bold text-uni-text mb-1">{name}</div>
                    <p className="text-uni-muted text-xs mb-4">مستوى {level} - {name} في إطار CEFR الأوروبي</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedLevel(level); setActiveTab('chat') }}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold bg-uni-gold/10 border border-uni-gold/20 text-uni-gold hover:bg-uni-gold/20 transition-all">
                        ابدأ التعلم
                      </button>
                      <button
                        onClick={() => generateCertificate(userName, level, name)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs border border-uni-border/30 text-uni-muted hover:border-uni-gold/30 hover:text-uni-gold transition-all"
                        title="تحميل الشهادة"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <Award className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Placement Test Modal */}
        <AnimatePresence>
          {showPlacementTest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="glass rounded-2xl p-6 max-w-lg w-full border border-uni-gold/20">
                {!testResult ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-uni-text">اختبار تحديد المستوى</h3>
                      <button onClick={() => setShowPlacementTest(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-uni-muted mb-2">
                        <span>السؤال {currentQuestion + 1} من {PLACEMENT_QUESTIONS.length}</span>
                        <span>{Math.round((currentQuestion / PLACEMENT_QUESTIONS.length) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-uni-border/30 rounded-full overflow-hidden">
                        <div className="h-full bg-uni-gold rounded-full transition-all" style={{ width: `${(currentQuestion / PLACEMENT_QUESTIONS.length) * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-uni-text font-semibold mb-4 text-lg" dir="ltr">{PLACEMENT_QUESTIONS[currentQuestion].q}</p>
                    <div className="space-y-2">
                      {PLACEMENT_QUESTIONS[currentQuestion].options.map((opt, i) => (
                        <button key={i} onClick={() => handlePlacementAnswer(i)}
                          className="w-full text-right px-4 py-3 rounded-xl border border-uni-border hover:border-uni-gold/40 hover:bg-uni-gold/10 text-uni-text text-sm transition-all"
                          dir="ltr">
                          {String.fromCharCode(65 + i)}. {opt}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="w-16 h-16 text-uni-green mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-uni-text mb-2">مستواك: {testResult}</h3>
                    <p className="text-uni-gold text-lg font-bold mb-4">{LEVEL_NAMES[testResult]}</p>
                    <p className="text-uni-muted text-sm mb-6">بناءً على إجاباتك، مستواك في اللغة الإنجليزية هو {testResult} - {LEVEL_NAMES[testResult]}</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button onClick={() => { setShowPlacementTest(false); setActiveTab('chat') }}
                        className="bg-uni-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-500 transition-colors">
                        ابدأ التعلم مع الأستاذ
                      </button>
                      <button onClick={() => generateCertificate(userName, testResult, LEVEL_NAMES[testResult])}
                        className="flex items-center gap-2 bg-uni-gold/10 border border-uni-gold/30 text-uni-gold px-6 py-2.5 rounded-xl font-bold hover:bg-uni-gold/20 transition-colors">
                        <Download className="w-4 h-4" /> تحميل الشهادة
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
