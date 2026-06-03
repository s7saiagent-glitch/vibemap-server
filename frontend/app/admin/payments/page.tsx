'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CreditCard, TrendingUp, Users, DollarSign, Tag,
  Plus, RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import api from '@/lib/api'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueStats {
  total_revenue: number
  total_transactions: number
  this_month: number
  conversion_rate: number
  recent_payments?: PaymentRecord[]
}

interface PromoCode {
  id: number
  code: string
  discount_percent: number
  max_uses: number
  current_uses: number
  description: string
  is_active: boolean
  created_at?: string
}

interface PaymentRecord {
  id: number
  user_email?: string
  product_type: string
  product_id: string
  amount: number
  status: string
  created_at: string
}

interface NewPromoForm {
  code: string
  discount_percent: number
  max_uses: number
  description: string
}

// ─── Revenue Stats Cards ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="card-uni flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-uni-muted text-xs mb-0.5">{label}</p>
        <p className="text-uni-text font-black text-xl">{value}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const [promoForm, setPromoForm] = useState<NewPromoForm>({
    code: '',
    discount_percent: 10,
    max_uses: 100,
    description: '',
  })

  // Revenue stats
  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueStats>({
    queryKey: ['admin-revenue'],
    queryFn: () => api.get('/payments/admin/revenue').then(r => r.data),
    retry: false,
  })

  // Promo codes
  const { data: promoCodes, isLoading: promoLoading } = useQuery<PromoCode[]>({
    queryKey: ['admin-promo-codes'],
    queryFn: () => api.get('/payments/admin/promo-codes').then(r => r.data),
    retry: false,
  })

  // Create promo code mutation
  const createPromoMutation = useMutation({
    mutationFn: (data: NewPromoForm) => api.post('/payments/admin/promo-codes', data).then(r => r.data),
    onSuccess: () => {
      toast.success('تم إنشاء كود الخصم بنجاح!')
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] })
      setPromoForm({ code: '', discount_percent: 10, max_uses: 100, description: '' })
    },
    onError: () => {
      toast.error('فشل إنشاء كود الخصم')
    },
  })

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!promoForm.code.trim()) { toast.error('أدخل كود الخصم'); return }
    createPromoMutation.mutate(promoForm)
  }

  const stats = revenueData || { total_revenue: 0, total_transactions: 0, this_month: 0, conversion_rate: 0 }
  const payments: PaymentRecord[] = revenueData?.recent_payments || []
  const codes: PromoCode[] = promoCodes || []

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl" dir="rtl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-black text-uni-text flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-uni-gold" />
            المدفوعات والكوبونات
          </h1>
          <p className="text-uni-muted text-sm mt-1">إدارة الإيرادات وأكواد الخصم</p>
        </div>

        {/* ─── Section 1: Revenue Stats ─────────────────────────────────────── */}
        <section>
          <h2 className="font-bold text-uni-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-uni-gold" /> إحصائيات الإيرادات
          </h2>
          {revenueLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 glass rounded-2xl shimmer" />)}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={DollarSign}
                label="إجمالي الإيرادات"
                value={`$${Number(stats.total_revenue || 0).toLocaleString()}`}
                color="bg-uni-gold/10 text-uni-gold border border-uni-gold/20"
              />
              <StatCard
                icon={CreditCard}
                label="إجمالي المعاملات"
                value={stats.total_transactions || 0}
                color="bg-uni-blue/10 text-uni-blue border border-uni-blue/20"
              />
              <StatCard
                icon={TrendingUp}
                label="هذا الشهر"
                value={`$${Number(stats.this_month || 0).toLocaleString()}`}
                color="bg-green-500/10 text-green-400 border border-green-500/20"
              />
              <StatCard
                icon={Users}
                label="معدل التحويل"
                value={`${Number(stats.conversion_rate || 0).toFixed(1)}%`}
                color="bg-violet-500/10 text-violet-400 border border-violet-500/20"
              />
            </motion.div>
          )}
        </section>

        {/* ─── Section 2: Promo Codes Management ────────────────────────────── */}
        <section>
          <h2 className="font-bold text-uni-text mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-uni-gold" /> أكواد الخصم
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Create new promo code */}
            <div className="card-uni">
              <h3 className="font-bold text-uni-text mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-uni-gold" /> إنشاء كود خصم جديد
              </h3>
              <form onSubmit={handleCreatePromo} className="space-y-4">
                <div>
                  <label className="block text-xs text-uni-muted mb-1">كود الخصم *</label>
                  <input
                    value={promoForm.code}
                    onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="مثال: SAVE20"
                    dir="ltr"
                    className="w-full bg-uni-dark border border-uni-border rounded-xl px-3 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors font-mono uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-uni-muted mb-1">نسبة الخصم %</label>
                    <input
                      type="number" min={1} max={100}
                      value={promoForm.discount_percent}
                      onChange={e => setPromoForm(f => ({ ...f, discount_percent: Number(e.target.value) }))}
                      className="w-full bg-uni-dark border border-uni-border rounded-xl px-3 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-uni-muted mb-1">الحد الأقصى للاستخدام</label>
                    <input
                      type="number" min={1}
                      value={promoForm.max_uses}
                      onChange={e => setPromoForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                      className="w-full bg-uni-dark border border-uni-border rounded-xl px-3 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-uni-muted mb-1">الوصف</label>
                  <input
                    value={promoForm.description}
                    onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="وصف الكود..."
                    className="w-full bg-uni-dark border border-uni-border rounded-xl px-3 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
                  />
                </div>
                <button type="submit" disabled={createPromoMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-uni-gold text-uni-dark text-sm font-bold hover:bg-uni-gold-light transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {createPromoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إنشاء الكود
                </button>
              </form>
            </div>

            {/* Existing promo codes list */}
            <div className="card-uni">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-uni-text flex items-center gap-2">
                  <Tag className="w-4 h-4 text-uni-gold" /> الأكواد الحالية
                </h3>
                <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] })}
                  className="text-uni-muted hover:text-uni-text transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {promoLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 glass rounded-xl shimmer" />)}
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-uni-muted mx-auto mb-2" />
                  <p className="text-uni-muted text-sm">لا توجد أكواد خصم بعد</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {codes.map(code => (
                    <div key={code.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-uni-dark border border-uni-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-uni-gold text-sm" dir="ltr">{code.code}</span>
                          {code.is_active
                            ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            : <XCircle className="w-3.5 h-3.5 text-uni-red" />}
                        </div>
                        <p className="text-xs text-uni-muted truncate">{code.description}</p>
                      </div>
                      <div className="text-left mr-2 flex-shrink-0">
                        <div className="text-uni-gold font-bold text-sm">{code.discount_percent}%</div>
                        <div className="text-xs text-uni-muted">{code.current_uses || 0}/{code.max_uses}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Section 3: Payment History ────────────────────────────────────── */}
        <section>
          <h2 className="font-bold text-uni-text mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-uni-gold" /> سجل المدفوعات الأخيرة
          </h2>
          <div className="card-uni overflow-hidden">
            {revenueLoading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 glass rounded-xl shimmer" />)}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-uni-muted mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-uni-text mb-1">لا توجد مدفوعات بعد</h3>
                <p className="text-uni-muted text-sm">ستظهر هنا المعاملات المالية</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-uni-border/30">
                      <th className="text-right py-3 px-4 text-xs text-uni-muted font-semibold">المستخدم</th>
                      <th className="text-right py-3 px-4 text-xs text-uni-muted font-semibold">المنتج</th>
                      <th className="text-right py-3 px-4 text-xs text-uni-muted font-semibold">المبلغ</th>
                      <th className="text-right py-3 px-4 text-xs text-uni-muted font-semibold">الحالة</th>
                      <th className="text-right py-3 px-4 text-xs text-uni-muted font-semibold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id} className="border-b border-uni-border/10 hover:bg-uni-card/30 transition-colors">
                        <td className="py-3 px-4 text-uni-text">{payment.user_email || '—'}</td>
                        <td className="py-3 px-4 text-uni-muted">{payment.product_type} / {payment.product_id}</td>
                        <td className="py-3 px-4 text-uni-gold font-bold">${Number(payment.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                            payment.status === 'completed'
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : payment.status === 'pending'
                              ? 'border-uni-gold/30 bg-uni-gold/10 text-uni-gold'
                              : 'border-uni-red/30 bg-uni-red/10 text-uni-red'
                          }`}>
                            {payment.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : payment.status === 'pending' ? <Loader2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {payment.status === 'completed' ? 'مكتمل' : payment.status === 'pending' ? 'قيد الانتظار' : 'فشل'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-uni-muted text-xs">
                          {new Date(payment.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
