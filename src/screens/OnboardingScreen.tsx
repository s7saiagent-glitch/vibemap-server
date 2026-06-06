import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  { key: '0', titleKey: 'onboarding_1_title', descKey: 'onboarding_1_desc', emoji: '💎' },
  { key: '1', titleKey: 'onboarding_2_title', descKey: 'onboarding_2_desc', emoji: '🔴' },
  { key: '2', titleKey: 'onboarding_3_title', descKey: 'onboarding_3_desc', emoji: '🏛️' },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { theme, setThemeMode, themeMode } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [slideIndex, setSlideIndex] = useState(0);
  const [phase, setPhase] = useState<'language' | 'theme' | 'slides'>('language');
  const flatListRef = useRef<FlatList>(null);

  const handleLanguageSelect = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    setPhase('theme');
  };

  const handleThemeSelect = (mode: 'dark' | 'light' | 'system') => {
    setThemeMode(mode);
    setPhase('slides');
  };

  const handleNext = () => {
    if (slideIndex < SLIDES.length - 1) {
      const next = slideIndex + 1;
      setSlideIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      onComplete();
    }
  };

  if (phase === 'language') {
    return (
      <LinearGradient colors={[theme.colors.background, theme.colors.surface]} style={styles.centerContainer}>
        <Text style={styles.bigEmoji}>🌐</Text>
        <Text style={[styles.phaseTitle, { color: theme.colors.primaryText }]}>{t('choose_language')}</Text>
        <View style={styles.langRow}>
          {(['ar', 'en'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langBtn,
                {
                  backgroundColor: language === lang ? theme.colors.gold : theme.colors.cardBackground,
                  borderColor: theme.colors.gold,
                },
              ]}
              onPress={() => handleLanguageSelect(lang)}
            >
              <Text style={[styles.langBtnText, { color: language === lang ? '#000' : theme.colors.gold }]}>
                {lang === 'ar' ? 'العربية' : 'English'}
              </Text>
              <Text style={[styles.langSubText, { color: language === lang ? '#333' : theme.colors.secondaryText }]}>
                {lang === 'ar' ? 'Arabic' : 'الإنجليزية'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    );
  }

  if (phase === 'theme') {
    return (
      <LinearGradient colors={[theme.colors.background, theme.colors.surface]} style={styles.centerContainer}>
        <Text style={styles.bigEmoji}>✨</Text>
        <Text style={[styles.phaseTitle, { color: theme.colors.primaryText }]}>{t('choose_theme')}</Text>
        <View style={styles.themeCol}>
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: themeMode === mode ? theme.colors.gold : theme.colors.cardBackground,
                  borderColor: theme.colors.gold,
                },
              ]}
              onPress={() => handleThemeSelect(mode)}
            >
              <Text style={styles.themeEmoji}>
                {mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '⚙️'}
              </Text>
              <Text style={[styles.themeLabel, { color: themeMode === mode ? '#000' : theme.colors.gold }]}>
                {t(mode === 'dark' ? 'dark_mode' : mode === 'light' ? 'light_mode' : 'system_mode')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.slidesContainer, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.slideEmoji}>{item.emoji}</Text>
            <Text style={[styles.slideTitle, { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left' }]}>
              {t(item.titleKey)}
            </Text>
            <Text style={[styles.slideDesc, { color: theme.colors.secondaryText, textAlign: isRTL ? 'right' : 'left' }]}>
              {t(item.descKey)}
            </Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === slideIndex ? theme.colors.gold : theme.colors.secondaryText },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.colors.gold }]} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {slideIndex === SLIDES.length - 1 ? t('get_started') : t('next')}
          </Text>
        </TouchableOpacity>
        {slideIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={onComplete}>
            <Text style={[styles.skipText, { color: theme.colors.secondaryText }]}>{t('skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 32 },
  bigEmoji: { fontSize: 64 },
  phaseTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  langRow: { flexDirection: 'row', gap: 16 },
  langBtn: { flex: 1, padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 4 },
  langBtnText: { fontSize: 20, fontWeight: '700' },
  langSubText: { fontSize: 12 },
  themeCol: { gap: 12, width: '100%' },
  themeBtn: { padding: 18, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  themeEmoji: { fontSize: 24 },
  themeLabel: { fontSize: 16, fontWeight: '600' },
  slidesContainer: { flex: 1 },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 24 },
  slideEmoji: { fontSize: 80 },
  slideTitle: { fontSize: 26, fontWeight: '700' },
  slideDesc: { fontSize: 16, lineHeight: 26, opacity: 0.8 },
  footer: { padding: 40, alignItems: 'center', gap: 20 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nextBtn: { width: '100%', padding: 18, borderRadius: 14, alignItems: 'center' },
  nextBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  skipText: { fontSize: 14 },
});

export default OnboardingScreen;
