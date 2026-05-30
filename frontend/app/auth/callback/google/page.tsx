'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError('تم إلغاء تسجيل الدخول عبر Google')
      setTimeout(() => router.push('/auth/login'), 2000)
      return
    }

    if (!code) {
      setError('رمز التحقق غير موجود')
      setTimeout(() => router.push('/auth/login'), 2000)
      return
    }

    const redirectUri = `${window.location.origin}/auth/callback/google`
    authAPI.googleAuth(code, redirectUri)
      .then(res => {
        const { user, access_token, refresh_token } = res.data
        setAuth(user, access_token, refresh_token)
        toast.success(`مرحباً ${user.first_name_ar || user.first_name}! 👋`)
        const dest = (user.role === 'admin' || user.role === 'superadmin') ? '/admin/dashboard' : '/student/dashboard'
        router.push(dest)
      })
      .catch(err => {
        const msg = err?.response?.data?.detail || 'فشل تسجيل الدخول عبر Google'
        setError(msg)
        setTimeout(() => router.push('/auth/login'), 3000)
      })
  }, [searchParams, router, setAuth])

  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-9 h-9 text-uni-dark" />
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-uni-red" />
            <p className="text-uni-red font-semibold">{error}</p>
            <p className="text-uni-muted text-sm">جاري إعادة التوجيه...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-uni-gold animate-spin" />
            <p className="text-uni-text font-semibold">جاري تسجيل الدخول عبر Google...</p>
          </div>
        )}
      </div>
    </div>
  )
}
