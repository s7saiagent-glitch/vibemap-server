import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import ar from './ar'
import en from './en'

export type Lang = 'ar' | 'en'

interface I18nStore {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      setLang: (lang) => {
        set({ lang })
        if (typeof document !== 'undefined') {
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
          document.documentElement.lang = lang
        }
      },
      toggleLang: () => {
        const next = get().lang === 'ar' ? 'en' : 'ar'
        get().setLang(next)
      },
    }),
    { name: 'uni-lang' }
  )
)

const translations = { ar, en }

export function useT() {
  const lang = useI18nStore((s) => s.lang)
  const t = translations[lang] as typeof ar
  return { t, lang, dir: lang === 'ar' ? 'rtl' : 'ltr' } as const
}

export function applyDirection(lang: Lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }
}
