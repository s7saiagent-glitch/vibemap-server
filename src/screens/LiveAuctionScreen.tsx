import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, Modal, TextInput, Animated, Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuctionItem } from '../data/mockData';
import CountdownTimer from '../components/CountdownTimer';
import BidChips from '../components/BidChips';
import BidList, { BidEntry } from '../components/BidList';
import { LinearGradient } from 'expo-linear-gradient';

interface LiveAuctionScreenProps {
  route: { params: { item: AuctionItem } };
  navigation: any;
}

const LiveAuctionScreen: React.FC<LiveAuctionScreenProps> = ({ route, navigation }) => {
  const { item: initialItem } = route.params;
  const { theme } = useTheme();
  const { t, isRTL, language } = useLanguage();

  const [currentBid, setCurrentBid] = useState(initialItem.currentBid);
  const [attendees, setAttendees] = useState(initialItem.attendees);
  const [endTime, setEndTime] = useState(new Date(initialItem.endTime));
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [selectedIncrement, setSelectedIncrement] = useState<number>(0);
  const [showBidModal, setShowBidModal] = useState(false);
  const [customBid, setCustomBid] = useState('');
  const [extended, setExtended] = useState(false);
  const bidPulse = useRef(new Animated.Value(1)).current;
  const extendedOpacity = useRef(new Animated.Value(0)).current;
  const currentBidRef = useRef(currentBid);
  const endTimeRef = useRef(endTime);

  useEffect(() => { currentBidRef.current = currentBid; }, [currentBid]);
  useEffect(() => { endTimeRef.current = endTime; }, [endTime]);

  const name = language === 'ar' ? initialItem.nameAr : initialItem.nameEn;

  const pulseBid = () => {
    Animated.sequence([
      Animated.spring(bidPulse, { toValue: 1.12, useNativeDriver: true }),
      Animated.spring(bidPulse, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const showExtendedNotif = () => {
    setExtended(true);
    Animated.timing(extendedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(extendedOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setExtended(false)
      );
    }, 3000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const increments = [1000, 2000, 5000, 10000];
      const increment = increments[Math.floor(Math.random() * increments.length)];
      const newBid = currentBidRef.current + increment;
      setCurrentBid(newBid);
      pulseBid();

      const bidderId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const entry: BidEntry = {
        id: Date.now().toString(),
        bidderId,
        amount: newBid,
        timestamp: new Date(),
      };
      setBids((prev) => [entry, ...prev].slice(0, 20));

      const timeLeft = Math.max(0, Math.floor((endTimeRef.current.getTime() - Date.now()) / 1000));
      if (timeLeft <= 10 && timeLeft > 0) {
        const newEndTime = new Date(endTimeRef.current.getTime() + 30000);
        setEndTime(newEndTime);
        showExtendedNotif();
      }
      setAttendees((prev) => Math.max(10, prev + Math.floor(Math.random() * 5) - 2));
    }, 8000 + Math.random() * 7000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    if (isRTL) return `${amount.toLocaleString('ar-SA')} ر.س`;
    return `SAR ${amount.toLocaleString('en')}`;
  };

  const handlePlaceBid = () => {
    const bidAmount =
      selectedIncrement > 0
        ? currentBid + selectedIncrement
        : parseFloat(customBid);

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= currentBid) {
      Alert.alert(
        t('bid_failed'),
        `${t('min_bid')}: ${formatCurrency(currentBid + initialItem.bidIncrement)}`
      );
      return;
    }

    setCurrentBid(bidAmount);
    pulseBid();
    const entry: BidEntry = {
      id: Date.now().toString(),
      bidderId: 'YOU',
      amount: bidAmount,
      timestamp: new Date(),
    };
    setBids((prev) => [entry, ...prev].slice(0, 20));

    const timeLeft = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
    if (timeLeft <= 10) {
      setEndTime(new Date(endTime.getTime() + 30000));
      showExtendedNotif();
    }
    setShowBidModal(false);
    setSelectedIncrement(0);
    setCustomBid('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: theme.colors.cardBorder },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.colors.gold }]}>
            {isRTL ? '→' : '←'} {t('back')}
          </Text>
        </TouchableOpacity>
        <View style={[styles.liveTag, { backgroundColor: '#CC0000' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>{t('live')}</Text>
        </View>
        <Text style={[styles.attendeesText, { color: theme.colors.secondaryText }]}>
          👥 {attendees}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Video Stream Placeholder */}
        <LinearGradient
          colors={[theme.colors.surface, theme.colors.cardBackground]}
          style={styles.videoPlaceholder}
        >
          <View style={[styles.videoFrame, { borderColor: theme.colors.gold }]}>
            <Text style={styles.videoEmoji}>📺</Text>
            <Text style={[styles.videoText, { color: theme.colors.secondaryText }]}>
              {t('video_stream')}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text
            style={[
              styles.itemName,
              { color: theme.colors.primaryText, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {name}
          </Text>

          {/* Countdown */}
          <View
            style={[
              styles.section,
              { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardBackground },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: theme.colors.secondaryText }]}>
              {t('time_left')}
            </Text>
            <CountdownTimer endTime={endTime} />
          </View>

          {/* Anti-snipe notice */}
          {extended && (
            <Animated.View
              style={[
                styles.extendedBanner,
                {
                  backgroundColor: theme.colors.goldLight,
                  borderColor: theme.colors.gold,
                  opacity: extendedOpacity,
                },
              ]}
            >
              <Text style={[styles.extendedText, { color: theme.colors.gold }]}>
                ⏱ {t('extended')}
              </Text>
            </Animated.View>
          )}

          {/* Current Bid */}
          <View
            style={[
              styles.bidSection,
              { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
            ]}
          >
            <Text style={[styles.bidLabel, { color: theme.colors.secondaryText }]}>
              {t('current_bid')}
            </Text>
            <Animated.Text
              style={[
                styles.currentBid,
                { color: theme.colors.gold, transform: [{ scale: bidPulse }] },
              ]}
            >
              {formatCurrency(currentBid)}
            </Animated.Text>
            <Text style={[styles.winningText, { color: theme.colors.success }]}>
              {t('winning')}
            </Text>
          </View>

          {/* Bid Chips */}
          <View style={styles.chipsSection}>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.secondaryText, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {t('bid_increment')}
            </Text>
            <BidChips
              increments={[500, 1000, 5000, 10000]}
              onSelect={setSelectedIncrement}
              selectedAmount={selectedIncrement}
            />
          </View>

          {/* Place Bid Button */}
          <TouchableOpacity
            style={[styles.placeBidBtn, { backgroundColor: theme.colors.gold }]}
            onPress={() => setShowBidModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.placeBidText}>{t('place_bid')}</Text>
          </TouchableOpacity>

          {/* Recent Bids */}
          {bids.length > 0 && (
            <View
              style={[
                styles.bidsContainer,
                { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.sectionLabel,
                  {
                    color: theme.colors.secondaryText,
                    padding: 16,
                    paddingBottom: 8,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
              >
                {t('recent_bids')}
              </Text>
              <BidList bids={bids} />
            </View>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Bid Confirmation Modal */}
      <Modal visible={showBidModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.primaryText }]}>
              {t('confirm_bid')}
            </Text>
            <Text style={[styles.modalBidAmount, { color: theme.colors.gold }]}>
              {formatCurrency(
                selectedIncrement > 0
                  ? currentBid + selectedIncrement
                  : parseFloat(customBid) || 0
              )}
            </Text>
            {selectedIncrement === 0 && (
              <TextInput
                style={[
                  styles.customInput,
                  {
                    color: theme.colors.primaryText,
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                placeholder={t('your_bid')}
                placeholderTextColor={theme.colors.secondaryText}
                value={customBid}
                onChangeText={setCustomBid}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.colors.cardBorder }]}
                onPress={() => setShowBidModal(false)}
              >
                <Text style={[styles.cancelText, { color: theme.colors.secondaryText }]}>
                  {t('cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.colors.gold }]}
                onPress={handlePlaceBid}
              >
                <Text style={styles.confirmText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontWeight: '600' },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveTagText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  attendeesText: { fontSize: 13 },
  videoPlaceholder: { height: 220, justifyContent: 'center', alignItems: 'center' },
  videoFrame: {
    width: '90%',
    height: 180,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoEmoji: { fontSize: 40 },
  videoText: { fontSize: 14 },
  content: { padding: 20, gap: 20 },
  itemName: { fontSize: 22, fontWeight: '700', lineHeight: 32 },
  section: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  chipsSection: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  bidSection: {
    borderWidth: 0.5,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  bidLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  currentBid: { fontSize: 42, fontWeight: '800', letterSpacing: 1 },
  winningText: { fontSize: 13, fontWeight: '600' },
  placeBidBtn: { padding: 18, borderRadius: 14, alignItems: 'center' },
  placeBidText: { color: '#000', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  bidsContainer: { borderWidth: 0.5, borderRadius: 16, overflow: 'hidden' },
  extendedBanner: { padding: 12, borderRadius: 10, borderWidth: 0.5, alignItems: 'center' },
  extendedText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    padding: 28,
    gap: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalBidAmount: { fontSize: 36, fontWeight: '800', textAlign: 'center' },
  customInput: { borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 18 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#000', fontSize: 15, fontWeight: '700' },
});

export default LiveAuctionScreen;
