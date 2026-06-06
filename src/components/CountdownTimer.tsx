import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface CountdownTimerProps {
  endTime: Date;
  onExtend?: () => void;
  compact?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, onExtend, compact = false }) => {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isLastTen, setIsLastTen] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const diff = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      setIsLastTen(diff <= 10 && diff > 0);
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  useEffect(() => {
    if (isLastTen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLastTen]);

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (compact) {
    return (
      <Animated.View style={[styles.compact, { backgroundColor: theme.colors.countdownBg, transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.compactText, { color: isLastTen ? '#FF4444' : theme.colors.countdownText, fontFamily: 'monospace' }]}>
          {days > 0 ? `${pad(days)}d ${pad(hours)}h` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {days > 0 && (
          <TimeUnit value={pad(days)} label={t('days')} theme={theme} isLastTen={isLastTen} />
        )}
        <TimeUnit value={pad(hours)} label={t('hours')} theme={theme} isLastTen={isLastTen} />
        <Separator theme={theme} />
        <TimeUnit value={pad(minutes)} label={t('minutes')} theme={theme} isLastTen={isLastTen} />
        <Separator theme={theme} />
        <TimeUnit value={pad(seconds)} label={t('seconds')} theme={theme} isLastTen={isLastTen} />
      </View>
    </Animated.View>
  );
};

const TimeUnit: React.FC<{ value: string; label: string; theme: any; isLastTen: boolean }> = ({ value, label, theme, isLastTen }) => (
  <View style={styles.unit}>
    <View style={[styles.valueBox, { backgroundColor: theme.colors.countdownBg }]}>
      <Text style={[styles.value, { color: isLastTen ? '#FF4444' : theme.colors.countdownText }]}>{value}</Text>
    </View>
    <Text style={[styles.label, { color: theme.colors.secondaryText }]}>{label}</Text>
  </View>
);

const Separator: React.FC<{ theme: any }> = ({ theme }) => (
  <Text style={[styles.sep, { color: theme.colors.gold }]}>:</Text>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  grid: { alignItems: 'center', gap: 4 },
  unit: { alignItems: 'center', minWidth: 52 },
  valueBox: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 52 },
  value: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 2 },
  label: { fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  sep: { fontSize: 24, fontWeight: '700', paddingBottom: 16 },
  compact: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  compactText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});

export default CountdownTimer;
