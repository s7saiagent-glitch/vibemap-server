import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface BidChipsProps {
  increments: number[];
  onSelect: (amount: number) => void;
  selectedAmount?: number;
}

const BidChips: React.FC<BidChipsProps> = ({ increments, onSelect, selectedAmount }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  const formatAmount = (amount: number) => {
    if (isRTL) return `+${amount.toLocaleString('ar-SA')} ر.س`;
    return `+SAR ${amount.toLocaleString('en')}`;
  };

  return (
    <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {increments.map((inc) => {
        const selected = selectedAmount === inc;
        return (
          <TouchableOpacity
            key={inc}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.colors.gold : theme.colors.goldLight,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() => onSelect(inc)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: selected ? '#000' : theme.colors.gold }]}>
              {formatAmount(inc)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
});

export default BidChips;
