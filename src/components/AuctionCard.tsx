import React, { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuctionItem } from '../data/mockData';
import CountdownTimer from './CountdownTimer';

interface AuctionCardProps {
  item: AuctionItem;
  onPress: () => void;
  onBid?: () => void;
  featured?: boolean;
}

const AuctionCard: React.FC<AuctionCardProps> = ({ item, onPress, onBid, featured = false }) => {
  const { theme } = useTheme();
  const { isRTL, t, language } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const name = language === 'ar' ? item.nameAr : item.nameEn;

  const formatCurrency = (amount: number) => {
    if (isRTL) return `${amount.toLocaleString('ar-SA')} ر.س`;
    return `SAR ${amount.toLocaleString('en')}`;
  };

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, damping: 0.8, stiffness: 150 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 0.8, stiffness: 150 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.mode === 'light' ? theme.colors.gold : 'transparent',
          },
          featured && styles.featuredCard,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          {item.isLive && (
            <View style={[styles.liveBadge, { backgroundColor: '#CC0000' }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('live')}</Text>
            </View>
          )}
          {item.certified && (
            <View style={[styles.certBadge, { backgroundColor: theme.colors.goldLight, borderColor: theme.colors.gold }]}>
              <Text style={[styles.certText, { color: theme.colors.gold }]}>✓ {t('certified')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.body, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.name, { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {name}
          </Text>

          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.bidLabel, { color: theme.colors.secondaryText }]}>{t('current_bid')}</Text>
              <Text style={[styles.bidAmount, { color: theme.colors.gold }]}>{formatCurrency(item.currentBid)}</Text>
            </View>
            <CountdownTimer endTime={item.endTime} compact />
          </View>

          <TouchableOpacity
            style={[styles.bidBtn, { backgroundColor: theme.colors.gold }]}
            onPress={onBid || onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.bidBtnText}>{t('bid_now')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginHorizontal: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  featuredCard: { borderWidth: 1 },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 200 },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  certBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  certText: { fontSize: 10, fontWeight: '600' },
  body: { padding: 16, gap: 12 },
  name: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  row: { alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  bidLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  bidAmount: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  bidBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bidBtnText: { color: '#000', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});

export default AuctionCard;
