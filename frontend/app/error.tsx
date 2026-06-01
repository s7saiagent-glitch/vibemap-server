'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-uni-red/10 border border-uni-red/30 mb-6">
          <AlertTriangle className="w-8 h-8 text-uni-red" />
        </div>
        <h1 className="text-2xl font-black text-uni-text mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-uni-muted text-sm mb-6">
          {error.message || 'يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني'}
        </p>
        <button
          onClick={reset}
          className="btn-gold px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" /> إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
