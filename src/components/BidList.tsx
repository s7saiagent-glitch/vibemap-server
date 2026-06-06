import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export interface BidEntry {
  id: string;
  bidderId: string;
  amount: number;
  timestamp: Date;
}

interface BidListProps {
  bids: BidEntry[];
}

const BidList: React.FC<BidListProps> = ({ bids }) => {
  const { theme } = useTheme();
  const { isRTL, t } = useLanguage();

  const formatCurrency = (amount: number) => {
    if (isRTL) return `${amount.toLocaleString('ar-SA')} ر.س`;
    return `SAR ${amount.toLocaleString('en')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const renderItem = ({ item, index }: { item: BidEntry; index: number }) => (
    <View
      style={[
        styles.row,
        {
          backgroundColor: index === 0 ? theme.colors.goldLight : 'transparent',
          borderBottomColor: theme.colors.cardBorder,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <View style={[styles.left, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        {index === 0 && (
          <View style={[styles.winBadge, { backgroundColor: theme.colors.gold }]}>
            <Text style={styles.winText}>{'🥇'}</Text>
          </View>
        )}
        <Text style={[styles.bidder, { color: theme.colors.secondaryText }]}>
          {t('anonymous')} #{item.bidderId}
        </Text>
        <Text style={[styles.time, { color: theme.colors.secondaryText }]}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={[styles.amount, { color: index === 0 ? theme.colors.gold : theme.colors.primaryText }]}>
        {formatCurrency(item.amount)}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={bids}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: theme.colors.cardBorder }]} />}
    />
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1 },
  bidder: { fontSize: 13, fontWeight: '500' },
  time: { fontSize: 11, marginTop: 2, opacity: 0.7 },
  amount: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  sep: { height: 0.5, marginHorizontal: 16 },
  winBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2, alignSelf: 'flex-start' },
  winText: { fontSize: 10 },
});

export default BidList;
