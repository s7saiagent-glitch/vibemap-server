import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ar from './ar.json';
import en from './en.json';

const dictionaries = { ar, en };
const STORAGE_KEY = 'labbeih.lang';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'ar');

  const setLang = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    setLangState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let str = dictionaries[lang]?.[key] ?? dictionaries.ar[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, v);
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n يجب استخدامه داخل I18nProvider');
  return ctx;
}
