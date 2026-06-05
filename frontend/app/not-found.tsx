'use client'
import Link from 'next/link'
import { GraduationCap, Home } from 'lucide-react'
import { useT } from '@/lib/i18n'

export default function NotFound() {
  const { t, lang } = useT()
  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-uni-gold/10 border border-uni-gold/30 mb-6">
          <GraduationCap className="w-8 h-8 text-uni-gold" />
        </div>
        <h1 className="text-6xl font-black text-gold-gradient mb-4">404</h1>
        <h2 className="text-xl font-bold text-uni-text mb-2">{t.errors.pageNotFound}</h2>
        <p className="text-uni-muted text-sm mb-6">{t.errors.pageNotFoundDesc}</p>
        <Link href="/" className="btn-gold px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2">
          <Home className="w-4 h-4" /> {t.errors.goHome}
        </Link>
      </div>
    </div>
  )
}
