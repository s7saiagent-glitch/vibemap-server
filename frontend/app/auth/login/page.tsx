'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { GraduationCap, Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

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

  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-glow-gold opacity-30" />

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-uni-gold/30"
            style={{
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${4 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-gradient mb-4 shadow-gold-lg animate-glow-pulse">
            <GraduationCap className="w-9 h-9 text-uni-dark" />
          </div>
          <h1 className="text-2xl font-black text-gold-gradient">مملكة الأرض الجامعية</h1>
          <p className="text-uni-muted text-sm mt-1">Virtual Earth Kingdom University</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-uni-gold/10">
          <h2 className="text-2xl font-bold text-uni-text mb-2">تسجيل الدخول</h2>
          <p className="text-uni-muted text-sm mb-6">أدخل بياناتك للوصول إلى حسابك</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 rounded-xl font-bold text-uni-dark flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> جاري الدخول...</>
              ) : (
                <><LogIn className="w-5 h-5" /> دخول</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
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
