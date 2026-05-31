'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Brain, Target, TrendingUp, Bell } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

type Mode = 'work' | 'short_break' | 'long_break'

const MODE_CONFIG: Record<Mode, { label: string; duration: number; color: string; bg: string; icon: typeof Brain }> = {
  work: { label: 'وقت الدراسة', duration: 25 * 60, color: 'text-uni-gold', bg: 'bg-uni-gold/10 border-uni-gold/30', icon: Brain },
  short_break: { label: 'راحة قصيرة', duration: 5 * 60, color: 'text-uni-green', bg: 'bg-uni-green/10 border-uni-green/30', icon: Coffee },
  long_break: { label: 'راحة طويلة', duration: 15 * 60, color: 'text-uni-blue', bg: 'bg-uni-blue/10 border-uni-blue/30', icon: Coffee },
}

export default function StudyTimerPage() {
  const [mode, setMode] = useState<Mode>('work')
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0)
  const [customWork, setCustomWork] = useState(25)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const config = MODE_CONFIG[mode]

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stop()
          // Notify
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(mode === 'work' ? '🎉 انتهى وقت الدراسة! خذ استراحة' : '📚 الاستراحة انتهت، عد للدراسة!', {
              body: 'تطبيق مملكة الأرض الجامعية',
            })
          }
          if (mode === 'work') {
            setSessions(s => s + 1)
            const elapsed = Math.round((Date.now() - startTimeRef.current) / 60000)
            setTotalStudyMinutes(m => m + elapsed)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setRunning(true)
  }, [mode, stop])

  const reset = useCallback(() => {
    stop()
    const dur = mode === 'work' ? customWork * 60 : MODE_CONFIG[mode].duration
    setTimeLeft(dur)
  }, [mode, customWork, stop])

  const switchMode = useCallback((newMode: Mode) => {
    stop()
    setMode(newMode)
    const dur = newMode === 'work' ? customWork * 60 : MODE_CONFIG[newMode].duration
    setTimeLeft(dur)
  }, [customWork, stop])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const requestNotifPermission = () => {
    if ('Notification' in window) Notification.requestPermission()
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const totalDuration = mode === 'work' ? customWork * 60 : MODE_CONFIG[mode].duration
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100

  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const Icon = config.icon

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <Target className="w-6 h-6 text-uni-gold" /> مؤقت بومودورو
          </h1>
          <p className="text-uni-muted text-sm mt-1">تقنية بومودورو لتحسين التركيز والإنتاجية</p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 bg-uni-card/50 rounded-xl p-1 border border-uni-border/30">
          {(Object.keys(MODE_CONFIG) as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode === m ? `${MODE_CONFIG[m].bg} ${MODE_CONFIG[m].color}` : 'text-uni-muted hover:text-uni-text'}`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <motion.div
          key={mode}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative w-52 h-52">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke={mode === 'work' ? '#d4a017' : mode === 'short_break' ? '#10b981' : '#3b82f6'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Icon className={`w-6 h-6 mb-2 ${config.color}`} />
              <div className={`text-5xl font-black font-mono ${config.color}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-xs text-uni-muted mt-1">{config.label}</div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="w-11 h-11 rounded-full border border-uni-border/30 hover:border-uni-gold/30 flex items-center justify-center text-uni-muted hover:text-uni-gold transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={running ? stop : start}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-uni-dark font-bold transition-all shadow-lg ${config.color.replace('text-', 'bg-').replace('-gold', '-gold').replace('uni-gold', 'uni-gold')} btn-gold`}
          >
            <AnimatePresence mode="wait">
              {running ? (
                <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Pause className="w-7 h-7" />
                </motion.div>
              ) : (
                <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Play className="w-7 h-7 mr-0.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="w-11 h-11 rounded-full border border-uni-border/30 hover:border-uni-gold/30 flex items-center justify-center text-uni-muted hover:text-uni-gold transition-all"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="card-uni overflow-hidden">
              <h3 className="font-bold text-uni-text mb-4 text-sm">الإعدادات</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-uni-muted mb-1 block">مدة الدراسة (دقائق): {customWork}</label>
                  <input type="range" min="5" max="60" value={customWork}
                    onChange={e => { setCustomWork(Number(e.target.value)); if (mode === 'work') { stop(); setTimeLeft(Number(e.target.value) * 60) } }}
                    className="w-full accent-amber-500" />
                </div>
                <button
                  onClick={requestNotifPermission}
                  className="text-sm text-uni-blue hover:underline flex items-center gap-1"
                >
                  <Bell className="w-4 h-4" /> تفعيل الإشعارات الصوتية
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center">
            <div className="text-2xl font-black text-gold-gradient">{sessions}</div>
            <div className="text-xs text-uni-muted mt-1">جلسة مكتملة</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-uni text-center">
            <div className="text-2xl font-black text-uni-blue">{totalStudyMinutes}</div>
            <div className="text-xs text-uni-muted mt-1">دقيقة دراسة</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni text-center">
            <TrendingUp className="w-6 h-6 text-uni-green mx-auto mb-1" />
            <div className="text-xs text-uni-muted">{sessions >= 4 ? '🔥 تركيز ممتاز' : sessions >= 2 ? '💪 أداء جيد' : '🌱 ابدأ'}</div>
          </motion.div>
        </div>

        {/* Tips */}
        <div className="card-uni text-sm">
          <h3 className="font-bold text-uni-text mb-3 text-sm">كيفية الاستخدام</h3>
          <ol className="space-y-1.5 text-uni-muted text-xs">
            <li>1. اختر مادة دراسية وابدأ مؤقت 25 دقيقة</li>
            <li>2. ركّز على الدراسة حتى ينتهي الوقت</li>
            <li>3. خذ استراحة 5 دقائق</li>
            <li>4. كل 4 جلسات، خذ استراحة طويلة 15-30 دقيقة</li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  )
}
