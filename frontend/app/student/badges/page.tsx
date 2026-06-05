'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star, Trophy, Target, TrendingUp, Zap, Award } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useT } from '@/lib/i18n'
import { studentAPI } from '@/lib/api'

export default function BadgesPage() {
  const { t } = useT()
  const { data, isLoading } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => studentAPI.getGamification().then(r => r.data),
  })

  const badges: Record<string, unknown>[] = data?.badges || []
  const earned = badges.filter(b => b.earned)
  const total_points = data?.total_points || 0
  const level = data?.level || 1
  const level_name = data?.level_name || 'مبتدئ'
  const level_progress = data?.level_progress || 0
  const recentPoints: Record<string, unknown>[] = data?.recent_points || []

  const CATEGORY_COLORS: Record<string, string> = {
    badge: 'text-uni-gold',
    lecture: 'text-uni-blue',
    quiz: 'text-uni-green',
    general: 'text-uni-muted',
  }

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
          <h1 className="text-2xl font-black text-uni-text">{t.badges.achievementsTitle}</h1>
          <p className="text-uni-muted text-sm mt-1">{t.badges.achievementsSubtitle}</p>
        </div>

        {/* Level + Points */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center col-span-2 md:col-span-1">
            <Trophy className="w-7 h-7 text-uni-gold mx-auto mb-2" />
            <div className="text-3xl font-black text-gold-gradient">{total_points}</div>
            <div className="text-xs text-uni-muted mt-1">{t.badges.totalPoints}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-uni text-center">
            <Star className="w-7 h-7 text-uni-blue mx-auto mb-2" />
            <div className="text-3xl font-black text-uni-text">{t.badges.level} {level}</div>
            <div className="text-xs text-uni-muted mt-1">{level_name}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni text-center">
            <Award className="w-7 h-7 text-uni-green mx-auto mb-2" />
            <div className="text-3xl font-black text-uni-text">{earned.length}</div>
            <div className="text-xs text-uni-muted mt-1">{t.badges.earnedBadge}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-uni text-center">
            <Target className="w-7 h-7 text-uni-gold mx-auto mb-2" />
            <div className="text-3xl font-black text-uni-text">{badges.length - earned.length}</div>
            <div className="text-xs text-uni-muted mt-1">{t.badges.remainingBadge}</div>
          </motion.div>
        </div>

        {/* Level Progress */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-uni">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-uni-text">{t.badges.level} {level}: {level_name}</span>
            <span className="text-xs text-uni-muted">{level_progress}/100 {t.badges.levelProgress}</span>
          </div>
          <div className="h-3 bg-uni-card rounded-full overflow-hidden border border-uni-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level_progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-l from-uni-gold to-amber-500 rounded-full"
            />
          </div>
          <div className="flex justify-between text-xs text-uni-muted mt-1">
            <span>{t.badges.level} {level}</span>
            <span>{t.badges.level} {level + 1}</span>
          </div>
        </motion.div>

        {/* Badges Grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card-uni">
          <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-uni-gold" /> {t.badges.allBadges}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {badges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl text-center border transition-all ${
                  badge.earned
                    ? 'border-uni-gold/30 bg-uni-gold/5'
                    : 'border-uni-border/20 bg-uni-card/30 opacity-40'
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon as string}</div>
                <div className={`text-xs font-bold ${badge.earned ? 'text-uni-text' : 'text-uni-muted'}`}>
                  {badge.name as string}
                </div>
                <div className="text-xs text-uni-muted mt-1 line-clamp-2">{badge.description as string}</div>
                {!!(badge.earned) && (
                  <div className="mt-2">
                    <span className="text-[10px] text-uni-gold border border-uni-gold/30 rounded px-1">{t.badges.earnedTag}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Points */}
        {recentPoints.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card-uni">
            <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-uni-green" /> آخر النقاط المكتسبة
            </h3>
            <div className="space-y-2">
              {recentPoints.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-uni-border/20 last:border-0">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-3.5 h-3.5 ${CATEGORY_COLORS[p.category as string] || 'text-uni-muted'}`} />
                    <span className="text-sm text-uni-text">{p.reason as string}</span>
                  </div>
                  <span className="text-sm font-bold text-uni-gold">+{p.points as number}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
