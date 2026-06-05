'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, GraduationCap, ArrowLeft } from 'lucide-react'
import { useT } from '@/lib/i18n'

export default function PaymentSuccessPage() {
  const { t, lang } = useT()
  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-uni-green/20 border-2 border-uni-green/50 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-uni-green" />
        </motion.div>
        <h1 className="text-3xl font-black text-uni-text mb-2">{t.payment.successTitle} 🎉</h1>
        <p className="text-uni-muted mb-2">{lang === 'ar' ? 'شكراً لثقتك بنا' : 'Thank you for your trust'}</p>
        <p className="text-uni-muted text-sm mb-8">{t.payment.successDesc}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/student/dashboard" className="btn-gold px-6 py-3 rounded-xl font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" /> {lang === 'ar' ? 'ابدأ التعلم' : 'Start Learning'}
          </Link>
          <Link href="/student/english" className="px-6 py-3 rounded-xl font-bold border border-uni-border/40 text-uni-text hover:border-uni-gold/30 transition-all flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {t.nav.englishCourses}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
