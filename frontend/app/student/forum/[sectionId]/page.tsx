'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Plus, ThumbsUp, ChevronRight, Send,
  Pin, CheckCircle, X, Brain, User
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { forumAPI } from '@/lib/api'

export default function ForumPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const sectionId = parseInt(params.sectionId as string)
  const [showNew, setShowNew] = useState(false)
  const [selectedPost, setSelectedPost] = useState<number | null>(null)
  const [newPost, setNewPost] = useState({ title: '', content: '' })
  const [reply, setReply] = useState('')

  const { data: posts, isLoading } = useQuery({
    queryKey: ['forum', sectionId],
    queryFn: () => forumAPI.getPosts(sectionId).then(r => r.data),
  })

  const { data: postDetail } = useQuery({
    queryKey: ['forum-post', selectedPost],
    queryFn: () => forumAPI.getPost(selectedPost!).then(r => r.data),
    enabled: selectedPost !== null,
  })

  const createMutation = useMutation({
    mutationFn: () => forumAPI.createPost(sectionId, newPost),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum', sectionId] })
      setShowNew(false)
      setNewPost({ title: '', content: '' })
    },
  })

  const replyMutation = useMutation({
    mutationFn: () => forumAPI.addReply(selectedPost!, { content: reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-post', selectedPost] })
      setReply('')
    },
  })

  const upvoteMutation = useMutation({
    mutationFn: (postId: number) => forumAPI.upvote(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', sectionId] }),
  })

  const postList: Record<string, unknown>[] = Array.isArray(posts) ? posts : []

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => selectedPost ? setSelectedPost(null) : router.back()}
              className="flex items-center gap-1 text-uni-muted hover:text-uni-gold text-sm mb-1 transition-colors">
              <ChevronRight className="w-4 h-4" /> {selectedPost ? 'العودة للمنتدى' : 'العودة'}
            </button>
            <h1 className="text-xl font-black text-uni-text">
              {selectedPost && postDetail ? (postDetail as Record<string, unknown>).title as string : 'منتدى النقاش'}
            </h1>
          </div>
          {!selectedPost && (
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 btn-gold px-4 py-2 rounded-xl text-sm font-bold">
              <Plus className="w-4 h-4" /> سؤال جديد
            </button>
          )}
        </div>

        {/* New Post Form */}
        <AnimatePresence>
          {showNew && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="card-uni border-uni-gold/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-uni-text">طرح سؤال جديد</h3>
                <button onClick={() => setShowNew(false)}><X className="w-5 h-5 text-uni-muted hover:text-uni-red" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-uni-muted mb-1 block">عنوان السؤال *</label>
                  <input value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                    placeholder="مثال: كيف أفهم مفهوم الـ Polymorphism؟"
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none" />
                </div>
                <div>
                  <label className="text-xs text-uni-muted mb-1 block">تفاصيل السؤال *</label>
                  <textarea value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                    rows={4} placeholder="اشرح سؤالك بالتفصيل..."
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !newPost.title || !newPost.content}
                    className="btn-gold px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                    {createMutation.isPending ? 'جاري النشر...' : 'نشر السؤال'}
                  </button>
                  <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-xl text-sm text-uni-muted border border-uni-border hover:border-uni-gold/30">
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post Detail View */}
        {selectedPost && postDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="card-uni">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-uni-gold" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-uni-text mb-1">{(postDetail as Record<string, unknown>).title as string}</div>
                  <div className="text-xs text-uni-muted mb-3">{(postDetail as Record<string, unknown>).author_name as string}</div>
                  <p className="text-sm text-uni-text leading-relaxed whitespace-pre-wrap">
                    {(postDetail as Record<string, unknown>).content as string}
                  </p>
                </div>
              </div>
            </div>

            {/* Replies */}
            <div className="space-y-3">
              <h3 className="font-bold text-uni-text text-sm">
                الردود ({((postDetail as Record<string, unknown>).replies as unknown[])?.length || 0})
              </h3>
              {((postDetail as Record<string, unknown>).replies as Record<string, unknown>[])?.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`card-uni border ${r.is_ai_answer ? 'border-uni-blue/30 bg-uni-blue/5' : 'border-uni-border/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.is_ai_answer ? 'bg-uni-blue/20 border border-uni-blue/30' : 'bg-uni-card border border-uni-border/30'}`}>
                      {r.is_ai_answer ? <Brain className="w-4 h-4 text-uni-blue" /> : <User className="w-3.5 h-3.5 text-uni-muted" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-uni-muted">{r.author_name as string}</span>
                        {!!(r.is_ai_answer) && <span className="badge-blue text-xs">AI</span>}
                      </div>
                      <p className="text-sm text-uni-text leading-relaxed">{r.content as string}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-uni-muted">👍 {r.upvotes as number}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add Reply */}
            <div className="card-uni">
              <div className="flex gap-3">
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
                  placeholder="اكتب ردك هنا..."
                  className="flex-1 bg-uni-dark border border-uni-border/30 rounded-xl px-3 py-2 text-sm text-uni-text focus:border-uni-gold outline-none resize-none" />
                <button onClick={() => replyMutation.mutate()}
                  disabled={!reply.trim() || replyMutation.isPending}
                  className="btn-gold w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 self-end disabled:opacity-50">
                  <Send className="w-4 h-4 text-uni-dark" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Posts List */}
        {!selectedPost && (
          <>
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 glass rounded-2xl shimmer" />)}</div>
            ) : postList.length === 0 ? (
              <div className="card-uni text-center py-12">
                <MessageSquare className="w-12 h-12 text-uni-muted mx-auto mb-3" />
                <p className="text-uni-muted">لا توجد أسئلة بعد</p>
                <p className="text-xs text-uni-muted mt-1">كن أول من يطرح سؤالاً!</p>
                <button onClick={() => setShowNew(true)} className="mt-4 btn-gold px-5 py-2 rounded-xl text-sm font-bold">
                  طرح سؤال
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {postList.map((post, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="card-uni hover:border-uni-gold/20 transition-all cursor-pointer"
                    onClick={() => setSelectedPost(post.id as number)}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!!(post.is_pinned) && <Pin className="w-3.5 h-3.5 text-uni-gold flex-shrink-0" />}
                          {!!(post.is_answered) && <CheckCircle className="w-3.5 h-3.5 text-uni-green flex-shrink-0" />}
                          <span className="font-bold text-uni-text truncate">{post.title as string}</span>
                        </div>
                        <p className="text-xs text-uni-muted line-clamp-2">{post.content as string}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-uni-muted">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author_name as string}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.reply_count as number} رد</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.upvotes as number}</span>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); upvoteMutation.mutate(post.id as number) }}
                        className="p-2 rounded-lg hover:bg-uni-gold/10 text-uni-muted hover:text-uni-gold transition-colors flex-shrink-0">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
