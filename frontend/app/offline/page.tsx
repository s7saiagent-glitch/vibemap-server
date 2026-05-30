'use client'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center" dir="rtl">
      <div className="text-center p-8">
        <div className="w-20 h-20 rounded-full bg-uni-card border border-uni-border/30 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-uni-muted" />
        </div>
        <h1 className="text-2xl font-black text-uni-text mb-3">لا يوجد اتصال</h1>
        <p className="text-uni-muted mb-6">تحقق من اتصالك بالإنترنت وحاول مجدداً</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-gold px-6 py-2 rounded-xl text-sm font-bold"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
