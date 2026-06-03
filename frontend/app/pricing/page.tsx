'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Crown, Zap, Globe, GraduationCap, BookOpen, Award, ArrowLeft, Tag, Star } from 'lucide-react'

const ENGLISH_PLANS = [
  {
    name: 'مجاني للأبد',
    badge: 'مجاناً',
    badgeColor: 'bg-uni-green/20 text-uni-green border-uni-green/30',
    price: 0,
    priceLabel: 'مجاناً',
    description: 'ابدأ رحلتك مع الإنجليزي بدون أي تكلفة',
    levels: 'مستويا A1 و A2',
    icon: Globe,
    iconColor: 'text-uni-green',
    features: ['محادثات مع الذكاء الاصطناعي', 'اختبارات تفاعلية', 'تتبّع التقدم', 'شهادة إتمام رقمية'],
    cta: 'ابدأ مجاناً',
    ctaLink: '/auth/register',
    highlight: false,
  },
  {
    name: 'مستوى واحد',
    badge: '⭐ الأكثر شيوعاً',
    badgeColor: 'bg-uni-gold/20 text-uni-gold border-uni-gold/30',
    price: 29,
    priceLabel: '$29',
    description: 'اختر أي مستوى من B1 إلى C2 وأتقنه',
    levels: 'B1 أو B2 أو C1 أو C2',
    icon: Zap,
    iconColor: 'text-uni-gold',
    features: ['كل مزايا الخطة المجانية', 'محاضرات متقدمة', 'تمارين مكثّفة', 'شهادة معتمدة للمستوى', 'دعم أولوية'],
    cta: 'اشترِ الآن',
    ctaLink: '/auth/register',
    highlight: true,
  },
  {
    name: 'الباقة الكاملة',
    badge: '🔥 أفضل قيمة',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    price: 99,
    priceLabel: '$99',
    originalPrice: '$116',
    description: 'من B1 إلى C2 — أتقن الإنجليزية للأبد',
    levels: 'جميع المستويات B1 → C2',
    icon: Crown,
    iconColor: 'text-purple-400',
    features: ['كل مزايا الخطط السابقة', 'جميع المستويات الأربعة', 'شهادات B2 و C1 و C2', 'وصول مدى الحياة', 'وفّر $17'],
    cta: 'احصل على الباقة',
    ctaLink: '/auth/register',
    highlight: false,
  },
]

const UNI_PLANS = [
  { icon: GraduationCap, label: 'التسجيل الجامعي', price: '$20', note: 'مرة واحدة فقط', color: 'text-uni-blue', desc: 'ادخل عالم الجامعة الافتراضية' },
  { icon: BookOpen, label: 'اختبار المادة', price: '$15', note: 'لكل اختبار', color: 'text-uni-gold', desc: 'ادفع فقط عند استعدادك للاختبار' },
  { icon: Star, label: 'باقة الفصل', price: '$50', note: '5 اختبارات', color: 'text-uni-green', desc: 'وفّر $25 مقارنة بالدفع الفردي' },
  { icon: Award, label: 'الشهادات', price: 'من $199', note: 'دبلوم / بكالوريوس', color: 'text-purple-400', desc: 'شهادات رسمية موثّقة رقمياً' },
]

const FAQS = [
  { q: 'هل يمكنني البدء مجاناً؟', a: 'نعم! مستويا A1 و A2 للغة الإنجليزية مجانيان تماماً بدون أي بطاقة ائتمانية.' },
  { q: 'متى أدفع للجامعة؟', a: 'تدفع رسوم التسجيل مرة واحدة ($20)، ثم تدفع فقط عند طلب اختبار كل مادة ($15). لا مصاريف خفية.' },
  { q: 'هل الشهادات معتمدة؟', a: 'نعم، جميع شهاداتنا موثّقة رقمياً وقابلة للتحقق الفوري برمز QR.' },
  { q: 'هل يوجد ضمان استرداد؟', a: 'نعم، ضمان استرداد كامل خلال 7 أيام من الشراء بدون أسئلة.' },
]

export default function PricingPage() {
  const [tab, setTab] = useState<'english' | 'university'>('english')
  const [promoInput, setPromoInput] = useState('')

  return (
    <div className="min-h-screen bg-uni-dark" dir="rtl">
      {/* Navbar */}
      <nav className="border-b border-uni-border/20 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-uni-dark" />
          </div>
          <span className="font-black text-gold-gradient">مملكة الأرض</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-uni-muted hover:text-uni-gold text-sm transition-colors">تسجيل الدخول</Link>
          <Link href="/auth/register" className="btn-gold px-4 py-2 rounded-xl text-sm font-bold">ابدأ مجاناً</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-glow-gold opacity-20" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-uni-gold/10 border border-uni-gold/30 text-uni-gold text-xs font-bold mb-4">
            🎓 التعليم الذكي بأسعار عادلة
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-uni-text mb-4">
            التعليم الحقيقي<br />
            <span className="text-gold-gradient">بأسعار حقيقية</span>
          </h1>
          <p className="text-uni-muted text-lg max-w-xl mx-auto">
            ابدأ مجاناً، وادفع فقط عندما تكون جاهزاً للمضي قُدُماً
          </p>
        </motion.div>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center mb-10 px-4">
        <div className="flex bg-uni-card/50 border border-uni-border/30 rounded-2xl p-1">
          {(['english', 'university'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t ? 'bg-uni-gold text-uni-dark' : 'text-uni-muted hover:text-uni-text'
              }`}
            >
              {t === 'english' ? '🌍 اللغة الإنجليزية' : '🎓 الجامعة'}
            </button>
          ))}
        </div>
      </div>

      {/* English Plans */}
      {tab === 'english' && (
        <div className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ENGLISH_PLANS.map((plan, i) => {
              const Icon = plan.icon
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative rounded-2xl p-6 border flex flex-col ${
                    plan.highlight
                      ? 'bg-uni-gold/5 border-uni-gold/40 shadow-[0_0_30px_rgba(212,160,23,0.15)]'
                      : 'bg-uni-card/40 border-uni-border/30'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-uni-gold rounded-full text-uni-dark text-xs font-black">
                      الأكثر شيوعاً ⭐
                    </div>
                  )}
                  <span className={`inline-block self-start px-3 py-1 rounded-full border text-xs font-bold mb-4 ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  <div className={`w-10 h-10 rounded-xl bg-uni-card/50 flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-black text-uni-text mb-1">{plan.name}</h3>
                  <p className="text-xs text-uni-muted mb-4">{plan.description}</p>
                  <div className="mb-1">
                    <span className="text-4xl font-black text-gold-gradient">{plan.priceLabel}</span>
                    {plan.originalPrice && (
                      <span className="text-sm text-uni-muted line-through mr-2">{plan.originalPrice}</span>
                    )}
                  </div>
                  <p className="text-xs text-uni-muted mb-5">{plan.levels}</p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-uni-text">
                        <Check className="w-4 h-4 text-uni-green flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.ctaLink}
                    className={`w-full py-3 rounded-xl font-bold text-center text-sm transition-all ${
                      plan.highlight ? 'btn-gold' : 'border border-uni-border/40 text-uni-text hover:border-uni-gold/40 hover:text-uni-gold'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* University Plans */}
      {tab === 'university' && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {UNI_PLANS.map((plan, i) => {
              const Icon = plan.icon
              return (
                <motion.div
                  key={plan.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="card-uni hover:border-uni-gold/20 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-uni-card/50 flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <div className="text-3xl font-black text-gold-gradient mb-1">{plan.price}</div>
                  <div className="text-xs text-uni-muted mb-2">{plan.note}</div>
                  <div className="font-bold text-uni-text text-sm mb-1">{plan.label}</div>
                  <p className="text-xs text-uni-muted">{plan.desc}</p>
                </motion.div>
              )
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/auth/register" className="btn-gold px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2">
              <GraduationCap className="w-5 h-5" /> سجّل في الجامعة — $20 فقط
            </Link>
          </div>
        </div>
      )}

      {/* Promo Code */}
      <div className="max-w-md mx-auto px-4 mb-16">
        <div className="card-uni text-center">
          <Tag className="w-6 h-6 text-uni-gold mx-auto mb-2" />
          <h3 className="font-bold text-uni-text mb-1">لديك كوبون خصم؟</h3>
          <p className="text-xs text-uni-muted mb-4">أدخل الكوبون عند الشراء للحصول على خصمك</p>
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={e => setPromoInput(e.target.value.toUpperCase())}
              placeholder="مثال: WELCOME50"
              className="flex-1 bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm outline-none focus:border-uni-gold text-center font-mono tracking-widest"
            />
            <Link
              href="/auth/register"
              className="btn-gold px-4 py-2 rounded-xl text-sm font-bold"
            >
              تطبيق
            </Link>
          </div>
          <p className="text-xs text-uni-muted mt-2">جرّب: <span className="text-uni-gold font-mono">WELCOME50</span> لخصم 50%</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-black text-uni-text text-center mb-8">أسئلة شائعة</h2>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-uni"
            >
              <h4 className="font-bold text-uni-text text-sm mb-2">{faq.q}</h4>
              <p className="text-uni-muted text-sm leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center py-16 px-4 border-t border-uni-border/20">
        <h2 className="text-3xl font-black text-uni-text mb-4">جاهز للبدء؟</h2>
        <p className="text-uni-muted mb-8">انضم لآلاف الطلاب الذين يتعلمون الآن</p>
        <Link href="/auth/register" className="btn-gold px-10 py-4 rounded-2xl font-black text-lg inline-flex items-center gap-3">
          <GraduationCap className="w-6 h-6" />
          سجّل مجاناً الآن
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}
