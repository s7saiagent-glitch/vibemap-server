export default function Loading() {
  return (
    <div className="min-h-screen bg-uni-dark flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-uni-gold/30 border-t-uni-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-uni-muted text-sm">جاري التحميل...</p>
      </div>
    </div>
  )
}
