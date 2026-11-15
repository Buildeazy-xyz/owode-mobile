import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { F, ds, tnum } from '../constants/theme';
import * as Clipboard from 'expo-clipboard';
import { formatAccountNumber, hasProvisionedAccount } from '../utils/account';
import OwodeLoader from '../components/OwodeLoader'
import api from '../utils/api'

export default function AddMoneyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [copying, setCopying] = useState(false);

  // Only ever show a number the bank issued. Never pre-fill from the phone:
  // a phone-derived 10-digit number looks like a real account, and a customer
  // could send real money to a stranger's account at that bank.
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(route.params?.accountName ?? '');
  const [bankName, setBankName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch (or create) this customer's dedicated funding account.
  const loadAccount = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.post('/providus/account');
      const d = res.data?.data;
      if (d?.accountNumber && d?.bankName) {
        setAccountNumber(d.accountNumber);
        setAccountName(d.accountName || '');
        setBankName(d.bankName);
      }
    } catch {
      // Leave the screen in its not-ready state; the retry button handles it.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  const ready = hasProvisionedAccount(accountNumber);
  const displayNumber = useMemo(() => formatAccountNumber(accountNumber), [accountNumber]);

  const handleCopy = useCallback(async () => {
    if (!ready) return;
    try {
      setCopying(true);
      await Clipboard.setStringAsync(accountNumber);
      Alert.alert('Copied', 'Account number copied');
    } catch {
      Alert.alert('Copy failed', 'Could not copy the account number. Try again.');
    } finally {
      setCopying(false);
    }
  }, [accountNumber, ready]);

  const handleShare = useCallback(async () => {
    if (!ready) return;
    try {
      await Share.share({
        message:
          'Send money to my OWODE wallet\n\n' +
          'Bank: ' + bankName + '\n' +
          'Account number: ' + accountNumber + '\n' +
          'Account name: ' + accountName,
      });
    } catch {}
  }, [accountNumber, accountName, bankName, ready]);

  // ─── OWODE Alajo Redesign "Add money" board ──────────────────────────
  const renderCard = () => {
    if (isLoading) {
      return (
        <View style={[styles.card, styles.cardCentered]}>
          <OwodeLoader color={ds.gold} size="large" />
          <Text style={styles.phText}>Loading your account details...</Text>
        </View>
      );
    }
    if (!ready) {
      return (
        <View style={[styles.card, styles.cardCentered]}>
          <Text style={styles.phTitle}>Setting up your account number...</Text>
          <Text style={styles.phText}>
            Your partner bank is creating your number. This usually takes under a minute.
          </Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={loadAccount} activeOpacity={0.8}>
            <Icon name="refresh" size={18} color="#ffffff" width={2} />
            <Text style={styles.outlineText}>Check again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>YOUR ACCOUNT NUMBER</Text>
          <Text style={styles.onlyYou}>Only for you</Text>
        </View>
        <Text style={styles.acct} numberOfLines={1} adjustsFontSizeToFit>{displayNumber}</Text>
        <View style={styles.divider} />
        <View style={{ gap: 6 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.metaKey}>Bank</Text>
            <Text style={styles.metaVal} numberOfLines={1}>{bankName}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.metaKey}>Account name</Text>
            <Text style={styles.metaVal} numberOfLines={1}>{accountName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.goldBtn} onPress={handleCopy} disabled={copying} activeOpacity={0.85}>
            <Icon name="copy" size={18} color={ds.hero} width={2} />
            <Text style={styles.goldText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleShare} activeOpacity={0.85}>
            <Icon name="share" size={18} color="#ffffff" width={2} />
            <Text style={styles.outlineText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back" activeOpacity={0.7}>
          <Icon name="back" size={20} color={ds.ink} width={2} />
        </TouchableOpacity>
        <Text style={styles.h1} numberOfLines={1}>Add money</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Transfer from any Nigerian bank app to the account below. Your OWODE wallet is credited as soon as the bank confirms.
        </Text>

        {renderCard()}

        <View style={styles.other}>
          <Text style={styles.otherTitle}>Other ways to add money</Text>
          <View style={styles.otherRow}>
            <View style={styles.otherTile}>
              <Icon name="profile" size={20} color={ds.navy} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.otherName}>Pay cash to your OWODE agent</Text>
              <Text style={styles.otherSub}>You get a receipt in the app for every payment</Text>
            </View>
          </View>
        </View>

        <View style={styles.note}>
          <Icon name="shield" size={18} color={ds.muted} width={2} />
          <Text style={styles.noteText}>
            This number is created for you by our partner bank. If it hasn't appeared yet, wait a moment. Never send money to a number that isn't shown here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.bg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 20, lineHeight: 24, color: ds.ink, fontFamily: F.x },
  content: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  intro: { fontSize: 14, lineHeight: 21, color: ds.inkSoft, fontFamily: F.r },

  card: { backgroundColor: ds.hero, borderRadius: 22, padding: 22, gap: 16 },
  cardCentered: { alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  cardLabel: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.b, letterSpacing: 0.6 },
  onlyYou: { fontSize: 11, lineHeight: 13, color: ds.hero, fontFamily: F.b, backgroundColor: ds.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  acct: { fontSize: 34, lineHeight: 41, color: '#ffffff', fontFamily: F.x, letterSpacing: 2, ...tnum },
  divider: { height: 1, backgroundColor: ds.heroLine },
  metaKey: { fontSize: 14, lineHeight: 17, color: ds.onHero, fontFamily: F.r },
  metaVal: { flexShrink: 1, fontSize: 14, lineHeight: 17, color: '#ffffff', fontFamily: F.b, textAlign: 'right' },
  goldBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: ds.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  goldText: { color: ds.hero, fontSize: 15, lineHeight: 18, fontFamily: F.x },
  outlineBtn: { flex: 1, minHeight: 48, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: ds.heroBtn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlineText: { color: '#ffffff', fontSize: 15, lineHeight: 18, fontFamily: F.b },
  phTitle: { fontSize: 16, lineHeight: 20, color: '#ffffff', fontFamily: F.x, textAlign: 'center' },
  phText: { fontSize: 13, lineHeight: 20, color: ds.onHero, fontFamily: F.r, textAlign: 'center' },

  other: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, padding: 16, gap: 14 },
  otherTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  otherTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  otherName: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  otherSub: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },

  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: ds.muted, fontFamily: F.r },
});
