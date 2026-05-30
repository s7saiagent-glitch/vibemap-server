'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Layers, GraduationCap, Award, Users } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { academicAPI } from '@/lib/api'

export default function AdminProgramsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['all-programs'],
    queryFn: () => academicAPI.getPrograms().then(r => r.data),
  })

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => academicAPI.getFaculties().then(r => r.data),
  })

  const programs = data?.programs || data || []
  const facultyList = faculties?.faculties || faculties || []

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-black text-uni-text">التخصصات الأكاديمية</h1>
          <p className="text-uni-muted text-sm mt-1">جميع التخصصات والبرامج الأكاديمية</p>
        </div>

        {/* Faculty Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الكليات', value: facultyList.length, icon: GraduationCap, color: 'text-uni-gold' },
            { label: 'إجمالي التخصصات', value: programs.length, icon: Layers, color: 'text-uni-blue' },
            { label: 'برامج بكالوريوس', value: programs.filter((p: Record<string, unknown>) => p.degree_level === 'bachelor').length, icon: Award, color: 'text-uni-green' },
            { label: 'مستويات دراسية', value: 8, icon: Users, color: 'text-uni-purple' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="card-uni text-center">
              <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color}`} />
              <div className={`text-2xl font-black ${item.color} mb-1`}>{item.value}</div>
              <div className="text-uni-muted text-xs">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-40 glass rounded-2xl shimmer" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {(Array.isArray(programs) ? programs : []).map((program: Record<string, unknown>, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="card-uni hover:border-uni-gold/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-uni-gold/10 border border-uni-gold/20 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-6 h-6 text-uni-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-uni-text">{program.name_ar as string}</h3>
                    <p className="text-uni-muted text-xs mt-0.5">{program.name as string}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-uni-muted">
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" />{program.total_credits as number} ساعة</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{program.duration_years as number} سنوات</span>
                      <span className={`badge-gold text-xs ${
                        program.degree_level === 'bachelor' ? 'text-uni-blue border-uni-blue/40 bg-uni-blue/10' : 'text-uni-purple border-uni-purple/40 bg-uni-purple/10'
                      }`}>
                        {program.degree_level === 'bachelor' ? 'بكالوريوس' : program.degree_level as string}
                      </span>
                    </div>
                    {!!(program.description_ar as string) && (
                      <p className="text-uni-muted text-xs mt-2 leading-relaxed line-clamp-2">{program.description_ar as string}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
