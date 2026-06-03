'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, GraduationCap, Shield, Edit3, Save, X, BookOpen, Hash, Trophy, Camera } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/lib/store'
import api, { authAPI, studentAPI } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name_ar: user?.first_name_ar || '',
    last_name_ar: user?.last_name_ar || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  })
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authAPI.updateProfile(form)
      updateUser(res.data)
      setEditing(false)
      setMsg('تم حفظ التغييرات بنجاح')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('حدث خطأ أثناء الحفظ')
    }
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/auth/upload-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('تم تحديث الصورة الشخصية')
      const url = res.data.avatar_url
      if (url) {
        // Force re-render by updating a local state or refetching
      }
    } catch {
      toast.error('فشل رفع الصورة')
    }
  }

  const { data: gamData } = useQuery({
    queryKey: ['gamification-profile'],
    queryFn: () => studentAPI.getGamification().then(r => r.data),
  })

  const roleLabel: Record<string, string> = {
    student: 'طالب',
    admin: 'مدير',
    superadmin: 'مدير أعلى',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">ملفي الشخصي</h1>
            <p className="text-uni-muted text-sm mt-1">بياناتك الشخصية والأكاديمية</p>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-uni-gold/10 border border-uni-gold/20 text-uni-gold text-sm hover:bg-uni-gold/20 transition-all">
              <Edit3 className="w-4 h-4" /> تعديل
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-uni-border/30 text-uni-muted text-sm hover:bg-uni-border/50 transition-all">
                <X className="w-4 h-4" /> إلغاء
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-uni-gold text-uni-dark text-sm font-bold hover:bg-uni-gold-light transition-all disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          )}
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm text-center ${msg.includes('خطأ') ? 'bg-uni-red/10 text-uni-red border border-uni-red/20' : 'bg-uni-green/10 text-uni-green border border-uni-green/20'}`}>
            {msg}
          </div>
        )}

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-uni text-center py-8">
          <div className="w-20 h-20 rounded-full bg-uni-gold/20 border-2 border-uni-gold/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-black text-uni-gold">
              {(user?.first_name_ar || user?.first_name || '?').charAt(0)}
            </span>
          </div>
          <h2 className="text-xl font-black text-uni-text">{user?.first_name_ar} {user?.last_name_ar}</h2>
          <p className="text-uni-muted text-sm">{user?.email}</p>
          <span className="badge-gold mt-2 inline-block">{roleLabel[user?.role || 'student']}</span>
          <label className="cursor-pointer text-xs text-uni-gold hover:underline flex items-center gap-1 justify-center mt-2">
            <Camera className="w-3 h-3" />
            تغيير الصورة
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </motion.div>

        {/* Info Fields */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-uni space-y-4">
          <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-uni-gold" /> البيانات الشخصية
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'الاسم الأول (عربي)', key: 'first_name_ar' },
              { label: 'اسم العائلة (عربي)', key: 'last_name_ar' },
              { label: 'First Name', key: 'first_name' },
              { label: 'Last Name', key: 'last_name' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs text-uni-muted mb-1 block">{label}</label>
                {editing ? (
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-uni-card/50 text-uni-text text-sm border border-uni-border/30">
                    {form[key as keyof typeof form] || '—'}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-uni-muted mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> رقم الجوال</label>
            {editing ? (
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
              />
            ) : (
              <div className="px-3 py-2 rounded-xl bg-uni-card/50 text-uni-text text-sm border border-uni-border/30">
                {form.phone || '—'}
              </div>
            )}
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-uni space-y-3">
          <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-uni-gold" /> بيانات الحساب
          </h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
            <Mail className="w-4 h-4 text-uni-muted" />
            <div>
              <div className="text-xs text-uni-muted">البريد الإلكتروني</div>
              <div className="text-sm text-uni-text">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
            <GraduationCap className="w-4 h-4 text-uni-muted" />
            <div>
              <div className="text-xs text-uni-muted">نوع الحساب</div>
              <div className="text-sm text-uni-text">{roleLabel[user?.role || 'student']}</div>
            </div>
          </div>
          {user?.program_name && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
              <BookOpen className="w-4 h-4 text-uni-muted" />
              <div>
                <div className="text-xs text-uni-muted">التخصص</div>
                <div className="text-sm text-uni-text">{user.program_name}</div>
              </div>
            </div>
          )}
          {user?.student_id && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
              <Hash className="w-4 h-4 text-uni-muted" />
              <div>
                <div className="text-xs text-uni-muted">الرقم الجامعي</div>
                <div className="text-sm text-uni-text font-mono">{user.student_id}</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
            <Shield className="w-4 h-4 text-uni-muted" />
            <div>
              <div className="text-xs text-uni-muted">حالة الحساب</div>
              <div className="text-sm text-uni-green font-semibold">نشط ✓</div>
            </div>
          </div>
        </motion.div>

        {/* Achievements Summary */}
        {gamData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-uni">
            <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-uni-gold" /> إنجازاتي
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-black text-gold-gradient">{(gamData as Record<string, unknown>).total_points as number}</div>
                <div className="text-xs text-uni-muted">نقطة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-uni-text">المستوى {(gamData as Record<string, unknown>).level as number}</div>
                <div className="text-xs text-uni-muted">{(gamData as Record<string, unknown>).level_name as string}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-uni-text">{(gamData as Record<string, unknown>).earned_badges_count as number}</div>
                <div className="text-xs text-uni-muted">شارة</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {((gamData as Record<string, unknown>).badges as Record<string, unknown>[])?.filter(b => b.earned).map((b, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-uni-gold/10 border border-uni-gold/20">
                  <span className="text-sm">{b.icon as string}</span>
                  <span className="text-xs text-uni-gold font-medium">{b.name as string}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
