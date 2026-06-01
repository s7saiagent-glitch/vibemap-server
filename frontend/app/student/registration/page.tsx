'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, X, CheckCircle, AlertCircle, Search, Clock, Users } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Course {
  code: string
  name: string
  credits: number
  instructor: string
  time: string
  seats: number
  department: string
}

const AVAILABLE_COURSES: Course[] = [
  { code: 'CS101', name: 'مبادئ البرمجة', credits: 3, instructor: 'د. أحمد الشمري', time: 'الأحد / الثلاثاء 8:00 - 9:30', seats: 12, department: 'علوم الحاسب' },
  { code: 'CS202', name: 'هياكل البيانات', credits: 3, instructor: 'د. سارة العتيبي', time: 'الأحد / الثلاثاء 10:00 - 11:30', seats: 5, department: 'علوم الحاسب' },
  { code: 'CS305', name: 'قواعد البيانات', credits: 3, instructor: 'د. محمد القحطاني', time: 'الاثنين / الأربعاء 8:00 - 9:30', seats: 20, department: 'علوم الحاسب' },
  { code: 'CS410', name: 'الذكاء الاصطناعي', credits: 3, instructor: 'د. فاطمة الدوسري', time: 'الاثنين / الأربعاء 12:00 - 13:30', seats: 8, department: 'علوم الحاسب' },
  { code: 'MATH201', name: 'التفاضل والتكامل 2', credits: 4, instructor: 'د. خالد الزهراني', time: 'الأحد / الثلاثاء / الخميس 9:00 - 10:00', seats: 30, department: 'الرياضيات' },
  { code: 'MATH310', name: 'الجبر الخطي', credits: 3, instructor: 'د. نورة السبيعي', time: 'الاثنين / الأربعاء 10:00 - 11:30', seats: 15, department: 'الرياضيات' },
  { code: 'ENG201', name: 'الكتابة الأكاديمية', credits: 2, instructor: 'د. ريم الحربي', time: 'الخميس 10:00 - 12:00', seats: 25, department: 'اللغة الإنجليزية' },
  { code: 'PHY201', name: 'الفيزياء العامة 2', credits: 4, instructor: 'د. عبدالله المطيري', time: 'الأحد / الثلاثاء 14:00 - 15:30', seats: 0, department: 'الفيزياء' },
  { code: 'STAT301', name: 'الإحصاء التطبيقي', credits: 3, instructor: 'د. هند العنزي', time: 'الاثنين / الأربعاء 14:00 - 15:30', seats: 18, department: 'الإحصاء' },
  { code: 'NET401', name: 'أمن الشبكات', credits: 3, instructor: 'د. سلطان الغامدي', time: 'الخميس 8:00 - 11:00', seats: 10, department: 'علوم الحاسب' },
]

const MAX_CREDITS = 18

export default function RegistrationPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Course[]>([])

  const totalCredits = selected.reduce((sum, c) => sum + c.credits, 0)
  const overLimit = totalCredits > MAX_CREDITS

  const filtered = AVAILABLE_COURSES.filter(c =>
    c.name.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.instructor.includes(search) ||
    c.department.includes(search)
  )

  const isSelected = (code: string) => selected.some(c => c.code === code)

  const addCourse = (course: Course) => {
    if (!isSelected(course.code) && course.seats > 0) {
      setSelected(prev => [...prev, course])
    }
  }

  const removeCourse = (code: string) => {
    setSelected(prev => prev.filter(c => c.code !== code))
  }

  const handleSubmit = () => {
    if (selected.length === 0 || overLimit) return
    alert('تم تقديم طلب التسجيل بنجاح! سيتم مراجعته من قِبَل الإدارة الأكاديمية.')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-black text-uni-text flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-uni-gold" />
              تسجيل المقررات
            </h1>
            <p className="text-uni-muted text-sm mt-1">الفصل الدراسي الثاني 1446/1447 هـ</p>
          </div>
          <div className="flex items-center gap-2 bg-uni-gold/10 border border-uni-gold/30 rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-uni-gold flex-shrink-0" />
            <span className="text-uni-gold text-sm font-medium">فترة التسجيل مفتوحة حتى 15 محرم 1447</span>
          </div>
        </motion.div>

        {/* Over limit alert */}
        <AnimatePresence>
          {overLimit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 bg-uni-red/10 border border-uni-red/30 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-5 h-5 text-uni-red flex-shrink-0" />
              <p className="text-uni-red text-sm font-medium">
                تجاوزت الحد الأقصى للساعات المعتمدة ({MAX_CREDITS} ساعة). يرجى حذف بعض المقررات.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-uni-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الكود أو القسم أو المحاضر..."
            className="w-full bg-uni-card border border-uni-border rounded-xl pr-10 pl-4 py-3 text-uni-text text-sm focus:border-uni-gold outline-none transition-colors"
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Courses (2/3) */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-uni-muted uppercase tracking-wider">المقررات المتاحة ({filtered.length})</h2>
            {filtered.length === 0 ? (
              <div className="card-uni text-center py-12">
                <Search className="w-10 h-10 mx-auto mb-3 text-uni-muted opacity-30" />
                <p className="text-uni-muted text-sm">لا توجد مقررات مطابقة للبحث</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((course, i) => {
                  const alreadySelected = isSelected(course.code)
                  const noSeats = course.seats === 0
                  return (
                    <motion.div
                      key={course.code}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`card-uni flex items-start gap-4 transition-all ${alreadySelected ? 'border-uni-gold/40 bg-uni-gold/5' : ''} ${noSeats ? 'opacity-60' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge-blue text-xs font-mono">{course.code}</span>
                          <span className="badge-gold text-xs">{course.credits} ساعات</span>
                          <span className="text-xs text-uni-muted">{course.department}</span>
                        </div>
                        <h3 className="text-uni-text font-bold mt-1">{course.name}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-uni-muted">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {course.instructor}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {course.time}
                          </span>
                          <span className={`flex items-center gap-1 font-medium ${noSeats ? 'text-uni-red' : course.seats <= 5 ? 'text-uni-gold' : 'text-uni-green'}`}>
                            <Users className="w-3.5 h-3.5" />
                            {noSeats ? 'مكتمل' : `${course.seats} مقعد متاح`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => alreadySelected ? removeCourse(course.code) : addCourse(course)}
                        disabled={noSeats && !alreadySelected}
                        className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                          alreadySelected
                            ? 'bg-uni-red/15 text-uni-red hover:bg-uni-red/25 border border-uni-red/30'
                            : noSeats
                            ? 'bg-uni-border/30 text-uni-muted cursor-not-allowed'
                            : 'btn-gold'
                        }`}
                      >
                        {alreadySelected ? (
                          <><X className="w-3.5 h-3.5" /> حذف</>
                        ) : (
                          <><Plus className="w-3.5 h-3.5" /> إضافة</>
                        )}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected Courses (1/3) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-uni-muted uppercase tracking-wider">المقررات المختارة</h2>
            <div className="card-uni sticky top-20">
              {/* Credits counter */}
              <div className={`flex items-center justify-between mb-4 p-3 rounded-xl border ${overLimit ? 'border-uni-red/40 bg-uni-red/10' : 'border-uni-gold/30 bg-uni-gold/10'}`}>
                <span className="text-sm font-semibold text-uni-text">إجمالي الساعات</span>
                <span className={`text-lg font-black ${overLimit ? 'text-uni-red' : 'text-uni-gold'}`}>
                  {totalCredits} / {MAX_CREDITS}
                </span>
              </div>

              {selected.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-uni-muted opacity-30" />
                  <p className="text-uni-muted text-sm">لم تختر أي مقرر بعد</p>
                  <p className="text-uni-muted text-xs mt-1">اختر من القائمة على اليسار</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <AnimatePresence>
                    {selected.map(course => (
                      <motion.div
                        key={course.code}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16, height: 0 }}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-uni-card border border-uni-border/50"
                      >
                        <CheckCircle className="w-4 h-4 text-uni-green flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-uni-text truncate">{course.name}</p>
                          <p className="text-xs text-uni-muted">{course.code} • {course.credits} ساعات</p>
                        </div>
                        <button
                          onClick={() => removeCourse(course.code)}
                          className="text-uni-muted hover:text-uni-red transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={selected.length === 0 || overLimit}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  selected.length === 0 || overLimit
                    ? 'bg-uni-border/30 text-uni-muted cursor-not-allowed'
                    : 'btn-gold'
                }`}
              >
                {selected.length === 0
                  ? 'اختر مقرراً أولاً'
                  : overLimit
                  ? 'تجاوزت الحد المسموح'
                  : `تأكيد التسجيل (${selected.length} مقررات)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
