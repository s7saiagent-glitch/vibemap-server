'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { GraduationCap, User, Mail, Lock, Phone, ChevronLeft, ChevronRight, CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { authAPI, academicAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'

const step1Schema = z.object({
  first_name: z.string().min(2, 'الاسم الأول مطلوب'),
  last_name: z.string().min(2, 'اسم العائلة مطلوب'),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
  phone: z.string().optional(),
})

type FormData = z.infer<typeof step1Schema> & { program_id?: number }

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null)
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(step1Schema),
  })

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => academicAPI.getFaculties().then(r => r.data),
  })

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: () => academicAPI.getPrograms().then(r => r.data),
  })

  const onStep1 = handleSubmit(() => setStep(2))

  const onFinalSubmit = async () => {
    const values = getValues()
    setLoading(true)
    try {
      const res = await authAPI.register({ ...values, program_id: selectedProgram })
      const { user, access_token, refresh_token } = res.data
      setAuth(user, access_token, refresh_token)
      setStep(3)
      setTimeout(() => router.push('/student/dashboard'), 2000)
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'فشل إنشاء الحساب'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-glow-gold opacity-20" />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-5 right-5 z-20 flex items-center gap-2 text-uni-muted hover:text-uni-gold transition-colors text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        الصفحة الرئيسية
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo — clickable */}
        <Link href="/" className="block text-center mb-6 group">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-gradient mb-3 shadow-gold group-hover:scale-105 transition-transform">
            <GraduationCap className="w-8 h-8 text-uni-dark" />
          </div>
          <h1 className="text-xl font-black text-gold-gradient group-hover:opacity-80 transition-opacity">مملكة الأرض الجامعية</h1>
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? 'bg-gold-gradient text-uni-dark' : 'bg-uni-border text-uni-muted'
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-uni-gold' : 'bg-uni-border'}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-uni-gold/10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-bold text-uni-text mb-1">معلوماتك الشخصية</h2>
                <p className="text-uni-muted text-sm mb-6">الخطوة 1 من 2</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">الاسم الأول</label>
                    <input {...register('first_name')} placeholder="John" dir="ltr" className="input-uni w-full px-4 py-3 rounded-xl text-sm" />
                    {errors.first_name && <p className="text-uni-red text-xs mt-0.5">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">اسم العائلة</label>
                    <input {...register('last_name')} placeholder="Doe" dir="ltr" className="input-uni w-full px-4 py-3 rounded-xl text-sm" />
                    {errors.last_name && <p className="text-uni-red text-xs mt-0.5">{errors.last_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">الاسم بالعربية</label>
                    <input {...register('first_name_ar')} placeholder="أحمد" className="input-uni w-full px-4 py-3 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">العائلة بالعربية</label>
                    <input {...register('last_name_ar')} placeholder="محمد" className="input-uni w-full px-4 py-3 rounded-xl text-sm" />
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-subtle" />
                      <input {...register('email')} type="email" placeholder="your@email.com" dir="ltr" className="input-uni w-full pr-10 pl-4 py-3 rounded-xl text-sm" />
                    </div>
                    {errors.email && <p className="text-uni-red text-xs mt-0.5">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-subtle" />
                      <input {...register('password')} type="password" placeholder="8 أحرف على الأقل" className="input-uni w-full pr-10 pl-4 py-3 rounded-xl text-sm" />
                    </div>
                    {errors.password && <p className="text-uni-red text-xs mt-0.5">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-uni-text mb-1">رقم الهاتف (اختياري)</label>
                    <input {...register('phone')} type="tel" placeholder="+966 5X XXX XXXX" dir="ltr" className="input-uni w-full px-4 py-3 rounded-xl text-sm" />
                  </div>
                </div>

                <button onClick={onStep1} className="btn-gold w-full py-3 rounded-xl font-bold text-uni-dark mt-6 flex items-center justify-center gap-2">
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-bold text-uni-text mb-1">اختر تخصصك</h2>
                <p className="text-uni-muted text-sm mb-6">الخطوة 2 من 2 — يمكن تغييره لاحقاً</p>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {programs?.map((prog: Record<string, unknown>) => (
                    <label
                      key={prog.id as number}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedProgram === prog.id
                          ? 'border-uni-gold bg-uni-gold/10'
                          : 'border-uni-border hover:border-uni-gold/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="program"
                        className="hidden"
                        onChange={() => setSelectedProgram(prog.id as number)}
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedProgram === prog.id ? 'border-uni-gold' : 'border-uni-border'
                      }`}>
                        {selectedProgram === prog.id && <div className="w-2 h-2 rounded-full bg-uni-gold" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-uni-text">{prog.name_ar as string}</div>
                        <div className="text-xs text-uni-muted">{prog.code as string} · {prog.total_credits_required as number} ساعة</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="btn-ghost-gold px-5 py-3 rounded-xl font-bold flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" /> رجوع
                  </button>
                  <button
                    onClick={onFinalSubmit}
                    disabled={loading}
                    className="btn-gold flex-1 py-3 rounded-xl font-bold text-uni-dark flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسجيل...</> : 'إنشاء الحساب ✓'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-uni-green/20 border-2 border-uni-green flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-uni-green" />
                </div>
                <h2 className="text-2xl font-black text-uni-text mb-2">تم إنشاء حسابك!</h2>
                <p className="text-uni-muted">جاري تحويلك إلى لوحة الطالب...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 1 && (
            <div className="mt-4 text-center">
              <span className="text-uni-muted text-sm">لديك حساب؟ </span>
              <Link href="/auth/login" className="text-uni-gold font-semibold text-sm hover:text-uni-gold-light">
                تسجيل الدخول
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
