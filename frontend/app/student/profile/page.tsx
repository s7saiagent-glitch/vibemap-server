'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, GraduationCap, Shield, Edit3, Save, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/lib/store'
import { authAPI } from '@/lib/api'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
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
      setUser(res.data)
      setEditing(false)
      setMsg('تم حفظ التغييرات بنجاح')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('حدث خطأ أثناء الحفظ')
    }
    setSaving(false)
  }

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
          <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-card/50 border border-uni-border/30">
            <Shield className="w-4 h-4 text-uni-muted" />
            <div>
              <div className="text-xs text-uni-muted">حالة الحساب</div>
              <div className="text-sm text-uni-green font-semibold">نشط ✓</div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
