'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Search, Edit2, Save, X, CheckCircle, Download, Filter } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface GradeRow {
  id: number
  studentId: string
  studentName: string
  course: string
  courseCode: string
  midterm: number
  final: number
  project: number
  total: number
  letterGrade: string
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

const MOCK_GRADES: GradeRow[] = [
  { id: 1, studentId: '2021001', studentName: 'أحمد محمد الغامدي', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 38, final: 45, project: 9, total: 92, letterGrade: 'A' },
  { id: 2, studentId: '2021002', studentName: 'سارة عبدالله المالكي', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 42, final: 48, project: 10, total: 100, letterGrade: 'A+' },
  { id: 3, studentId: '2021003', studentName: 'محمد فهد الزهراني', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 30, final: 35, project: 8, total: 73, letterGrade: 'C+' },
  { id: 4, studentId: '2021004', studentName: 'فاطمة علي العتيبي', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 35, final: 40, project: 9, total: 84, letterGrade: 'B' },
  { id: 5, studentId: '2021005', studentName: 'خالد ناصر الحربي', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 25, final: 28, project: 7, total: 60, letterGrade: 'D' },
  { id: 6, studentId: '2021006', studentName: 'نورة سعد الدوسري', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 40, final: 46, project: 10, total: 96, letterGrade: 'A+' },
  { id: 7, studentId: '2021007', studentName: 'عمر يوسف القحطاني', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 33, final: 38, project: 8, total: 79, letterGrade: 'C+' },
  { id: 8, studentId: '2021008', studentName: 'ليلى أحمد السهلي', course: 'هياكل البيانات', courseCode: 'CS301', midterm: 37, final: 44, project: 9, total: 90, letterGrade: 'A' },
]

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-uni-green', A: 'text-uni-green', 'B+': 'text-uni-blue', B: 'text-uni-blue',
  'C+': 'text-uni-gold', C: 'text-uni-gold', 'D+': 'text-uni-red', D: 'text-uni-red', F: 'text-uni-red',
}

export default function AdminGradesPage() {
  const [grades, setGrades] = useState<GradeRow[]>(MOCK_GRADES)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState({ midterm: 0, final: 0, project: 0 })
  const [saved, setSaved] = useState(false)

  const filtered = grades.filter(g =>
    g.studentName.includes(search) || g.studentId.includes(search)
  )

  const startEdit = (row: GradeRow) => {
    setEditId(row.id)
    setEditValues({ midterm: row.midterm, final: row.final, project: row.project })
  }

  const saveEdit = (id: number) => {
    const total = editValues.midterm + editValues.final + editValues.project
    setGrades(prev => prev.map(g => g.id === id
      ? { ...g, midterm: editValues.midterm, final: editValues.final, project: editValues.project, total, letterGrade: calcLetter(total) }
      : g
    ))
    setEditId(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const stats = {
    avg: Math.round(grades.reduce((s, g) => s + g.total, 0) / grades.length),
    passing: grades.filter(g => g.total >= 60).length,
    failing: grades.filter(g => g.total < 60).length,
    aGrade: grades.filter(g => g.letterGrade.startsWith('A')).length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-uni-green/10 border border-uni-green/30 text-uni-green text-sm font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> تم حفظ الدرجات بنجاح
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'متوسط الدرجات', value: `${stats.avg}%`, color: 'text-uni-gold' },
            { label: 'ناجحون', value: stats.passing, color: 'text-uni-green' },
            { label: 'راسبون', value: stats.failing, color: 'text-uni-red' },
            { label: 'درجة A', value: stats.aGrade, color: 'text-uni-blue' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-uni text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-uni-muted mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
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
          <button className="flex items-center gap-2 px-4 py-2.5 border border-uni-border rounded-xl text-sm text-uni-muted hover:border-uni-gold/30 transition-all">
            <Filter className="w-4 h-4" /> تصفية
          </button>
        </div>

        {/* Table */}
        <div className="card-uni overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-uni-border/30">
                {['الطالب', 'الرقم', 'نصف السنة (40)', 'النهائي (50)', 'المشاريع (10)', 'المجموع', 'التقدير', 'إجراء'].map(h => (
                  <th key={h} className="text-right text-xs text-uni-muted font-medium p-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-uni-border/10 hover:bg-uni-card/30 transition-colors">
                  <td className="p-4 font-medium text-uni-text whitespace-nowrap">{row.studentName}</td>
                  <td className="p-4 text-uni-muted">{row.studentId}</td>
                  {editId === row.id ? (
                    <>
                      <td className="p-4">
                        <input type="number" min={0} max={40} value={editValues.midterm}
                          onChange={e => setEditValues(v => ({ ...v, midterm: Math.min(40, Math.max(0, +e.target.value)) }))}
                          className="w-16 bg-uni-card border border-uni-gold/50 rounded-lg px-2 py-1 text-uni-text text-center outline-none" />
                      </td>
                      <td className="p-4">
                        <input type="number" min={0} max={50} value={editValues.final}
                          onChange={e => setEditValues(v => ({ ...v, final: Math.min(50, Math.max(0, +e.target.value)) }))}
                          className="w-16 bg-uni-card border border-uni-gold/50 rounded-lg px-2 py-1 text-uni-text text-center outline-none" />
                      </td>
                      <td className="p-4">
                        <input type="number" min={0} max={10} value={editValues.project}
                          onChange={e => setEditValues(v => ({ ...v, project: Math.min(10, Math.max(0, +e.target.value)) }))}
                          className="w-14 bg-uni-card border border-uni-gold/50 rounded-lg px-2 py-1 text-uni-text text-center outline-none" />
                      </td>
                      <td className="p-4 font-bold text-uni-text">
                        {editValues.midterm + editValues.final + editValues.project}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${GRADE_COLORS[calcLetter(editValues.midterm + editValues.final + editValues.project)] || ''}`}>
                          {calcLetter(editValues.midterm + editValues.final + editValues.project)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(row.id)} className="text-uni-green hover:text-uni-green/80">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditId(null)} className="text-uni-muted hover:text-uni-red">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-uni-text">{row.midterm}</td>
                      <td className="p-4 text-uni-text">{row.final}</td>
                      <td className="p-4 text-uni-text">{row.project}</td>
                      <td className="p-4 font-bold text-uni-text">{row.total}</td>
                      <td className="p-4">
                        <span className={`font-bold text-base ${GRADE_COLORS[row.letterGrade] || ''}`}>{row.letterGrade}</span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => startEdit(row)} className="text-uni-muted hover:text-uni-gold transition-colors">
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
      </div>
    </DashboardLayout>
  )
}
