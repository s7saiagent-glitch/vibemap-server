'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Target, TrendingUp, BookOpen, Zap, RefreshCw, ChevronRight } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

export default function AcademicTwinPage() {
  const [activating, setActivating] = useState(false)
  const [activeGoal, setActiveGoal] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['academic-twin'],
    queryFn: () => studentAPI.getTwin().then(r => r.data),
  })

  const twin = data?.twin || data
  const isActive = !!(twin?.is_active)
  const goals: Record<string, unknown>[] = twin?.learning_goals || []
  const strengths: string[] = twin?.strengths || []
  const weaknesses: string[] = twin?.weaknesses || []
  const recommendations: Record<string, unknown>[] = twin?.recommendations || []
  const gpa = twin?.current_gpa || 0
  const studyStyle = twin?.study_style || 'متوازن'

  const activateMutation = useMutation({
    mutationFn: () => studentAPI.activateTwin(),
    onSuccess: () => {
      setActivating(false)
      refetch()
    },
    onError: () => setActivating(false),
  })

  const STUDY_STYLES: Record<string, { label: string; icon: string; desc: string }> = {
    visual: { label: 'بصري', icon: '👁️', desc: 'تتعلم بالصور والرسوم البيانية' },
    auditory: { label: 'سمعي', icon: '👂', desc: 'تتعلم بالاستماع والنقاش' },
    kinesthetic: { label: 'حركي', icon: '✋', desc: 'تتعلم بالتطبيق والممارسة' },
    reading: { label: 'قرائي', icon: '📖', desc: 'تتعلم بالقراءة والكتابة' },
    balanced: { label: 'متوازن', icon: '⚖️', desc: 'تتعلم بأساليب متعددة' },
  }

  const styleInfo = STUDY_STYLES[studyStyle] || STUDY_STYLES['balanced']

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-4xl">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl shimmer" />)}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <Brain className="w-6 h-6 text-uni-gold" /> توأمي الأكاديمي
          </h1>
          <p className="text-uni-muted text-sm mt-1">نسختك الذكية التي تتعلم معك وتوجهك نحو التميز</p>
        </div>

        {!isActive ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-uni text-center py-16 border-uni-gold/20"
          >
            <div className="w-20 h-20 rounded-full bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-uni-gold" />
            </div>
            <h2 className="text-xl font-black text-uni-text mb-3">فعّل توأمك الأكاديمي</h2>
            <p className="text-uni-muted text-sm max-w-md mx-auto mb-8 leading-relaxed">
              التوأم الأكاديمي هو ذكاء اصطناعي شخصي يحلل أسلوب تعلمك، يتتبع نقاط قوتك وضعفك،
              ويقدم توصيات مخصصة لتحسين أدائك الأكاديمي.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
              {[
                { icon: '🎯', title: 'أهداف ذكية', desc: 'خطة دراسية شخصية' },
                { icon: '📊', title: 'تحليل دقيق', desc: 'نقاط القوة والضعف' },
                { icon: '💡', title: 'توصيات', desc: 'نصائح مخصصة لك' },
              ].map((f, i) => (
                <div key={i} className="p-3 rounded-xl bg-uni-card/50 border border-uni-border/30 text-center">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-xs font-bold text-uni-text">{f.title}</div>
                  <div className="text-xs text-uni-muted">{f.desc}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setActivating(true); activateMutation.mutate() }}
              disabled={activating || activateMutation.isPending}
              className="btn-gold px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {activating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> جاري التفعيل...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> تفعيل التوأم الأكاديمي</>
              )}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center">
                <div className="text-3xl font-black text-gold-gradient">{gpa.toFixed(2)}</div>
                <div className="text-xs text-uni-muted mt-1">المعدل التراكمي</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-uni text-center">
                <div className="text-3xl mb-1">{styleInfo.icon}</div>
                <div className="text-xs font-bold text-uni-text">{styleInfo.label}</div>
                <div className="text-xs text-uni-muted">أسلوب التعلم</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni text-center">
                <div className="text-3xl font-black text-uni-green">{strengths.length}</div>
                <div className="text-xs text-uni-muted mt-1">نقطة قوة</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-uni text-center">
                <div className="text-3xl font-black text-uni-blue">{goals.length}</div>
                <div className="text-xs text-uni-muted mt-1">هدف دراسي</div>
              </motion.div>
            </div>

            {/* Study style card */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-uni">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-uni-blue/10 border border-uni-blue/20 flex items-center justify-center text-2xl flex-shrink-0">
                  {styleInfo.icon}
                </div>
                <div>
                  <div className="font-bold text-uni-text">أسلوب التعلم: {styleInfo.label}</div>
                  <div className="text-sm text-uni-muted mt-0.5">{styleInfo.desc}</div>
                </div>
              </div>
            </motion.div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="card-uni">
                <h3 className="font-bold text-uni-green flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" /> نقاط القوة
                </h3>
                {strengths.length > 0 ? (
                  <div className="space-y-2">
                    {strengths.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-uni-green flex-shrink-0" />
                        <span className="text-uni-text">{s}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-uni-muted text-sm">لم تُحدد بعد — تابع دراستك لاكتشافها</p>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card-uni">
                <h3 className="font-bold text-uni-red flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" /> مجالات التحسين
                </h3>
                {weaknesses.length > 0 ? (
                  <div className="space-y-2">
                    {weaknesses.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-uni-red flex-shrink-0" />
                        <span className="text-uni-text">{w}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-uni-muted text-sm">لا مجالات تحسين محددة حتى الآن</p>
                )}
              </motion.div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card-uni">
                <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-uni-gold" /> التوصيات الذكية
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30 hover:border-uni-gold/20 transition-all cursor-pointer"
                      onClick={() => setActiveGoal(activeGoal === String(i) ? null : String(i))}>
                      <div className="w-8 h-8 rounded-lg bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center flex-shrink-0 text-lg">
                        {rec.icon as string || '💡'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-uni-text">{rec.title as string}</div>
                        <AnimatePresence>
                          {activeGoal === String(i) && (
                            <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="text-xs text-uni-muted mt-1 leading-relaxed overflow-hidden">
                              {rec.description as string}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-uni-muted flex-shrink-0 transition-transform ${activeGoal === String(i) ? 'rotate-90' : ''}`} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Learning goals */}
            {goals.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card-uni">
                <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-uni-blue" /> أهدافي الدراسية
                </h3>
                <div className="space-y-3">
                  {goals.map((goal, i) => {
                    const pct = Math.min(100, Math.max(0, Number(goal.progress) || 0))
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-uni-text">{goal.title as string}</span>
                          <span className="text-xs text-uni-muted">{pct}%</span>
                        </div>
                        <div className="h-2 bg-uni-card rounded-full overflow-hidden border border-uni-border/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-full bg-gradient-to-l from-uni-blue to-blue-400 rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
