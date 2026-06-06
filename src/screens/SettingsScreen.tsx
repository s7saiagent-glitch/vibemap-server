import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, isRTL, language, setLanguage } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={[
          styles.header,
          { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: theme.colors.cardBorder },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.colors.gold }]}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>{t('settings')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView>
        {/* Language */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.gold }]}>
            {t('language_settings')}
          </Text>
          {(['ar', 'en'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.cardBorder,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: language === lang ? theme.colors.gold : theme.colors.primaryText },
                ]}
              >
                {lang === 'ar' ? '🇸🇦 العربية' : '🇺🇸 English'}
              </Text>
              {language === lang && (
                <Text style={[styles.checkmark, { color: theme.colors.gold }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.gold }]}>{t('appearance')}</Text>
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.optionRow,
                {
                  borderBottomColor: theme.colors.cardBorder,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setThemeMode(mode)}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: themeMode === mode ? theme.colors.gold : theme.colors.primaryText },
                ]}
              >
                {mode === 'dark'
                  ? `🌙 ${t('dark_mode')}`
                  : mode === 'light'
                  ? `☀️ ${t('light_mode')}`
                  : `⚙️ ${t('system_mode')}`}
              </Text>
              {themeMode === mode && (
                <Text style={[styles.checkmark, { color: theme.colors.gold }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.gold }]}>{t('app_name')}</Text>
          <View style={[styles.optionRow, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.optionText, { color: theme.colors.secondaryText }]}>
              كرم | Karam — v1.0.0
            </Text>
          </View>
          <View style={[styles.optionRow, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.optionText, { color: theme.colors.secondaryText }]}>
              {t('tagline')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 22, fontWeight: '300' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  section: { margin: 16, borderRadius: 16, borderWidth: 0.5, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    padding: 16,
    paddingBottom: 8,
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  optionText: { fontSize: 15, fontWeight: '500' },
  checkmark: { fontSize: 16, fontWeight: '700' },
});

export default SettingsScreen;
