'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send, Brain, MessageSquare, Zap, FileQuestion,
  BookOpen, Loader2, Copy, ChevronDown, Lightbulb, X
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { aiProfessorAPI } from '@/lib/api'
import { useChatStore } from '@/lib/store'
import { nanoid } from 'crypto'

const QUICK_ACTIONS = [
  { icon: BookOpen, label: 'اشرح لي المفهوم', prompt: 'شرح مفصل للمفهوم الأساسي في هذه المادة' },
  { icon: FileQuestion, label: 'اختبرني', prompt: 'أعطني 3 أسئلة لاختبار فهمي للمادة' },
  { icon: Zap, label: 'لخص الدرس', prompt: 'لخص أهم نقاط الدرس بشكل موجز ومنظم' },
  { icon: Lightbulb, label: 'أمثلة عملية', prompt: 'أعطني أمثلة عملية من الواقع للمفاهيم المدروسة' },
]

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
      {/* Avatar */}
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

      {/* Bubble */}
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

        {/* Suggested topics */}
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

export default function AIProfessorChatPage() {
  const params = useParams()
  const sectionId = parseInt(params.sectionId as string)
  const [message, setMessage] = useState('')
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string; role: 'user' | 'assistant'; content: string; suggestedTopics?: string[]
  }>>([])
  const [conversationId, setConversationId] = useState<number | undefined>()
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: professor } = useQuery({
    queryKey: ['professor', sectionId],
    queryFn: () => aiProfessorAPI.getSectionProfessor(sectionId).then(r => r.data),
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

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(message)
    }
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
                  onClick={() => sendMessage(action.prompt)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg text-right hover:bg-uni-gold/10 border border-transparent hover:border-uni-gold/20 transition-all text-sm text-uni-muted hover:text-uni-text"
                >
                  <action.icon className="w-4 h-4 text-uni-gold flex-shrink-0" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations count */}
          <div className="card-uni text-center">
            <MessageSquare className="w-6 h-6 text-uni-gold mx-auto mb-1" />
            <div className="text-xl font-black text-gold-gradient">{professor?.total_conversations || 0}</div>
            <div className="text-xs text-uni-muted">محادثة أكاديمية</div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col glass rounded-2xl border border-uni-border/30 overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-uni-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-uni-blue/20 border border-uni-blue/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-uni-blue animate-pulse" />
            </div>
            <div>
              <div className="font-semibold text-uni-text text-sm">{professor?.name_ar || 'الأستاذ الذكي'}</div>
              <div className="text-xs text-uni-green">● متاح الآن</div>
            </div>
          </div>

          {/* Messages */}
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
                  يسعدني مساعدتك في فهم المادة. اسألني عن أي موضوع أو مفهوم تريد شرحه، أو استخدم الإجراءات السريعة للبدء.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {QUICK_ACTIONS.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(a.prompt)}
                      className="badge-blue text-xs py-1.5 px-3 cursor-pointer hover:bg-uni-blue/20 transition-colors"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {localMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                suggestedTopics={msg.suggestedTopics}
              />
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-uni-border/30">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="اكتب سؤالك أو موضوعك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
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
              الأستاذ الذكي يعمل بنماذج Claude · المعلومات للأغراض التعليمية فقط
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
