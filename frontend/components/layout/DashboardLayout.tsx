'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Brain, FileText, BarChart3,
  Languages, User, Settings, LogOut, GraduationCap, Menu, X,
  Users, Layers, Award, Bell, Globe, ChevronDown, TrendingUp, Search,
  Calendar, CreditCard, MessageSquare, Clock, CheckCircle
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authAPI, studentAPI, searchAPI } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  badge?: string
}

const STUDENT_NAV: NavItem[] = [
  { href: '/student/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/student/courses', icon: BookOpen, label: 'موادي الدراسية' },
  { href: '/student/registration', icon: BookOpen, label: 'تسجيل المقررات' },
  { href: '/student/assessments', icon: FileText, label: 'الاختبارات' },
  { href: '/student/results-history', icon: FileText, label: 'سجل نتائجي' },
  { href: '/student/grades', icon: BarChart3, label: 'درجاتي ومعدلي' },
  { href: '/student/analytics', icon: TrendingUp, label: 'تحليلاتي الأكاديمية' },
  { href: '/student/badges', icon: Award, label: 'إنجازاتي' },
  { href: '/student/twin', icon: Brain, label: 'توأمي الأكاديمي' },
  { href: '/student/announcements', icon: Bell, label: 'الإشعارات' },
  { href: '/student/schedule', icon: Calendar, label: 'جدولي الدراسي' },
  { href: '/student/attendance', icon: CheckCircle, label: 'الحضور والغياب' },
  { href: '/student/calendar', icon: Calendar, label: 'التقويم الأكاديمي' },
  { href: '/student/study-timer', icon: Clock, label: 'مؤقت الدراسة' },
  { href: '/student/english', icon: Languages, label: 'اللغة الإنجليزية' },
  { href: '/academic/plans', icon: Award, label: 'الخطط الدراسية' },
  { href: '/roadmap', icon: Globe, label: 'خريطة التطوير' },
  { href: '/student/profile', icon: User, label: 'ملفي الشخصي' },
  { href: '/student/certificates', icon: Award, label: 'شهاداتي' },
  { href: '/student/id-card', icon: CreditCard, label: 'بطاقتي الجامعية' },
  { href: '/student/grade-appeal', icon: MessageSquare, label: 'تظلمات الدرجات' },
  { href: '/student/financial', icon: CreditCard, label: 'حسابي المالي' },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة الإدارة' },
  { href: '/admin/students', icon: Users, label: 'إدارة الطلاب' },
  { href: '/admin/grades', icon: BarChart3, label: 'إدارة الدرجات' },
  { href: '/admin/courses', icon: BookOpen, label: 'إدارة المواد' },
  { href: '/admin/sections', icon: Layers, label: 'الشُعب الدراسية' },
  { href: '/admin/assessments', icon: FileText, label: 'إدارة الاختبارات' },
  { href: '/admin/materials', icon: BookOpen, label: 'المواد التعليمية' },
  { href: '/admin/lectures', icon: BookOpen, label: 'إدارة المحاضرات' },
  { href: '/admin/programs', icon: Layers, label: 'التخصصات' },
  { href: '/admin/ai-professors', icon: Brain, label: 'الأساتذة الذكاء' },
  { href: '/admin/analytics', icon: BarChart3, label: 'التحليلات' },
  { href: '/admin/payments', icon: CreditCard, label: 'المدفوعات والكوبونات' },
  { href: '/admin/settings', icon: Settings, label: 'الإعدادات' },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => studentAPI.getNotifications().then(r => r.data),
    enabled: !isAdmin,
    refetchInterval: 60000,
  })
  const notifications: Record<string, unknown>[] = notifData?.notifications || []
  const urgentCount = notifications.filter(n => n.is_urgent).length
  const notifCount = Math.min(9, notifications.length)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar'
    setLang(next)
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
  }

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    else setSidebarOpen(true)
  }, [isMobile])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [pathname, isMobile])

  const navItems = isAdmin ? ADMIN_NAV : STUDENT_NAV

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.length >= 2) {
      try {
        const res = await searchAPI.search(q)
        setSearchResults(res.data?.results || [])
      } catch { setSearchResults([]) }
    } else {
      setSearchResults([])
    }
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) await authAPI.logout(refreshToken).catch(() => {})
    logout()
    router.push('/auth/login')
  }

  const sidebarWidth = 260

  return (
    <div className="min-h-screen bg-uni-dark flex" dir="rtl">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: isMobile ? sidebarWidth : 0, opacity: isMobile ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? sidebarWidth : 0, opacity: isMobile ? 0 : 1 }}
            transition={{ duration: 0.25 }}
            className="fixed right-0 top-0 bottom-0 z-40 flex flex-col glass border-l border-uni-border/30 overflow-hidden"
            style={{ width: sidebarWidth }}
          >
            {/* Logo */}
            <div className="p-5 border-b border-uni-border/30 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-uni-dark" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-gold-gradient leading-tight truncate">مملكة الأرض</div>
                  <div className="text-xs text-uni-muted truncate">الجامعية</div>
                </div>
              </Link>
              {isMobile && (
                <button onClick={() => setSidebarOpen(false)} className="text-uni-muted hover:text-uni-gold">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'sidebar-item-active'
                          : 'text-uni-muted hover:text-uni-text hover:bg-uni-border/30'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-uni-gold' : ''}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="badge-gold mr-auto text-xs">{item.badge}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* User footer */}
            <div className="p-4 border-t border-uni-border/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-uni-gold">
                    {(user?.first_name_ar || user?.first_name || '?').charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-uni-text truncate">
                    {user?.first_name_ar || user?.first_name}
                  </div>
                  <div className="text-xs text-uni-muted truncate">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-uni-muted hover:text-uni-red text-sm transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-uni-red/10"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginRight: !isMobile && sidebarOpen ? sidebarWidth : 0 }}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 glass border-b border-uni-border/30 px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-uni-muted hover:text-uni-gold transition-colors p-1"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <span className="text-uni-muted text-sm truncate hidden sm:block">
              {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || ''}
            </span>
          </div>

          {/* Search */}
          <div className="relative hidden md:block">
            <div className="flex items-center gap-2 bg-uni-card border border-uni-border/30 rounded-xl px-3 py-1.5 focus-within:border-uni-gold/40 transition-all w-48">
              <Search className="w-3.5 h-3.5 text-uni-muted flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                placeholder="بحث..."
                className="bg-transparent text-xs text-uni-text placeholder:text-uni-muted outline-none w-full"
              />
            </div>
            <AnimatePresence>
              {searchOpen && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-10 right-0 w-72 glass rounded-2xl border border-uni-border/40 shadow-2xl z-50 overflow-hidden"
                >
                  {searchResults.map((r, i) => (
                    <Link
                      key={i}
                      href={r.url as string}
                      onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-uni-gold/5 transition-colors border-b border-uni-border/20 last:border-0"
                    >
                      <span className="text-xl">{r.icon as string}</span>
                      <div>
                        <div className="text-sm text-uni-text font-medium">{r.title as string}</div>
                        <div className="text-xs text-uni-muted">{r.subtitle as string}</div>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="text-uni-muted hover:text-uni-gold transition-colors flex items-center gap-1 text-xs border border-uni-border/30 rounded-lg px-2 py-1 hover:border-uni-gold/30"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative text-uni-muted hover:text-uni-text transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-uni-dark text-[10px] flex items-center justify-center font-bold ${urgentCount > 0 ? 'bg-uni-red' : 'bg-uni-gold'}`}>
                  {notifCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-8 w-80 glass rounded-2xl border border-uni-border/40 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-uni-border/30 flex items-center justify-between">
                    <span className="font-bold text-uni-text text-sm">الإشعارات</span>
                    {notifCount > 0 && <span className="badge-gold text-xs">{notifCount} جديد</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-8 h-8 text-uni-muted mx-auto mb-2" />
                        <p className="text-xs text-uni-muted">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-uni-border/20">
                        {notifications.map((n, i) => (
                          <div key={i} className={`px-4 py-3 hover:bg-uni-gold/5 transition-colors ${n.is_urgent ? 'border-r-2 border-uni-red' : ''}`}>
                            <div className="flex items-start gap-3">
                              <span className="text-lg flex-shrink-0">{n.icon as string || '🔔'}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-uni-text truncate">{n.title as string}</div>
                                <div className="text-xs text-uni-muted mt-0.5 line-clamp-2">{n.body as string}</div>
                              </div>
                              {!!(n.is_urgent) && <span className="text-[10px] text-uni-red border border-uni-red/30 rounded px-1 flex-shrink-0">عاجل</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => router.push(isAdmin ? '/admin/dashboard' : '/student/profile')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-uni-gold">
                  {(user?.first_name_ar || user?.first_name || '?').charAt(0)}
                </span>
              )}
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-uni-text leading-tight">
                {user?.first_name_ar || user?.first_name}
              </span>
              {user?.program_name && (
                <span className="text-xs text-uni-muted leading-tight truncate max-w-32">{user.program_name}</span>
              )}
            </div>
            <ChevronDown className="w-3 h-3 text-uni-muted hidden md:block" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
