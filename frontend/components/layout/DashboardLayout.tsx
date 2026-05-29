'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Brain, FileText, BarChart3,
  Languages, User, Settings, LogOut, GraduationCap, Menu, X,
  Users, Layers, Award, Bell, Globe
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authAPI } from '@/lib/api'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  badge?: string
}

const STUDENT_NAV: NavItem[] = [
  { href: '/student/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/student/courses', icon: BookOpen, label: 'موادي الدراسية' },
  { href: '/student/assessments', icon: FileText, label: 'الاختبارات والواجبات' },
  { href: '/student/grades', icon: BarChart3, label: 'درجاتي ومعدلي' },
  { href: '/student/english', icon: Languages, label: 'اللغة الإنجليزية' },
  { href: '/student/profile', icon: User, label: 'ملفي الشخصي' },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة الإدارة' },
  { href: '/admin/students', icon: Users, label: 'إدارة الطلاب' },
  { href: '/admin/courses', icon: BookOpen, label: 'إدارة المواد' },
  { href: '/admin/programs', icon: Layers, label: 'التخصصات' },
  { href: '/admin/ai-professors', icon: Brain, label: 'الأساتذة الذكاء' },
  { href: '/admin/analytics', icon: BarChart3, label: 'التحليلات' },
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
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    else setSidebarOpen(true)
  }, [isMobile])

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [pathname, isMobile])

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const navItems = isAdmin ? ADMIN_NAV : STUDENT_NAV

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

          {/* Language toggle */}
          <button
            className="text-uni-muted hover:text-uni-gold transition-colors flex items-center gap-1 text-xs border border-uni-border/30 rounded-lg px-2 py-1 hover:border-uni-gold/30"
            title="تغيير اللغة / Change Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AR</span>
          </button>

          <button className="relative text-uni-muted hover:text-uni-text transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-uni-gold text-uni-dark text-[10px] flex items-center justify-center font-bold">3</span>
          </button>

          <Link href={isAdmin ? '/admin/dashboard' : '/student/profile'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-uni-gold/20 border border-uni-gold/30 flex items-center justify-center">
              <span className="text-xs font-bold text-uni-gold">
                {(user?.first_name_ar || user?.first_name || '?').charAt(0)}
              </span>
            </div>
            <span className="text-sm font-medium text-uni-text hidden md:block">
              {user?.first_name_ar || user?.first_name}
            </span>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
