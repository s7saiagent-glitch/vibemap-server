'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { authAPI } from '@/lib/api'

const schema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
})

type ForgotForm = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(data.email)
      setSuccess(true)
      toast.success('تم إرسال رابط الاستعادة بنجاح')
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
          <h2 className="text-2xl font-bold text-uni-text mb-2">نسيت كلمة المرور؟</h2>
          <p className="text-uni-muted text-sm mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة</p>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-400" />
              </div>
              <p className="text-uni-text font-semibold text-center text-lg">تم الإرسال! تحقق من بريدك الإلكتروني</p>
              <p className="text-uni-muted text-sm text-center">إذا كان بريدك مسجلاً لدينا، ستصل رسالة الاستعادة خلال دقائق</p>
              <Link
                href="/auth/login"
                className="mt-2 text-uni-gold hover:text-uni-gold-light font-semibold text-sm transition-colors"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </motion.div>
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-3 rounded-xl font-bold text-uni-dark flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</>
                ) : (
                  <>إرسال رابط الاستعادة</>
                )}
              </button>

              <div className="text-center pt-1">
                <Link href="/auth/login" className="text-uni-muted text-sm hover:text-uni-gold transition-colors">
                  العودة إلى تسجيل الدخول
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
