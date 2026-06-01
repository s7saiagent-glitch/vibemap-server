import Link from 'next/link'
import { GraduationCap, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-uni-gold/10 border border-uni-gold/30 mb-6">
          <GraduationCap className="w-8 h-8 text-uni-gold" />
        </div>
        <h1 className="text-6xl font-black text-gold-gradient mb-4">404</h1>
        <h2 className="text-xl font-bold text-uni-text mb-2">الصفحة غير موجودة</h2>
        <p className="text-uni-muted text-sm mb-6">الصفحة التي تبحث عنها غير موجودة أو تم نقلها</p>
        <Link href="/" className="btn-gold px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2">
          <Home className="w-4 h-4" /> العودة للرئيسية
        </Link>
      </div>
    </div>
  )
}
