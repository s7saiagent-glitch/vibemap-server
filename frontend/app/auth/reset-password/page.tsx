'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { authAPI } from '@/lib/api'

const schema = z.object({
  new_password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirm_password'],
})

type ResetForm = z.infer<typeof schema>

function ResetPasswordInner() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const onSubmit = async (data: ResetForm) => {
    if (!token) return
    setLoading(true)
    try {
      await authAPI.resetPassword(token, data.new_password)
      setSuccess(true)
      toast.success('تم تغيير كلمة المرور بنجاح!')
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'حدث خطأ، يرجى المحاولة مجدداً'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-glow-gold opacity-30" />

      {/* Back to login */}
      <Link
        href="/auth/login"
        className="absolute top-5 right-5 z-20 flex items-center gap-2 text-uni-muted hover:text-uni-gold transition-colors text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        العودة إلى تسجيل الدخول
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="block text-center mb-8 group">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-gradient mb-4 shadow-gold-lg animate-glow-pulse group-hover:scale-105 transition-transform">
            <GraduationCap className="w-9 h-9 text-uni-dark" />
          </div>
          <h1 className="text-2xl font-black text-gold-gradient group-hover:opacity-80 transition-opacity">مملكة الأرض الافتراضية</h1>
          <p className="text-uni-muted text-sm mt-1">Virtual Earth Kingdom University</p>
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8 border border-uni-gold/10">
          {/* No token — invalid link */}
          {!token ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-9 h-9 text-uni-red" />
              </div>
              <p className="text-uni-text font-semibold text-center text-lg">رابط غير صالح</p>
              <p className="text-uni-muted text-sm text-center">هذا الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط استعادة جديد.</p>
              <Link
                href="/auth/forgot-password"
                className="mt-2 btn-gold px-6 py-2.5 rounded-xl font-bold text-uni-dark text-sm"
              >
                طلب رابط جديد
              </Link>
            </motion.div>
          ) : success ? (
            /* Success state */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-400" />
              </div>
              <p className="text-uni-text font-semibold text-center text-lg">تم تغيير كلمة المرور بنجاح!</p>
              <p className="text-uni-muted text-sm text-center">سيتم توجيهك إلى صفحة تسجيل الدخول...</p>
              <Loader2 className="w-5 h-5 text-uni-gold animate-spin mt-2" />
            </motion.div>
          ) : (
            /* Reset form */
            <>
              <h2 className="text-2xl font-bold text-uni-text mb-2">تعيين كلمة مرور جديدة</h2>
              <p className="text-uni-muted text-sm mb-6">أدخل كلمة مرور جديدة لحسابك</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-uni-text mb-1.5">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-subtle" />
                    <input
                      {...register('new_password')}
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-uni w-full pr-10 pl-10 py-3 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-uni-subtle hover:text-uni-text"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.new_password && <p className="text-uni-red text-xs mt-1">{errors.new_password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-uni-text mb-1.5">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-subtle" />
                    <input
                      {...register('confirm_password')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-uni w-full pr-10 pl-10 py-3 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-uni-subtle hover:text-uni-text"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="text-uni-red text-xs mt-1">{errors.confirm_password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-3 rounded-xl font-bold text-uni-dark flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <>تعيين كلمة المرور</>
                  )}
                </button>

                <div className="text-center pt-1">
                  <Link href="/auth/login" className="text-uni-muted text-sm hover:text-uni-gold transition-colors">
                    العودة إلى تسجيل الدخول
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-uni-dark flex items-center justify-center" dir="rtl">
        <div className="text-uni-muted text-sm">جاري التحميل...</div>
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}
