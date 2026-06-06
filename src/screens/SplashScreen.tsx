import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;
  const subFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(lineAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.timing(subFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(onFinish, 1200);
    });
  }, []);

  const lineWidth = lineAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '60%'] });

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.surface, theme.colors.background]} style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={[styles.arabicTitle, { color: theme.colors.gold }]}>كرم</Text>
        <Animated.View style={[styles.line, { backgroundColor: theme.colors.gold, width: lineWidth }]} />
        <Text style={[styles.englishTitle, { color: theme.colors.primaryText }]}>KARAM</Text>
      </Animated.View>
      <Animated.Text style={[styles.sub, { color: theme.colors.secondaryText, opacity: subFadeAnim }]}>
        Luxury Auctions • المزادات الفاخرة
      </Animated.Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { alignItems: 'center', gap: 8 },
  arabicTitle: { fontSize: 72, fontWeight: '300', letterSpacing: 4 },
  line: { height: 1, marginVertical: 8 },
  englishTitle: { fontSize: 22, fontWeight: '300', letterSpacing: 12 },
  sub: { position: 'absolute', bottom: 80, fontSize: 13, letterSpacing: 2 },
});

export default SplashScreen;
