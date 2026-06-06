import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, SafeAreaView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AUCTION_ITEMS } from '../data/mockData';
import AuctionCard from '../components/AuctionCard';

interface HomeScreenProps {
  navigation: any;
}

type TabKey = 'featured' | 'ending_soon' | 'new_arrivals';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('featured');

  const liveItem = AUCTION_ITEMS.find((i) => i.isLive);

  const displayItems =
    activeTab === 'featured'
      ? AUCTION_ITEMS.filter((i) => i.featured)
      : activeTab === 'ending_soon'
      ? [...AUCTION_ITEMS].sort((a, b) => a.endTime.getTime() - b.endTime.getTime()).slice(0, 4)
      : AUCTION_ITEMS.slice().reverse();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: theme.colors.cardBorder },
        ]}
      >
        <View>
          <Text style={[styles.logoAr, { color: theme.colors.gold }]}>كرم</Text>
          <Text style={[styles.logoEn, { color: theme.colors.secondaryText }]}>KARAM</Text>
        </View>
        <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.cardBorder }]}
            onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          >
            <Text style={[styles.iconBtnText, { color: theme.colors.gold }]}>
              {language === 'ar' ? 'EN' : 'ع'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.cardBorder }]}
            onPress={toggleTheme}
          >
            <Text style={styles.iconBtnEmoji}>{theme.mode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.cardBorder }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.iconBtnEmoji}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Banner */}
      {liveItem && (
        <TouchableOpacity
          style={[
            styles.liveBanner,
            { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.gold },
          ]}
          onPress={() => navigation.navigate('LiveAuction', { item: liveItem })}
        >
          <View style={styles.liveIndicator}>
            <View style={styles.livePulse} />
            <Text style={styles.liveBannerBadge}>{t('live')}</Text>
          </View>
          <Text
            style={[
              styles.liveBannerTitle,
              { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left', flex: 1 },
            ]}
            numberOfLines={1}
          >
            {language === 'ar' ? liveItem.nameAr : liveItem.nameEn}
          </Text>
          <Text style={[styles.liveBannerArrow, { color: theme.colors.gold }]}>
            {isRTL ? '←' : '→'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View
        style={[
          styles.tabs,
          { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: theme.colors.cardBorder },
        ]}
      >
        {(['featured', 'ending_soon', 'new_arrivals'] as TabKey[]).map((tab) => (
          <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab)}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? theme.colors.gold : theme.colors.secondaryText },
              ]}
            >
              {t(tab)}
            </Text>
            {activeTab === tab && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.gold }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Cards */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {displayItems.map((item) => (
          <AuctionCard
            key={item.id}
            item={item}
            featured={item.featured}
            onPress={() => navigation.navigate('ItemDetail', { item })}
            onBid={() =>
              item.isLive
                ? navigation.navigate('LiveAuction', { item })
                : navigation.navigate('ItemDetail', { item })
            }
          />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  logoAr: { fontSize: 28, fontWeight: '300', letterSpacing: 2 },
  logoEn: { fontSize: 11, letterSpacing: 6, textAlign: 'center' },
  headerActions: { gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  iconBtnText: { fontSize: 12, fontWeight: '700' },
  iconBtnEmoji: { fontSize: 16 },
  liveBanner: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CC0000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBannerBadge: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  liveBannerTitle: { fontSize: 14, fontWeight: '600' },
  liveBannerArrow: { fontSize: 16, fontWeight: '700' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  tabIndicator: { height: 2, width: '60%', borderRadius: 1, marginTop: 4 },
  list: { padding: 16, gap: 16 },
});

export default HomeScreen;
