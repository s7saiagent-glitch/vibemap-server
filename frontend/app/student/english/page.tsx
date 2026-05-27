'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Languages, Send, Loader2, Star, CheckCircle, Lock, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { englishAPI } from '@/lib/api'

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  A1: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' },
  A2: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500' },
  B1: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500' },
  B2: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500' },
  C1: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500' },
  C2: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500' },
}

const LEVEL_NAMES: Record<string, string> = {
  A1: 'مبتدئ', A2: 'أساسي', B1: 'متوسط',
  B2: 'فوق المتوسط', C1: 'متقدم', C2: 'إتقان تام',
}

const SKILLS = [
  { key: 'reading', label: 'القراءة', icon: '📖' },
  { key: 'writing', label: 'الكتابة', icon: '✍️' },
  { key: 'grammar', label: 'القواعد', icon: '📝' },
  { key: 'vocabulary', label: 'المفردات', icon: '💬' },
  { key: 'listening', label: 'الاستماع', icon: '👂' },
  { key: 'speaking', label: 'المحادثة', icon: '🗣️' },
]

export default function EnglishProgramPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'levels'>('overview')
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; vocabulary?: unknown[] }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('B1')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: courses } = useQuery({
    queryKey: ['english-courses'],
    queryFn: () => englishAPI.getCourses().then(r => r.data),
  })

  const { data: progress } = useQuery({
    queryKey: ['english-progress'],
    queryFn: () => englishAPI.getProgress().then(r => r.data),
    retry: false,
  })

  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      englishAPI.chat(msg, selectedLevel, chatHistory.map(m => ({ role: m.role, content: m.content }))).then(r => r.data),
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        vocabulary: data.new_vocabulary,
      }])
      setIsTyping(false)
    },
    onError: () => setIsTyping(false),
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

  const currentProgress = progress?.progress?.[0]

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card-uni border-uni-blue/20 bg-uni-blue/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
              <Languages className="w-7 h-7 text-uni-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-uni-text">برنامج اللغة الإنجليزية</h1>
              <p className="text-uni-muted text-sm">6 مستويات CEFR · مدرب AI متخصص · من A1 إلى C2</p>
            </div>
            {currentProgress && (
              <div className="mr-auto text-center">
                <div className={`text-3xl font-black ${LEVEL_COLORS[currentProgress.current_level]?.text || 'text-uni-blue'}`}>
                  {currentProgress.current_level}
                </div>
                <div className="text-xs text-uni-muted">مستواك الحالي</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'overview', label: 'نظرة عامة' },
            { key: 'chat', label: '💬 تحدث مع المدرب' },
            { key: 'levels', label: 'المستويات والوحدات' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'btn-gold text-uni-dark'
                  : 'text-uni-muted hover:text-uni-text border border-uni-border/30 hover:border-uni-gold/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* CEFR Path */}
            <div className="card-uni">
              <h2 className="text-lg font-bold text-uni-text mb-6">مسيرة تعلم اللغة الإنجليزية</h2>
              <div className="relative">
                <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-purple-500 opacity-30 hidden md:block" />
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 relative z-10">
                  {Object.entries(LEVEL_NAMES).map(([level, name]) => {
                    const c = LEVEL_COLORS[level]
                    const isCurrentLevel = currentProgress?.current_level === level
                    return (
                      <motion.div
                        key={level}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${c.bg} ${c.border} ${
                          isCurrentLevel ? 'ring-2 ring-uni-gold scale-105 shadow-gold' : 'hover:scale-102'
                        }`}
                        onClick={() => setSelectedLevel(level)}
                      >
                        {isCurrentLevel && (
                          <div className="text-xs text-uni-gold mb-1 font-bold">مستواك ★</div>
                        )}
                        <div className={`text-2xl font-black ${c.text}`}>{level}</div>
                        <div className="text-xs text-uni-muted mt-1">{name}</div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Skills Progress */}
            {currentProgress && (
              <div className="card-uni">
                <h2 className="text-lg font-bold text-uni-text mb-4">مهاراتك اللغوية</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {SKILLS.map((skill) => {
                    const score = currentProgress[skill.key + '_score'] || 0
                    return (
                      <div key={skill.key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-uni-text">{skill.icon} {skill.label}</span>
                          <span className="text-uni-gold font-bold">{score}%</span>
                        </div>
                        <div className="h-2 bg-uni-border/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full progress-gold rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Start CTA */}
            {!currentProgress && (
              <div className="card-uni text-center py-10 border-uni-blue/20">
                <Languages className="w-16 h-16 text-uni-blue mx-auto mb-4" />
                <h2 className="text-xl font-bold text-uni-text mb-2">ابدأ رحلتك مع اللغة الإنجليزية</h2>
                <p className="text-uni-muted mb-6">أجب على اختبار التشخيص لمعرفة مستواك الحالي</p>
                <button className="btn-blue px-8 py-3 rounded-xl font-bold">
                  🎯 اختبار تحديد المستوى
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="glass rounded-2xl border border-uni-blue/20 overflow-hidden" style={{ height: '60vh' }}>
            {/* Chat Header */}
            <div className="px-5 py-3 border-b border-uni-border/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-uni-blue" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-uni-text">Professor Sarah</div>
                  <div className="text-xs text-uni-green">● English AI Tutor · متاحة الآن</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-uni-muted">مستوى التدريس:</span>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="input-uni text-xs py-1 px-2 rounded-lg"
                >
                  {Object.keys(LEVEL_NAMES).map(l => (
                    <option key={l} value={l}>{l} - {LEVEL_NAMES[l]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 120px)' }}>
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👋</div>
                  <p className="text-uni-text font-semibold">Hello! I'm Professor Sarah</p>
                  <p className="text-uni-muted text-sm">تحدث معي بالإنجليزية وسأصحح أخطاءك وأعلمك بطريقة ممتعة!</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Tell me about yourself', 'Help me with grammar', 'Teach me vocabulary', 'Practice conversation'].map(p => (
                      <button key={p} onClick={() => { setMessage(p); }} className="badge-blue text-xs cursor-pointer hover:bg-uni-blue/20">{p}</button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'flex-row-reverse' : ''} gap-3 items-end`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-uni-gold/20 border border-uni-gold/30' : 'bg-uni-blue/20 border border-uni-blue/30'
                  }`}>
                    {msg.role === 'user' ? <span className="text-xs font-bold text-uni-gold">أ</span> : <span className="text-sm">👩‍🏫</span>}
                  </div>
                  <div className={`max-w-[75%] px-4 py-3 text-sm rounded-xl leading-relaxed ${
                    msg.role === 'user' ? 'chat-user' : 'chat-ai markdown-body prose prose-invert prose-sm max-w-none'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <p className="text-uni-text">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex gap-3 items-end">
                  <div className="w-8 h-8 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
                    <span className="text-sm">👩‍🏫</span>
                  </div>
                  <div className="chat-ai px-4 py-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-uni-border/30 flex gap-2 items-end">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type in English... أو بالعربية"
                dir="auto"
                className="input-uni flex-1 px-4 py-3 rounded-xl text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || isTyping}
                className="btn-blue w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Levels Tab */}
        {activeTab === 'levels' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses?.map((course: Record<string, unknown>) => {
              const c = LEVEL_COLORS[course.level as string] || LEVEL_COLORS.B1
              const isUnlocked = true
              return (
                <motion.div
                  key={course.id as number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`card-uni ${c.bg} ${c.border} border glass-hover`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`text-3xl font-black ${c.text}`}>{course.level as string}</div>
                    {isUnlocked ? (
                      <CheckCircle className={`w-5 h-5 ${c.text}`} />
                    ) : (
                      <Lock className="w-5 h-5 text-uni-subtle" />
                    )}
                  </div>
                  <div className="font-bold text-uni-text mb-1">{course.name_ar as string}</div>
                  <p className="text-uni-muted text-xs mb-3 leading-relaxed">{course.description_ar as string}</p>
                  <div className="flex items-center gap-2 text-xs text-uni-muted mb-4">
                    <span>📚 {course.total_units as number} وحدة</span>
                    <span>·</span>
                    <span>⏱️ {course.estimated_hours as number} ساعة</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                      isUnlocked ? `btn-ghost-gold` : 'text-uni-subtle border border-uni-border cursor-not-allowed'
                    }`}
                    disabled={!isUnlocked}
                  >
                    {isUnlocked ? 'ابدأ الكورس' : 'مقفل'}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
