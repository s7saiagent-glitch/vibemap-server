'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, Info, BookOpen, Calendar } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  assessment: { icon: BookOpen, color: 'text-uni-gold', bg: 'bg-uni-gold/10 border-uni-gold/20' },
  announcement: { icon: Bell, color: 'text-uni-blue', bg: 'bg-uni-blue/10 border-uni-blue/20' },
  urgent: { icon: AlertTriangle, color: 'text-uni-red', bg: 'bg-uni-red/10 border-uni-red/20' },
  info: { icon: Info, color: 'text-uni-muted', bg: 'bg-uni-card border-uni-border/20' },
}

export default function AnnouncementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications-full'],
    queryFn: () => studentAPI.getNotifications().then(r => r.data),
    refetchInterval: 60000,
  })

  const notifications: Record<string, unknown>[] = data?.notifications || []
  const urgentCount = notifications.filter(n => n.is_urgent).length

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
              <Bell className="w-6 h-6 text-uni-gold" /> الإشعارات والإعلانات
            </h1>
            <p className="text-uni-muted text-sm mt-1">جميع التنبيهات الأكاديمية الخاصة بك</p>
          </div>
          {urgentCount > 0 && (
            <span className="badge-gold text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {urgentCount} عاجل
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl shimmer" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="card-uni text-center py-16">
            <Bell className="w-12 h-12 text-uni-muted mx-auto mb-3" />
            <p className="text-uni-muted">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => {
              const typeKey = n.is_urgent ? 'urgent' : (n.type as string) || 'info'
              const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.info
              const Icon = config.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`card-uni ${config.bg} transition-all`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      {n.icon ? (
                        <span className="text-xl">{n.icon as string}</span>
                      ) : (
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-uni-text text-sm">{n.title as string}</div>
                        {!!(n.is_urgent) && (
                          <span className="text-[10px] text-uni-red border border-uni-red/30 rounded px-1 flex-shrink-0">عاجل</span>
                        )}
                      </div>
                      <p className="text-xs text-uni-muted mt-1 leading-relaxed">{n.body as string}</p>
                      {!!(n.due_date) && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-uni-muted">
                          <Calendar className="w-3 h-3" />
                          <span>الموعد: {String(n.due_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
