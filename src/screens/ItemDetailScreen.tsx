import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, FlatList, Dimensions, Image, Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuctionItem } from '../data/mockData';
import CountdownTimer from '../components/CountdownTimer';

const { width } = Dimensions.get('window');

interface ItemDetailScreenProps {
  route: { params: { item: AuctionItem } };
  navigation: any;
}

const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({ route, navigation }) => {
  const { item } = route.params;
  const { theme } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const [registered, setRegistered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const registerAnim = useRef(new Animated.Value(1)).current;

  const name = language === 'ar' ? item.nameAr : item.nameEn;
  const description = language === 'ar' ? item.descriptionAr : item.descriptionEn;
  const condition = language === 'ar' ? item.conditionAr : item.conditionEn;
  const provenance = language === 'ar' ? item.provenanceAr : item.provenanceEn;

  const formatCurrency = (amount: number) => {
    if (isRTL) return `${amount.toLocaleString('ar-SA')} ر.س`;
    return `SAR ${amount.toLocaleString('en')}`;
  };

  const handleRegister = () => {
    Animated.sequence([
      Animated.spring(registerAnim, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(registerAnim, { toValue: 1, useNativeDriver: true }),
    ]).start(() => setRegistered(true));
  };

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
        <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>
          {t('item_details')}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Slider */}
        <View>
          <FlatList
            data={item.images}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            renderItem={({ item: uri }) => (
              <Image source={{ uri }} style={[styles.image, { width }]} resizeMode="cover" />
            )}
          />
          <View style={styles.imageDots}>
            {item.images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === imageIndex ? theme.colors.gold : theme.colors.secondaryText },
                ]}
              />
            ))}
          </View>
          {item.isLive && (
            <View style={styles.liveOverlay}>
              <View style={[styles.liveTag, { backgroundColor: '#CC0000' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t('live')}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Name + Certified */}
          <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.name,
                { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left', flex: 1 },
              ]}
            >
              {name}
            </Text>
            {item.certified && (
              <View
                style={[
                  styles.certBadge,
                  { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.gold },
                ]}
              >
                <Text style={[styles.certMark, { color: theme.colors.gold }]}>✓</Text>
              </View>
            )}
          </View>

          {/* Bid Info Row */}
          <View
            style={[
              styles.bidRow,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.cardBorder,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.infoLabel, { color: theme.colors.secondaryText }]}>
                {t('current_bid')}
              </Text>
              <Text style={[styles.currentBid, { color: theme.colors.gold }]}>
                {formatCurrency(item.currentBid)}
              </Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={[styles.infoLabel, { color: theme.colors.secondaryText }]}>
                {t('time_left')}
              </Text>
              <CountdownTimer endTime={item.endTime} compact />
            </View>
          </View>

          {/* Full Countdown */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
            ]}
          >
            <CountdownTimer endTime={item.endTime} />
          </View>

          {/* Description */}
          <InfoCard title={t('description')} body={description} theme={theme} isRTL={isRTL} />
          <InfoCard title={t('condition')} body={condition} theme={theme} isRTL={isRTL} />
          <InfoCard title={t('provenance')} body={provenance} theme={theme} isRTL={isRTL} />

          {/* Certificate */}
          {item.certified && (
            <View
              style={[
                styles.certCard,
                { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.gold },
              ]}
            >
              <Text style={styles.certEmoji}>🏛️</Text>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.certCardTitle, { color: theme.colors.gold }]}>
                  {t('certificate')}
                </Text>
                <Text style={[styles.certCardSub, { color: theme.colors.secondaryText }]}>
                  {t('certified')}
                </Text>
              </View>
            </View>
          )}

          {/* Shipping */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.gold, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('shipping')}
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left' }]}>
              🔒 {t('secure_shipping')}
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.gold, textAlign: isRTL ? 'right' : 'left' }]}>
              ✈️ {t('free_shipping')}
            </Text>
          </View>

          {/* CTA */}
          {item.isLive ? (
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: theme.colors.gold }]}
              onPress={() => navigation.navigate('LiveAuction', { item })}
            >
              <Text style={styles.ctaBtnText}>🔴 {t('live_auction')}</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: registerAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.ctaBtn,
                  {
                    backgroundColor: registered ? theme.colors.goldLight : theme.colors.gold,
                    borderColor: theme.colors.gold,
                    borderWidth: registered ? 1 : 0,
                  },
                ]}
                onPress={handleRegister}
                disabled={registered}
              >
                <Text style={[styles.ctaBtnText, { color: registered ? theme.colors.gold : '#000' }]}>
                  {registered ? `✓ ${t('registered')}` : t('register')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={{ height: 48 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoCard: React.FC<{
  title: string;
  body: string;
  theme: any;
  isRTL: boolean;
}> = ({ title, body, theme, isRTL }) => (
  <View
    style={[
      styles.card,
      { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
    ]}
  >
    <Text style={[styles.cardTitle, { color: theme.colors.gold, textAlign: isRTL ? 'right' : 'left' }]}>
      {title}
    </Text>
    <Text style={[styles.cardBody, { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left' }]}>
      {body}
    </Text>
  </View>
);

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
  headerTitle: { fontSize: 16, fontWeight: '600' },
  image: { height: 300 },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  liveOverlay: { position: 'absolute', top: 12, left: 12 },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  nameRow: { alignItems: 'center', gap: 12 },
  name: { fontSize: 22, fontWeight: '700', lineHeight: 32 },
  certBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certMark: { fontSize: 16, fontWeight: '700' },
  bidRow: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  currentBid: { fontSize: 24, fontWeight: '800' },
  card: { borderWidth: 0.5, borderRadius: 14, padding: 16, gap: 10 },
  cardTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  cardBody: { fontSize: 14, lineHeight: 22, opacity: 0.9 },
  certCard: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  certEmoji: { fontSize: 32 },
  certCardTitle: { fontSize: 14, fontWeight: '700' },
  certCardSub: { fontSize: 12 },
  ctaBtn: { padding: 18, borderRadius: 14, alignItems: 'center' },
  ctaBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});

export default ItemDetailScreen;
