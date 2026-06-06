import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

export type Language = 'ar' | 'en';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
  });
}

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  isRTL: true,
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');
  const isRTL = language === 'ar';

  useEffect(() => {
    AsyncStorage.getItem('language').then((saved) => {
      if (saved === 'ar' || saved === 'en') {
        setLanguageState(saved as Language);
        i18n.changeLanguage(saved);
        I18nManager.forceRTL(saved === 'ar');
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('language', lang);
    I18nManager.forceRTL(lang === 'ar');
  };

  const t = (key: string): string => i18n.t(key) as string;

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
