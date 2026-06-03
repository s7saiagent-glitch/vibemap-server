'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, CreditCard, Tag, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { paymentAPI } from '@/lib/api'

interface PaymentGateProps {
  productKey: string
  productId: string
  title: string
  price: number
  children: React.ReactNode
  hasAccess: boolean
}

export default function PaymentGate({ productKey, productId, title, price, children, hasAccess }: PaymentGateProps) {
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<{ discount: number; description: string } | null>(null)
  const [promoError, setPromoError] = useState('')

  const checkPromo = async () => {
    setPromoError('')
    try {
      const res = await paymentAPI.validatePromo(promoCode, productKey)
      setPromoApplied(res.data)
    } catch {
      setPromoError('كوبون غير صالح أو منتهي الصلاحية')
      setPromoApplied(null)
    }
  }

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await paymentAPI.createSession({
        product_key: productKey,
        product_id: productId,
        promo_code: promoCode || undefined,
        success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/payment/cancel`,
      })
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url
      } else if (res.data.access_granted) {
        window.location.reload()
      }
    },
  })

  if (hasAccess) return <>{children}</>

  const finalPrice = promoApplied ? Math.round(price * (1 - promoApplied.discount / 100)) : price

  return (
    <div className="relative min-h-48">
      <div className="blur-sm pointer-events-none select-none opacity-40" style={{ maxHeight: 180, overflow: 'hidden' }}>
        {children}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-0 flex items-center justify-center bg-uni-dark/70 backdrop-blur-sm rounded-2xl"
      >
        <div className="card-uni max-w-sm w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-uni-gold/10 border border-uni-gold/30 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-uni-gold" />
          </div>
          <h3 className="font-black text-uni-text text-lg mb-1">افتح {title}</h3>
          <div className="mb-4">
            <span className="text-3xl font-black text-gold-gradient">${finalPrice}</span>
            {promoApplied && (
              <span className="text-sm text-uni-muted line-through mr-2">${price}</span>
            )}
          </div>
          {promoApplied && (
            <p className="text-xs text-uni-green mb-3">✅ خصم {promoApplied.discount}% مطبّق — {promoApplied.description}</p>
          )}
          <div className="flex gap-2 mb-3">
            <input
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="كوبون الخصم (اختياري)"
              className="flex-1 bg-uni-card border border-uni-border rounded-xl px-3 py-2 text-uni-text text-sm outline-none focus:border-uni-gold text-center"
            />
            <button
              onClick={checkPromo}
              disabled={!promoCode}
              className="px-3 py-2 border border-uni-border rounded-xl text-uni-muted hover:border-uni-gold hover:text-uni-gold transition-all disabled:opacity-40"
            >
              <Tag className="w-4 h-4" />
            </button>
          </div>
          {promoError && <p className="text-xs text-uni-red mb-3">{promoError}</p>}
          <button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            className="btn-gold w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {payMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري المعالجة...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> ادفع الآن ${finalPrice}</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
