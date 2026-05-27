import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated,
  StatusBar, BackHandler, Platform, Vibration,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import HTML_APP from './src/app-html';

SplashScreen.preventAutoHideAsync();

// ─── Splash Screen ─────────────────────────────────────
function NativeSplash({ onDone }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      setTimeout(() => {
        loop.stop();
        Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }).start(onDone);
      }, 2200);
    });
  }, []);

  return (
    <Animated.View style={[styles.splash, { opacity: fade }]}>
      <Animated.View style={{ transform: [{ scale }, { scale: pulse }], alignItems: 'center' }}>
        <Text style={styles.splashIcon}>📡</Text>
        <Text style={styles.splashLogo}>VibeMap</Text>
        <Text style={styles.splashSub}>AR Walkie-Talkie</Text>
        <View style={styles.splashBadge}>
          <View style={styles.splashDot} />
          <Text style={styles.splashBadgeText}>v5.0 · المملكة العربية السعودية</Text>
        </View>
      </Animated.View>
      <View style={styles.splashFooter}>
        <Text style={styles.splashFooterText}>🔒 مشفّر · مجاني · بدون إعلانات</Text>
      </View>
    </Animated.View>
  );
}

// ─── Main App ───────────────────────────────────────────
export default function App() {
  const [appReady, setAppReady]     = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const webviewRef = useRef(null);
  const canGoBack  = useRef(false);

  const onLayoutDone = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync();
  }, [appReady]);

  useEffect(() => {
    setTimeout(() => setAppReady(true), 300);
  }, []);

  // Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, []);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'vibrate') Vibration.vibrate(data.duration || 100);
      if (data.type === 'ptt_start') Vibration.vibrate([0, 50]);
      if (data.type === 'ptt_stop')  Vibration.cancel();
    } catch {}
  };

  const injectedJS = `
    (function() {
      window.VibeMapNative = {
        vibrate: function(ms) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'vibrate', duration: ms }));
        },
        pttStart: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ptt_start' }));
        },
        pttStop: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ptt_stop' }));
        },
      };
      document.addEventListener('DOMContentLoaded', function() {
        var ptt = document.querySelector('.pttbtn');
        if (ptt) {
          ptt.addEventListener('touchstart', function() { window.VibeMapNative.pttStart(); });
          ptt.addEventListener('touchend',   function() { window.VibeMapNative.pttStop(); });
        }
      });
      true;
    })();
  `;

  return (
    <View style={styles.root} onLayout={onLayoutDone}>
      <ExpoStatusBar style="light" backgroundColor="#03030D" />

      {appReady && (
        <WebView
          ref={webviewRef}
          source={{ html: HTML_APP, baseUrl: 'about:blank' }}
          style={styles.webview}
          injectedJavaScript={injectedJS}
          onMessage={handleMessage}
          onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <Text style={styles.loadingIcon}>📡</Text>
              <Text style={styles.loadingText}>جارٍ التحميل...</Text>
            </View>
          )}
        />
      )}

      {showSplash && (
        <NativeSplash onDone={() => setShowSplash(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#03030D',
  },
  webview: {
    flex: 1,
    backgroundColor: '#03030D',
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#03030D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashIcon: { fontSize: 64, marginBottom: 12 },
  splashLogo: {
    fontSize: 38,
    fontWeight: '900',
    color: '#00D4FF',
    letterSpacing: 1,
  },
  splashSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    letterSpacing: 2,
  },
  splashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    backgroundColor: 'rgba(123,47,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123,47,255,0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  splashDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF9C',
  },
  splashBadgeText: {
    fontSize: 11,
    color: '#C840FF',
    letterSpacing: 0.5,
  },
  splashFooter: { position: 'absolute', bottom: 48 },
  splashFooterText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#03030D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: { fontSize: 40 },
  loadingText: { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13 },
});
