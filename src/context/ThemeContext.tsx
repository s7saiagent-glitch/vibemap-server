import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface Theme {
  mode: 'dark' | 'light';
  colors: {
    background: string;
    cardBackground: string;
    cardBorder: string;
    primaryText: string;
    secondaryText: string;
    gold: string;
    goldLight: string;
    countdownBg: string;
    countdownText: string;
    surface: string;
    inputBg: string;
    success: string;
    error: string;
    overlay: string;
    tabBar: string;
    tabBarBorder: string;
    statusBar: string;
  };
  fonts: {
    heading: string;
    body: string;
    headingAr: string;
    bodyAr: string;
  };
}

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0A0A0C',
    cardBackground: '#1A1A1E',
    cardBorder: 'rgba(212,175,55,0.4)',
    primaryText: '#F2EFE9',
    secondaryText: '#B3AEA6',
    gold: '#D4AF37',
    goldLight: 'rgba(212,175,55,0.15)',
    countdownBg: '#111114',
    countdownText: '#D4AF37',
    surface: '#141416',
    inputBg: '#1E1E23',
    success: '#2E7D4F',
    error: '#8B2635',
    overlay: 'rgba(0,0,0,0.7)',
    tabBar: '#111114',
    tabBarBorder: 'rgba(212,175,55,0.2)',
    statusBar: '#0A0A0C',
  },
  fonts: {
    heading: 'PlayfairDisplay_700Bold',
    body: 'Inter_400Regular',
    headingAr: 'System',
    bodyAr: 'System',
  },
};

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F9F7F2',
    cardBackground: '#FFFFFF',
    cardBorder: 'rgba(184,134,11,0.15)',
    primaryText: '#1E1C19',
    secondaryText: '#6B625A',
    gold: '#B8860B',
    goldLight: 'rgba(184,134,11,0.1)',
    countdownBg: '#F3EDE4',
    countdownText: '#3E362E',
    surface: '#F0EDE6',
    inputBg: '#EEEBE4',
    success: '#2E7D4F',
    error: '#C62828',
    overlay: 'rgba(0,0,0,0.4)',
    tabBar: '#FFFFFF',
    tabBarBorder: 'rgba(184,134,11,0.15)',
    statusBar: '#F9F7F2',
  },
  fonts: {
    heading: 'PlayfairDisplay_700Bold',
    body: 'Inter_400Regular',
    headingAr: 'System',
    bodyAr: 'System',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  themeMode: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [theme, setTheme] = useState<Theme>(darkTheme);

  useEffect(() => {
    AsyncStorage.getItem('themeMode').then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setThemeModeState(saved as ThemeMode);
      }
    });
  }, []);

  useEffect(() => {
    const resolved = themeMode === 'light' ? lightTheme : darkTheme;
    setTheme(resolved);
  }, [themeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  const toggleTheme = () => {
    setThemeMode(theme.mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
