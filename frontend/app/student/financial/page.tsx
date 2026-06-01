'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Download, CheckCircle, AlertCircle, Clock,
  DollarSign, FileText, TrendingUp, Info, Banknote
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/lib/store'

type PaymentStatus = 'paid' | 'pending' | 'overdue'

interface Installment {
  id: number
  label: string
  amount: number
  dueDate: string
  paidDate?: string
  status: PaymentStatus
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; badgeClass: string; icon: typeof Clock }> = {
  paid:    { label: 'مدفوع',    badgeClass: 'bg-uni-green/15 text-uni-green border border-uni-green/30',  icon: CheckCircle },
  pending: { label: 'قادم',     badgeClass: 'bg-uni-gold/15 text-uni-gold border border-uni-gold/30',    icon: Clock },
  overdue: { label: 'متأخر',   badgeClass: 'bg-uni-red/15 text-uni-red border border-uni-red/30',       icon: AlertCircle },
}

const INSTALLMENTS: Installment[] = [
  { id: 1, label: 'قسط الفصل الأول', amount: 6000, dueDate: '2024-09-01', paidDate: '2024-08-28', status: 'paid' },
  { id: 2, label: 'قسط الفصل الثاني', amount: 6000, dueDate: '2025-01-15', paidDate: '2025-01-12', status: 'paid' },
  { id: 3, label: 'رسوم الأنشطة', amount: 500, dueDate: '2025-02-01', paidDate: '2025-01-30', status: 'paid' },
  { id: 4, label: 'قسط الفصل الثالث', amount: 5500, dueDate: '2025-06-01', status: 'pending' },
  { id: 5, label: 'رسوم التسجيل', amount: 1500, dueDate: '2025-05-15', status: 'overdue' },
  { id: 6, label: 'قسط الفصل الرابع', amount: 6000, dueDate: '2025-09-01', status: 'pending' },
]

const TOTAL_FEES   = 25500
const TOTAL_PAID   = INSTALLMENTS.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
const REMAINING    = TOTAL_FEES - TOTAL_PAID
const NEXT_PAYMENT = INSTALLMENTS.find(i => i.status === 'pending' || i.status === 'overdue')

function fmt(n: number) {
  return n.toLocaleString('ar-SA') + ' ريال'
}

export default function FinancialPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending'>('all')

  const filtered = activeTab === 'all'
    ? INSTALLMENTS
    : activeTab === 'paid'
      ? INSTALLMENTS.filter(i => i.status === 'paid')
      : INSTALLMENTS.filter(i => i.status !== 'paid')

  const summaryCards = [
    {
      label: 'الرسوم الكلية',
      value: fmt(TOTAL_FEES),
      icon: DollarSign,
      color: 'text-uni-blue',
      bg: 'bg-uni-blue/10',
      border: 'border-uni-blue/20',
    },
    {
      label: 'المدفوع',
      value: fmt(TOTAL_PAID),
      icon: CheckCircle,
      color: 'text-uni-green',
      bg: 'bg-uni-green/10',
      border: 'border-uni-green/20',
    },
    {
      label: 'المتبقي',
      value: fmt(REMAINING),
      icon: TrendingUp,
      color: 'text-uni-gold',
      bg: 'bg-uni-gold/10',
      border: 'border-uni-gold/20',
    },
    {
      label: 'موعد القسط القادم',
      value: NEXT_PAYMENT ? new Date(NEXT_PAYMENT.dueDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
      subValue: NEXT_PAYMENT ? fmt(NEXT_PAYMENT.amount) : undefined,
      icon: Clock,
      color: NEXT_PAYMENT?.status === 'overdue' ? 'text-uni-red' : 'text-uni-muted',
      bg: NEXT_PAYMENT?.status === 'overdue' ? 'bg-uni-red/10' : 'bg-uni-card',
      border: NEXT_PAYMENT?.status === 'overdue' ? 'border-uni-red/20' : 'border-uni-border/30',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-uni-gold" />
              الحساب المالي
            </h1>
            <p className="text-uni-muted text-sm mt-1">
              مرحباً {user?.first_name_ar || user?.first_name} — متابعة الرسوم والأقساط الدراسية
            </p>
          </div>
          <button className="btn-gold px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 flex-shrink-0">
            <Download className="w-4 h-4" />
            تحميل كشف الحساب
          </button>
        </div>

        {/* Progress bar */}
        <div className="card-uni">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-uni-text">نسبة السداد</span>
            <span className="text-sm font-bold text-uni-gold">
              {Math.round((TOTAL_PAID / TOTAL_FEES) * 100)}٪
            </span>
          </div>
          <div className="w-full h-3 bg-uni-border/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(TOTAL_PAID / TOTAL_FEES) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-l from-uni-gold to-yellow-400 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-uni-muted">
            <span>0</span>
            <span>{fmt(TOTAL_FEES)}</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`card-uni border ${card.border} ${card.bg} flex flex-col gap-3`}
              >
                <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-uni-muted">{card.label}</p>
                  <p className={`text-base font-black mt-0.5 ${card.color}`}>{card.value}</p>
                  {card.subValue && (
                    <p className="text-xs text-uni-muted mt-0.5">{card.subValue}</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Payment history */}
        <div className="card-uni">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-uni-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-uni-gold" />
              سجل المدفوعات والأقساط
            </h2>
            <div className="flex gap-1 bg-uni-card border border-uni-border/30 rounded-xl p-1">
              {(['all', 'paid', 'pending'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-uni-gold text-uni-dark'
                      : 'text-uni-muted hover:text-uni-text'
                  }`}
                >
                  {tab === 'all' ? 'الكل' : tab === 'paid' ? 'المدفوع' : 'القادم'}
                </button>
              ))}
            </div>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-4 gap-4 px-3 py-2 text-xs text-uni-muted font-medium border-b border-uni-border/20 mb-1">
            <span>البيان</span>
            <span className="text-center">المبلغ</span>
            <span className="text-center">تاريخ الاستحقاق</span>
            <span className="text-center">الحالة</span>
          </div>

          <div className="space-y-2">
            {filtered.map((item, i) => {
              const status = STATUS_CONFIG[item.status]
              const StatusIcon = status.icon
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center px-3 py-3 rounded-xl hover:bg-uni-border/10 transition-colors border border-transparent hover:border-uni-border/20"
                >
                  {/* Label */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center flex-shrink-0">
                      <Banknote className="w-4 h-4 text-uni-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-uni-text truncate">{item.label}</p>
                      {item.paidDate && (
                        <p className="text-xs text-uni-muted">دُفع: {new Date(item.paidDate).toLocaleDateString('ar-SA')}</p>
                      )}
                    </div>
                  </div>
                  {/* Amount */}
                  <p className="text-sm font-bold text-uni-text text-center">{fmt(item.amount)}</p>
                  {/* Due date */}
                  <p className="text-xs text-uni-muted text-center">
                    {new Date(item.dueDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {/* Status */}
                  <div className="flex justify-center sm:justify-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.badgeClass}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Payment methods info card */}
        <div className="card-uni border-uni-blue/20 bg-uni-blue/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-uni-blue/10 border border-uni-blue/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-uni-blue" />
            </div>
            <div>
              <h3 className="font-bold text-uni-text text-sm mb-2">طرق السداد المتاحة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-uni-muted">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-uni-gold flex-shrink-0" />
                  <span>التحويل البنكي عبر نظام سداد</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-uni-gold flex-shrink-0" />
                  <span>البوابة الإلكترونية للجامعة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-uni-gold flex-shrink-0" />
                  <span>الدفع النقدي في الإدارة المالية</span>
                </div>
              </div>
              <p className="text-xs text-uni-muted mt-3 leading-relaxed">
                للاستفسار أو تسوية أي خلاف مالي، يرجى التواصل مع الإدارة المالية عبر الرقم{' '}
                <span className="text-uni-gold font-semibold">920001234</span>{' '}
                أو البريد الإلكتروني{' '}
                <span className="text-uni-gold font-semibold">finance@university.edu.sa</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
