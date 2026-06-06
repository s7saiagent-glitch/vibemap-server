import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

type Phase = 'loading' | 'splash' | 'onboarding' | 'app';

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    AsyncStorage.getItem('onboardingComplete').then((val) => {
      setPhase(val === 'true' ? 'splash' : 'splash');
    });
  }, []);

  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0C', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#D4AF37" size="large" />
      </View>
    );
  }

  if (phase === 'splash') {
    return (
      <SplashScreen
        onFinish={async () => {
          const done = await AsyncStorage.getItem('onboardingComplete');
          setPhase(done === 'true' ? 'app' : 'onboarding');
        }}
      />
    );
  }

  if (phase === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={async () => {
          await AsyncStorage.setItem('onboardingComplete', 'true');
          setPhase('app');
        }}
      />
    );
  }

  return <AppNavigator />;
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
