'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { XCircle, ArrowLeft } from 'lucide-react'

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-uni-red/20 border-2 border-uni-red/30 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-uni-red" />
        </div>
        <h1 className="text-2xl font-black text-uni-text mb-2">تم إلغاء الدفع</h1>
        <p className="text-uni-muted mb-2">لم يتم خصم أي مبلغ من حسابك</p>
        <p className="text-uni-muted text-sm mb-8">يمكنك المحاولة مرة أخرى أو التواصل مع الدعم الفني</p>
        <div className="flex gap-3 justify-center">
          <Link href="/pricing" className="btn-gold px-6 py-3 rounded-xl font-bold flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة للأسعار
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
