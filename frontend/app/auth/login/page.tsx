'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { GraduationCap, Mail, Lock, Eye, EyeOff, LogIn, Loader2, ArrowRight } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authAPI.login(data)
      const { user, access_token, refresh_token } = res.data
      setAuth(user, access_token, refresh_token)
      toast.success(`مرحباً ${user.first_name_ar || user.first_name}! 👋`)
      if (user.role === 'admin' || user.role === 'superadmin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/student/dashboard')
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'فشل تسجيل الدخول'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      toast('Google OAuth غير مفعّل بعد - يرجى إضافة GOOGLE_CLIENT_ID', { icon: '⚙️' })
      return
    }
    const redirectUri = `${window.location.origin}/auth/callback/google`
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  const handleSocialLogin = (provider: string) => {
    toast('قريباً سيتوفر تسجيل الدخول عبر ' + provider, { icon: '🔜' })
  }

  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-glow-gold opacity-30" />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-5 right-5 z-20 flex items-center gap-2 text-uni-muted hover:text-uni-gold transition-colors text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        الصفحة الرئيسية
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo — clickable */}
        <Link href="/" className="block text-center mb-8 group">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-gradient mb-4 shadow-gold-lg animate-glow-pulse group-hover:scale-105 transition-transform">
            <GraduationCap className="w-9 h-9 text-uni-dark" />
          </div>
          <h1 className="text-2xl font-black text-gold-gradient group-hover:opacity-80 transition-opacity">مملكة الأرض الافتراضية</h1>
          <p className="text-uni-muted text-sm mt-1">Virtual Earth Kingdom University</p>
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8 border border-uni-gold/10">
          <h2 className="text-2xl font-bold text-uni-text mb-2">تسجيل الدخول</h2>
          <p className="text-uni-muted text-sm mb-6">أدخل بياناتك للوصول إلى حسابك</p>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-uni-border hover:border-uni-gold/30 hover:bg-uni-border/20 transition-all text-sm text-uni-muted hover:text-uni-text"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('Apple')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-uni-border hover:border-uni-gold/30 hover:bg-uni-border/20 transition-all text-sm text-uni-muted hover:text-uni-text"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
            <button
              onClick={() => handleSocialLogin('Facebook')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-uni-border hover:border-uni-gold/30 hover:bg-uni-border/20 transition-all text-sm text-uni-muted hover:text-uni-text"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-uni-border/40" />
            <span className="text-uni-subtle text-xs">أو بالبريد الإلكتروني</span>
            <div className="flex-1 h-px bg-uni-border/40" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-uni-text mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-subtle" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="your@email.com"
                  dir="ltr"
                  className="input-uni w-full pr-10 pl-4 py-3 rounded-xl text-sm"
                />
              </div>
              {errors.email && <p className="text-uni-red text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-uni-text mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-subtle" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-uni w-full pr-10 pl-10 py-3 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-uni-subtle hover:text-uni-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-uni-red text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 rounded-xl font-bold text-uni-dark flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> جاري الدخول...</>
              ) : (
                <><LogIn className="w-5 h-5" /> دخول</>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-uni-muted text-sm">ليس لديك حساب؟ </span>
            <Link href="/auth/register" className="text-uni-gold font-semibold text-sm hover:text-uni-gold-light">
              سجّل الآن
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
