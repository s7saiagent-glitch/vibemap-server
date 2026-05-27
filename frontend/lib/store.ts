import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  role: string
  first_name: string
  last_name: string
  first_name_ar?: string
  last_name_ar?: string
  avatar_url?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken)
          localStorage.setItem('refresh_token', refreshToken)
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
    }),
    {
      name: 'university-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: 'dark'
  language: 'ar' | 'en'
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapse: () => void
  setLanguage: (lang: 'ar' | 'en') => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'dark',
  language: 'ar',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setLanguage: (language) => set({ language }),
}))

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens_used?: number
}

interface ChatState {
  conversations: Record<number, Message[]>
  currentConversationId: number | null
  isTyping: boolean
  addMessage: (sectionId: number, message: Message) => void
  setConversationId: (sectionId: number, id: number) => void
  setTyping: (typing: boolean) => void
  clearConversation: (sectionId: number) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: {},
  currentConversationId: null,
  isTyping: false,
  addMessage: (sectionId, message) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [sectionId]: [...(state.conversations[sectionId] || []), message],
      },
    })),
  setConversationId: (sectionId, id) => set({ currentConversationId: id }),
  setTyping: (typing) => set({ isTyping: typing }),
  clearConversation: (sectionId) =>
    set((state) => {
      const { [sectionId]: _, ...rest } = state.conversations
      return { conversations: rest }
    }),
}))
