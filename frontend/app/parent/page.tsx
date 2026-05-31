'use client'
import { motion } from 'framer-motion'
import { Users, GraduationCap, Shield, BookOpen, TrendingUp, Bell, Lock } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function ParentPortalPage() {
  const features = [
    { icon: TrendingUp, title: 'متابعة الأداء الأكاديمي', desc: 'عرض درجات ومعدل ابنك/ابنتك في الوقت الفعلي', color: 'text-uni-gold', bg: 'bg-uni-gold/10 border-uni-gold/20', available: false },
    { icon: BookOpen, title: 'قائمة المواد الدراسية', desc: 'الاطلاع على جميع المواد المسجلة والجداول', color: 'text-uni-blue', bg: 'bg-uni-blue/10 border-uni-blue/20', available: false },
    { icon: Bell, title: 'التنبيهات الفورية', desc: 'إشعارات فورية عن الغياب والدرجات والمواعيد', color: 'text-uni-green', bg: 'bg-uni-green/10 border-uni-green/20', available: false },
    { icon: Shield, title: 'الرقابة الأبوية', desc: 'مراقبة نشاط الطالب ووقت الدراسة', color: 'text-uni-muted', bg: 'bg-uni-card border-uni-border/20', available: false },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-uni-blue/10 border border-uni-blue/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-uni-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-uni-text">بوابة أولياء الأمور</h1>
            <p className="text-uni-muted text-sm mt-0.5">متابعة مسيرة أبنائكم الأكاديمية</p>
          </div>
        </div>

        {/* Notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-uni border-uni-blue/20 bg-uni-blue/5 flex items-start gap-4"
        >
          <Lock className="w-8 h-8 text-uni-blue flex-shrink-0 mt-1" />
          <div>
            <div className="font-bold text-uni-text">هذه الميزة قيد التطوير</div>
            <p className="text-sm text-uni-muted mt-1 leading-relaxed">
              بوابة أولياء الأمور تتطلب حساباً خاصاً بصلاحيات الولي. في الوقت الحالي، يمكن للطالب مشاركة
              تقاريره مع وليّ أمره عبر خاصية الطباعة في صفحة الدرجات والشهادات.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/student/grades" className="text-xs text-uni-blue hover:underline flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> عرض الدرجات
              </Link>
              <span className="text-uni-muted">•</span>
              <Link href="/student/certificates" className="text-xs text-uni-blue hover:underline flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> الشهادات
              </Link>
              <span className="text-uni-muted">•</span>
              <Link href="/student/analytics" className="text-xs text-uni-blue hover:underline flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> التحليلات
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Features coming soon */}
        <div>
          <h2 className="text-sm font-bold text-uni-muted uppercase tracking-wide mb-3">مزايا قادمة</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card-uni ${f.bg} opacity-70`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-uni-text text-sm">{f.title}</div>
                    <p className="text-xs text-uni-muted mt-1">{f.desc}</p>
                    <span className="text-[10px] text-uni-muted border border-uni-border/30 rounded px-1.5 py-0.5 mt-2 inline-block">قريباً</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How to register */}
        <div className="card-uni">
          <h3 className="font-bold text-uni-text mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-uni-gold" /> كيفية تسجيل ولي الأمر
          </h3>
          <ol className="space-y-2 text-sm text-uni-muted">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-uni-gold/20 text-uni-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
              <span>تواصل مع إدارة الجامعة وقدم طلب تسجيل ولي أمر</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-uni-gold/20 text-uni-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
              <span>أرفق وثيقة إثبات صلة القرابة بالطالب</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-uni-gold/20 text-uni-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
              <span>ستصلك بيانات الدخول على بريدك الإلكتروني</span>
            </li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  )
}
