'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Search, Edit2, Save, X, Download } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { adminAPI } from '@/lib/api'
import { useT } from '@/lib/i18n'
import toast from 'react-hot-toast'

interface GradeRow {
  enrollment_id: number
  student_name: string
  student_number: string
  midterm_grade: number | null
  final_grade: number | null
  assignment_grade: number | null
  total_grade: number | null
  letter_grade: string | null
}

interface Section {
  id: number
  course_code: string
  course_name: string
  academic_year: string
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-uni-green',
  A: 'text-uni-green',
  'B+': 'text-uni-blue',
  B: 'text-uni-blue',
  'C+': 'text-uni-gold',
  C: 'text-uni-gold',
  'D+': 'text-uni-red',
  D: 'text-uni-red',
  F: 'text-uni-red',
}

function calcLetter(total: number): string {
  if (total >= 95) return 'A+'
  if (total >= 90) return 'A'
  if (total >= 85) return 'B+'
  if (total >= 80) return 'B'
  if (total >= 75) return 'C+'
  if (total >= 70) return 'C'
  if (total >= 65) return 'D+'
  if (total >= 60) return 'D'
  return 'F'
}

export default function AdminGradesPage() {
  useT()
  const queryClient = useQueryClient()

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ midterm_grade: 0, final_grade: 0, assignment_grade: 0 })

  // Fetch sections
  const { data: sectionsData } = useQuery({
    queryKey: ['admin-sections'],
    queryFn: () => adminAPI.getSections().then(r => r.data),
  })
  const sectionList: Section[] = Array.isArray(sectionsData) ? sectionsData : []

  // Fetch grades when a section is selected
  const { data: gradesData, isLoading: gradesLoading } = useQuery({
    queryKey: ['admin-grades', selectedSectionId],
    queryFn: () =>
      adminAPI.getGrades({ section_id: selectedSectionId! }).then(r => r.data),
    enabled: selectedSectionId !== null,
  })
  const allGrades: GradeRow[] = Array.isArray(gradesData) ? gradesData : []

  // Client-side search filter
  const grades = allGrades.filter(
    g =>
      !search ||
      g.student_name.includes(search) ||
      g.student_number.includes(search),
  )

  // Save grade mutation
  const saveMutation = useMutation({
    mutationFn: ({ enrollmentId, data }: { enrollmentId: number; data: Record<string, unknown> }) =>
      adminAPI.updateGrade(enrollmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grades', selectedSectionId] })
      setEditId(null)
      toast.success('تم حفظ الدرجات بنجاح')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حفظ الدرجات')
    },
  })

  const startEdit = (row: GradeRow) => {
    setEditId(row.enrollment_id)
    setEditValues({
      midterm_grade: row.midterm_grade ?? 0,
      final_grade: row.final_grade ?? 0,
      assignment_grade: row.assignment_grade ?? 0,
    })
  }

  const saveEdit = () => {
    if (editId === null) return
    saveMutation.mutate({
      enrollmentId: editId,
      data: {
        midterm_grade: editValues.midterm_grade,
        final_grade: editValues.final_grade,
        assignment_grade: editValues.assignment_grade,
      },
    })
  }

  // Stats calculated from fetched data
  const stats = {
    avg:
      allGrades.length > 0
        ? Math.round(
            allGrades.reduce((s, g) => s + (g.total_grade ?? 0), 0) / allGrades.length,
          )
        : 0,
    passing: allGrades.filter(g => (g.total_grade ?? 0) >= 60).length,
    failing: allGrades.filter(g => (g.total_grade ?? 0) < 60).length,
    aGrade: allGrades.filter(g => g.letter_grade?.startsWith('A')).length,
  }

  const editTotal = editValues.midterm_grade + editValues.final_grade + editValues.assignment_grade
  const editLetter = calcLetter(editTotal)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-uni-gold" /> إدارة الدرجات
            </h1>
            <p className="text-uni-muted text-sm mt-1">مراجعة وتعديل درجات الطلاب</p>
          </div>
          <button className="btn-gold px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'متوسط الدرجات', value: selectedSectionId ? `${stats.avg}%` : '—', color: 'text-uni-gold' },
            { label: 'ناجحون', value: selectedSectionId ? stats.passing : '—', color: 'text-uni-green' },
            { label: 'راسبون', value: selectedSectionId ? stats.failing : '—', color: 'text-uni-red' },
            { label: 'درجة A', value: selectedSectionId ? stats.aGrade : '—', color: 'text-uni-blue' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-uni text-center"
            >
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-uni-muted mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Section Selector + Search */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <label className="text-sm text-uni-muted flex-shrink-0">الشعبة:</label>
            <select
              value={selectedSectionId ?? ''}
              onChange={e => {
                setSelectedSectionId(e.target.value ? Number(e.target.value) : null)
                setEditId(null)
              }}
              className="flex-1 bg-uni-card border border-uni-border rounded-xl px-3 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none"
            >
              <option value="">اختر شعبة لعرض الدرجات</option>
              {sectionList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.course_code} - {s.course_name} ({s.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب أو رقمه..."
              className="w-full bg-uni-card border border-uni-border rounded-xl pr-10 pl-4 py-2.5 text-uni-text text-sm focus:border-uni-gold outline-none"
            />
          </div>
        </div>

        {/* Table */}
        {!selectedSectionId ? (
          <div className="card-uni text-center py-16">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
            <p className="text-uni-muted text-sm">اختر شعبة لعرض درجات الطلاب</p>
          </div>
        ) : gradesLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 glass rounded-2xl shimmer" />
            ))}
          </div>
        ) : grades.length === 0 ? (
          <div className="card-uni text-center py-16">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-uni-muted opacity-30" />
            <p className="text-uni-muted text-sm">لا توجد درجات لهذه الشعبة</p>
          </div>
        ) : (
          <div className="card-uni overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-uni-border/30">
                  {[
                    'اسم الطالب',
                    'رقم الطالب',
                    'نصف السنة (40)',
                    'النهائي (50)',
                    'الواجبات (10)',
                    'المجموع',
                    'التقدير',
                    'إجراء',
                  ].map(h => (
                    <th key={h} className="text-right text-xs text-uni-muted font-medium p-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map((row, i) => (
                  <motion.tr
                    key={row.enrollment_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-uni-border/10 hover:bg-uni-card/30 transition-colors"
                  >
                    <td className="p-4 font-medium text-uni-text whitespace-nowrap">{row.student_name}</td>
                    <td className="p-4 text-uni-muted">{row.student_number}</td>

                    {editId === row.enrollment_id ? (
                      <>
                        <td className="p-4">
                          <input
                            type="number"
                            min={0}
                            max={40}
                            value={editValues.midterm_grade}
                            onChange={e =>
                              setEditValues(v => ({
                                ...v,
                                midterm_grade: Math.min(40, Math.max(0, Number(e.target.value))),
                              }))
                            }
                            className="w-16 bg-uni-card border border-uni-gold/50 rounded-lg px-2 py-1 text-uni-text text-center outline-none"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={editValues.final_grade}
                            onChange={e =>
                              setEditValues(v => ({
                                ...v,
                                final_grade: Math.min(50, Math.max(0, Number(e.target.value))),
                              }))
                            }
                            className="w-16 bg-uni-card border border-uni-gold/50 rounded-lg px-2 py-1 text-uni-text text-center outline-none"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={editValues.assignment_grade}
                            onChange={e =>
                              setEditValues(v => ({
                                ...v,
                                assignment_grade: Math.min(10, Math.max(0, Number(e.target.value))),
                              }))
                            }
                            className="w-14 bg-uni-card border border-uni-gold/50 rounded-lg px-2 py-1 text-uni-text text-center outline-none"
                          />
                        </td>
                        <td className="p-4 font-bold text-uni-text">{editTotal}</td>
                        <td className="p-4">
                          <span className={`font-bold ${GRADE_COLORS[editLetter] ?? ''}`}>
                            {editLetter}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={saveMutation.isPending}
                              className="text-uni-green hover:text-uni-green/80 disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="text-uni-muted hover:text-uni-red"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-uni-text">{row.midterm_grade ?? '—'}</td>
                        <td className="p-4 text-uni-text">{row.final_grade ?? '—'}</td>
                        <td className="p-4 text-uni-text">{row.assignment_grade ?? '—'}</td>
                        <td className="p-4 font-bold text-uni-text">{row.total_grade ?? '—'}</td>
                        <td className="p-4">
                          <span
                            className={`font-bold text-base ${
                              row.letter_grade ? (GRADE_COLORS[row.letter_grade] ?? '') : 'text-uni-muted'
                            }`}
                          >
                            {row.letter_grade ?? '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => startEdit(row)}
                            className="text-uni-muted hover:text-uni-gold transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
