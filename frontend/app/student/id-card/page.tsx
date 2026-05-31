'use client'
import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Download, GraduationCap, QrCode } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { studentAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function StudentIdCardPage() {
  const { user } = useAuthStore()
  const cardRef = useRef<HTMLDivElement>(null)

  const { data: dashData } = useQuery({
    queryKey: ['dashboard-id'],
    queryFn: () => studentAPI.getDashboard().then(r => r.data),
  })

  const profile = (dashData?.profile || {}) as Record<string, unknown>
  const program = String(profile.program_name || user?.program_name || 'البرنامج الدراسي')
  const studentId = String(profile.student_id || profile.id || user?.id || '---')
  const name = String(profile.full_name_ar || user?.first_name_ar || user?.first_name || 'الطالب')
  const faculty = String(profile.faculty_name || 'الكلية')
  const year = String(profile.academic_year || 'السنة الأولى')
  const validUntil = new Date(Date.now() + 365 * 24 * 3600000).toLocaleDateString('ar-SA')

  const printCard = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !cardRef.current) return
    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بطاقة الطالب</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
    body { font-family: 'Cairo', sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f0f0; }
    .id-card { background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%); border: 2px solid #d4a017; border-radius: 16px; padding: 24px; width: 360px; color: white; }
    .header { border-bottom: 1px solid rgba(212,160,23,0.3); padding-bottom: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #d4a017, #b8860b); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .uni-name { font-size: 14px; font-weight: 900; color: #d4a017; }
    .sub { font-size: 10px; color: #888; }
    .photo { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #d4a017; background: #1a1f35; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 12px auto; }
    .sname { font-size: 20px; font-weight: 900; color: white; text-align: center; }
    .sid { font-size: 12px; color: #d4a017; text-align: center; letter-spacing: 2px; margin: 4px 0; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; font-size: 11px; }
    .info-item label { color: #888; display: block; }
    .info-item span { color: white; font-weight: 700; }
    .footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(212,160,23,0.3); display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #888; }
    @media print { body { background: white; } }
  </style>
</head>
<body>
<div class="id-card">
  <div class="header">
    <div class="logo">🎓</div>
    <div>
      <div class="uni-name">جامعة مملكة الأرض</div>
      <div class="sub">الجامعة الافتراضية</div>
    </div>
  </div>
  <div class="photo">👤</div>
  <div class="sname">${name}</div>
  <div class="sid">${studentId}</div>
  <div class="info">
    <div class="info-item"><label>البرنامج</label><span>${program}</span></div>
    <div class="info-item"><label>الكلية</label><span>${faculty}</span></div>
    <div class="info-item"><label>السنة الدراسية</label><span>${year}</span></div>
    <div class="info-item"><label>صالحة حتى</label><span>${validUntil}</span></div>
  </div>
  <div class="footer">
    <span>جامعة مملكة الأرض الافتراضية</span>
    <span>s7sai.cloud</span>
  </div>
</div>
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg mx-auto">
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-uni-gold" /> بطاقتي الجامعية
          </h1>
          <p className="text-uni-muted text-sm mt-1">بطاقة هوية الطالب الرسمية</p>
        </div>

        {/* The ID Card */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl border-2 border-uni-gold/40 bg-gradient-to-br from-uni-dark to-[#1a1f35] p-6 shadow-2xl"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #d4a017 1px, transparent 1px), radial-gradient(circle at 80% 50%, #d4a017 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-uni-gold/20 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-uni-dark" />
            </div>
            <div>
              <div className="text-sm font-black text-gold-gradient">جامعة مملكة الأرض</div>
              <div className="text-xs text-uni-muted">الجامعة الافتراضية</div>
            </div>
            <div className="mr-auto">
              <div className="text-xs text-uni-muted text-left">بطاقة طالب</div>
              <div className="text-xs text-uni-gold text-left font-bold">Student ID</div>
            </div>
          </div>

          {/* Photo + Name */}
          <div className="flex items-center gap-5 mb-5">
            <div className="w-20 h-20 rounded-full border-2 border-uni-gold/50 bg-uni-card flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-uni-gold">
                  {name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-black text-uni-text leading-tight truncate">{name}</div>
              <div className="text-sm text-uni-gold mt-1 font-mono tracking-widest">#{studentId}</div>
              <div className="mt-2">
                <span className="badge-gold text-xs">{program}</span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'الكلية', value: faculty },
              { label: 'السنة الدراسية', value: year },
              { label: 'تاريخ الإصدار', value: new Date().toLocaleDateString('ar-SA') },
              { label: 'صالحة حتى', value: validUntil },
            ].map((item, i) => (
              <div key={i} className="p-2 rounded-lg bg-uni-card/50 border border-uni-border/20">
                <div className="text-xs text-uni-muted">{item.label}</div>
                <div className="text-xs font-bold text-uni-text mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-uni-gold/20">
            <div className="flex items-center gap-1 text-xs text-uni-muted">
              <QrCode className="w-4 h-4" />
              <span>s7sai.cloud</span>
            </div>
            <div className="text-xs text-uni-muted">جامعة مملكة الأرض الافتراضية</div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={printCard}
            className="flex-1 flex items-center justify-center gap-2 btn-gold py-3 rounded-xl text-sm font-bold"
          >
            <Download className="w-4 h-4" /> طباعة البطاقة
          </button>
        </div>

        <div className="card-uni text-sm text-uni-muted space-y-1">
          <p className="font-bold text-uni-text text-xs">ملاحظات مهمة:</p>
          <p className="text-xs">• احتفظ بهذه البطاقة معك دائماً داخل الحرم الجامعي</p>
          <p className="text-xs">• البطاقة شخصية وغير قابلة للتحويل</p>
          <p className="text-xs">• في حال الفقدان، تواصل مع إدارة القبول والتسجيل</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
