'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserCheck, UserX, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface PendingEnrollment {
  id: number
  student_name: string
  student_id: string
  course_name: string
  course_code: string
  section_id: number
  enrolled_at: string
}

export default function AdminEnrollmentsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery<PendingEnrollment[]>({
    queryKey: ['admin-pending-enrollments'],
    queryFn: () => api.get('/admin/enrollments/pending').then(r => r.data),
  })

  const pendingEnrollments: PendingEnrollment[] = data || []

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/enrollments/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-enrollments'] })
      toast.success('تمت الموافقة على طلب التسجيل')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الموافقة')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/enrollments/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-enrollments'] })
      toast.success('تم رفض طلب التسجيل')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الرفض')
    },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-3">
              <Clock className="w-7 h-7 text-uni-gold" />
              طلبات التسجيل المعلّقة
              {pendingEnrollments.length > 0 && (
                <span className="badge-gold text-sm">{pendingEnrollments.length}</span>
              )}
            </h1>
            <p className="text-uni-muted text-sm mt-1">راجع طلبات تسجيل الطلاب وافق أو ارفض كل طلب</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-gold flex items-center gap-2 text-sm px-4 py-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-uni animate-pulse">
                <div className="h-5 bg-uni-border/40 rounded w-1/3 mb-2" />
                <div className="h-4 bg-uni-border/30 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : pendingEnrollments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-uni text-center py-16"
          >
            <CheckCircle className="w-14 h-14 mx-auto mb-4 text-uni-gold opacity-40" />
            <p className="text-uni-text font-bold text-lg">لا توجد طلبات معلّقة</p>
            <p className="text-uni-muted text-sm mt-1">جميع طلبات التسجيل تمت معالجتها</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {pendingEnrollments.map((enrollment, i) => (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-uni flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                {/* Student info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-uni-text font-bold">{enrollment.student_name}</span>
                    {enrollment.student_id && (
                      <span className="badge-blue text-xs font-mono">{enrollment.student_id}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm text-uni-muted">
                    <span className="font-semibold text-uni-text">{enrollment.course_name}</span>
                    {enrollment.course_code && (
                      <span className="text-xs text-uni-muted">({enrollment.course_code})</span>
                    )}
                  </div>
                  {enrollment.enrolled_at && (
                    <p className="text-xs text-uni-muted mt-1">
                      تاريخ الطلب: {enrollment.enrolled_at}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(enrollment.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserCheck className="w-4 h-4" />
                    موافقة
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(enrollment.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-uni-red/15 text-uni-red hover:bg-uni-red/25 border border-uni-red/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserX className="w-4 h-4" />
                    رفض
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
