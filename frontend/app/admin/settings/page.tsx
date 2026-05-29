'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Shield, Bell, Globe, Database, Key, Save } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sections = [
    {
      icon: Globe,
      title: 'إعدادات الجامعة',
      color: 'text-uni-gold',
      items: [
        { label: 'اسم الجامعة', value: 'جامعة مملكة الأرض الافتراضية', type: 'text' },
        { label: 'University Name', value: 'Virtual Earth Kingdom University', type: 'text' },
        { label: 'اللغة الافتراضية', value: 'arabic', type: 'select', options: ['arabic', 'english', 'both'] },
      ],
    },
    {
      icon: Shield,
      title: 'إعدادات الأمان',
      color: 'text-uni-blue',
      items: [
        { label: 'مدة صلاحية الجلسة (بالدقائق)', value: '60', type: 'number' },
        { label: 'الحد الأقصى لمحاولات تسجيل الدخول', value: '5', type: 'number' },
        { label: 'التحقق بخطوتين', value: 'false', type: 'select', options: ['true', 'false'] },
      ],
    },
    {
      icon: Bell,
      title: 'الإشعارات',
      color: 'text-uni-purple',
      items: [
        { label: 'إشعارات البريد الإلكتروني', value: 'true', type: 'select', options: ['true', 'false'] },
        { label: 'إشعارات الاختبارات', value: 'true', type: 'select', options: ['true', 'false'] },
      ],
    },
    {
      icon: Key,
      title: 'مفاتيح API',
      color: 'text-uni-green',
      items: [
        { label: 'ANTHROPIC_API_KEY', value: '••••••••••••••••', type: 'password' },
      ],
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-uni-text">إعدادات النظام</h1>
            <p className="text-uni-muted text-sm mt-1">إدارة إعدادات الجامعة والنظام</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-sm font-bold"
          >
            <Save className="w-4 h-4" />
            {saved ? 'تم الحفظ ✓' : 'حفظ التغييرات'}
          </button>
        </div>

        {sections.map((section, si) => (
          <motion.div key={si} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }}
            className="card-uni">
            <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
              <section.icon className={`w-4 h-4 ${section.color}`} />
              {section.title}
            </h3>
            <div className="space-y-4">
              {section.items.map((item, ii) => (
                <div key={ii}>
                  <label className="text-xs text-uni-muted mb-1 block">{item.label}</label>
                  {item.type === 'select' ? (
                    <select
                      defaultValue={item.value}
                      className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                    >
                      {item.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={item.type}
                      defaultValue={item.value}
                      className="w-full bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm focus:border-uni-gold outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* System Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card-uni border-uni-border/20 bg-uni-card/30">
          <h3 className="font-bold text-uni-text flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-uni-muted" />
            معلومات النظام
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'الإصدار', value: 'v1.0.0' },
              { label: 'البيئة', value: 'Production' },
              { label: 'قاعدة البيانات', value: 'PostgreSQL' },
              { label: 'الخادم', value: 'FastAPI + Next.js' },
            ].map((info, i) => (
              <div key={i} className="p-3 rounded-xl bg-uni-border/10">
                <div className="text-xs text-uni-muted mb-1">{info.label}</div>
                <div className="text-uni-text font-mono text-xs">{info.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
