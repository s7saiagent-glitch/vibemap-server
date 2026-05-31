import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return '/api/v1'
  }
  return 'http://backend:8000/api/v1'
}
const API_URL = getApiUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor: attach auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const newToken = res.data.access_token
          localStorage.setItem('access_token', newToken)
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${newToken}`
            return api(error.config)
          }
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/auth/login'
        }
      } else {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refresh_token: refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/me', data),
  changePassword: (data: Record<string, unknown>) => api.post('/auth/change-password', data),
  refreshToken: (token: string) => api.post('/auth/refresh', { refresh_token: token }),
  googleAuth: (code: string, redirectUri: string) => api.post('/auth/google', { code, redirect_uri: redirectUri }),
}

// Academic API
export const academicAPI = {
  getFaculties: () => api.get('/academic/faculties'),
  getPrograms: (params?: Record<string, unknown>) => api.get('/academic/programs', { params }),
  getProgramDetail: (id: number) => api.get(`/academic/programs/${id}`),
  getCourses: (params?: Record<string, unknown>) => api.get('/academic/courses', { params }),
  getCourseDetail: (id: number) => api.get(`/academic/courses/${id}`),
  getCalendar: () => api.get('/academic/calendar'),
}

// Student API
export const studentAPI = {
  getDashboard: () => api.get('/students/dashboard'),
  getMyCourses: () => api.get('/students/my-courses'),
  getTranscript: () => api.get('/students/transcript'),
  getTwin: () => api.get('/students/twin'),
  enroll: (sectionId: number) => api.post('/students/enroll', null, { params: { section_id: sectionId } }),
  dropCourse: (sectionId: number) => api.delete(`/students/enroll/${sectionId}`),
  getNotifications: () => api.get('/students/notifications'),
  getAnalytics: () => api.get('/students/analytics'),
  getSectionMaterials: (sectionId: number) => api.get(`/students/materials/${sectionId}`),
  getLectures: (sectionId: number) => api.get(`/lectures/section/${sectionId}`),
  getLecture: (lectureId: number) => api.get(`/lectures/${lectureId}`),
  saveLectureProgress: (lectureId: number, params: Record<string, unknown>) => api.post(`/lectures/${lectureId}/progress`, null, { params }),
  getGamification: () => api.get('/gamification/me'),
  awardPoints: (points: number, reason: string, category?: string) => api.post('/gamification/award-points', null, { params: { points, reason, category: category || 'general' } }),
  activateTwin: () => api.post('/students/twin/activate'),
  getMySubmissions: () => api.get('/students/my-submissions'),
}

// AI Professor API
export const aiProfessorAPI = {
  chat: (data: { section_id: number; message: string; conversation_id?: number; language?: string }) =>
    api.post('/ai-professor/chat', data),
  getConversations: () => api.get('/ai-professor/conversations'),
  getConversation: (id: number) => api.get(`/ai-professor/conversations/${id}`),
  generateQuiz: (data: Record<string, unknown>) => api.post('/ai-professor/generate-quiz', data),
  explain: (data: Record<string, unknown>) => api.post('/ai-professor/explain', data),
  getSectionProfessor: (sectionId: number) => api.get(`/ai-professor/section/${sectionId}`),
}

// Forum API
export const forumAPI = {
  getPosts: (sectionId: number) => api.get(`/forum/section/${sectionId}`),
  getPost: (postId: number) => api.get(`/forum/post/${postId}`),
  createPost: (sectionId: number, data: { title: string; content: string }) => api.post(`/forum/section/${sectionId}`, data),
  addReply: (postId: number, data: { content: string }) => api.post(`/forum/post/${postId}/reply`, data),
  upvote: (postId: number) => api.post(`/forum/post/${postId}/upvote`),
}

// Search API
export const searchAPI = {
  search: (q: string) => api.get('/search', { params: { q } }),
}

// Assessment API
export const assessmentAPI = {
  getSectionAssessments: (sectionId: number) => api.get(`/assessments/section/${sectionId}`),
  getAssessment: (id: number) => api.get(`/assessments/${id}`),
  submitAssessment: (id: number, data: Record<string, unknown>) => api.post(`/assessments/${id}/submit`, data),
  getResults: (assessmentId: number, submissionId: number) =>
    api.get(`/assessments/${assessmentId}/results/${submissionId}`),
}

// English API
export const englishAPI = {
  getCourses: () => api.get('/english/courses'),
  getProgress: () => api.get('/english/my-progress'),
  submitPlacementTest: (answers: Record<string, unknown>, timeSpent: number) =>
    api.post('/english/placement-test', answers, { params: { time_spent_minutes: timeSpent } }),
  chat: (message: string, level: string, history: unknown[]) =>
    api.post('/english/chat', { message, level, conversation_history: history }),
  getCourseUnits: (level: string) => api.get(`/english/courses/${level}/units`),
  submitExercises: (unitId: number, answers: Record<string, unknown>) =>
    api.post(`/english/exercises/${unitId}/submit`, answers),
}

// Attendance API
export const attendanceAPI = {
  getMyAttendance: (sectionId?: number) => api.get('/attendance/my-attendance', { params: sectionId ? { section_id: sectionId } : {} }),
  getSectionAttendance: (sectionId: number) => api.get(`/attendance/section/${sectionId}`),
  recordAttendance: (params: Record<string, unknown>) => api.post('/attendance/record', null, { params }),
}

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getStudents: (params?: Record<string, unknown>) => api.get('/admin/students', { params }),
  createFaculty: (data: Record<string, unknown>) => api.post('/admin/academic/faculties', data),
  createCourse: (data: Record<string, unknown>) => api.post('/admin/courses', data),
  createAIProfessor: (data: Record<string, unknown>) => api.post('/admin/ai-professors/create', data),
  getAIProfessors: () => api.get('/admin/ai-professors'),
  generateLecture: (data: Record<string, unknown>) => api.post('/admin/content/generate-lecture', data),
  getAssessments: (params?: Record<string, unknown>) => api.get('/admin/assessments', { params }),
  createAssessment: (data: Record<string, unknown>, publish?: boolean) => api.post('/admin/assessments', data, { params: { publish: publish || false } }),
  publishAssessment: (id: number, publish: boolean) => api.patch(`/admin/assessments/${id}/publish`, null, { params: { publish } }),
  getSections: () => api.get('/admin/sections'),
  createSection: (params: Record<string, unknown>) => api.post('/admin/sections', null, { params }),
  updateSection: (id: number, params: Record<string, unknown>) => api.patch(`/admin/sections/${id}`, null, { params }),
  addMaterial: (params: Record<string, unknown>) => api.post('/admin/materials', null, { params }),
  getMaterials: (params?: Record<string, unknown>) => api.get('/admin/materials', { params }),
  createLecture: (params: Record<string, unknown>) => api.post('/admin/lectures', null, { params }),
  getSectionLectures: (sectionId: number) => api.get(`/admin/lectures/${sectionId}`),
  publishLecture: (lectureId: number, publish: boolean) => api.patch(`/admin/lectures/${lectureId}/publish`, null, { params: { publish } }),
}

export default api
