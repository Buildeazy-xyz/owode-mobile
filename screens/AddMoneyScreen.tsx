import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { formatAccountNumber, hasProvisionedAccount } from '../utils/account';
import OwodeLoader from '../components/OwodeLoader'

const C = {
  bg: '#0a0e1a',
  card: '#111827',
  primary: '#25427a',
  gold: '#f5a623',
  goldLight: '#fef3c7',
  white: '#ffffff',
  text: '#ffffff',
  muted: '#6b7280',
  border: '#1e293b',
};

export default function AddMoneyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [copying, setCopying] = useState(false);

  const accountNumber = route.params?.accountNumber ?? '';
  const bankName = route.params?.bankName ?? 'OWODE';
  const accountName = route.params?.accountName ?? '';
  const isLoading = route.params?.isLoading ?? false;

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

  const renderCard = () => {
    if (isLoading) {
      return (
        <View style={[styles.card, styles.cardCentered]}>
          <OwodeLoader color={C.gold} size="large" />
          <Text style={styles.phText}>Loading your account details...</Text>
        </View>
      );
    }
    if (!ready) {
      return (
        <View style={[styles.card, styles.cardCentered]}>
          <View style={styles.loadingIconWrap}>
            <Ionicons name="hourglass-outline" size={36} color={C.gold} />
          </View>
          <Text style={styles.phTitle}>Setting up your account number...</Text>
          <Text style={styles.phText}>
            Your dedicated account is being created. This usually takes under a minute.
          </Text>
          <TouchableOpacity style={styles.retry} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={16} color={C.gold} />
            <Text style={styles.retryText}>Check again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>YOUR ACCOUNT NUMBER</Text>
          <View style={styles.liveDot} />
        </View>
        <Text style={styles.acct} numberOfLines={1}>{displayNumber}</Text>
        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>{bankName}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText} numberOfLines={1}>{accountName}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.action} onPress={handleCopy} disabled={copying} activeOpacity={0.8}>
            <Ionicons name="copy-outline" size={20} color={C.gold} />
            <Text style={styles.actionText} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.action, styles.actionLast]} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={20} color={C.gold} />
            <Text style={styles.actionText} numberOfLines={1}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:12,bottom:12,left:12,right:12}} activeOpacity={0.7}>
          <View style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Add money</Text>
        <TouchableOpacity onPress={() => navigation.navigate('HelpSupport')} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.glowWrap}>
          {renderCard()}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="lock-closed-outline" size={18} color={C.gold} />
          <Text style={styles.infoText}>
            Transfers are instant and free. Funds reflect within seconds.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, minHeight: 56, backgroundColor: C.bg },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, flexShrink: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: 0.5 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  glowWrap: { marginBottom: 24 },
  card: { backgroundColor: C.card, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border, shadowColor: '#f5a623', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  cardCentered: { alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 2, textTransform: 'uppercase' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f5a623' },
  acct: { fontSize: 32, fontWeight: '800', color: C.gold, letterSpacing: 3 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', minHeight: 20 },
  metaText: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: '#9ca3af' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.muted, marginHorizontal: 8 },
  actionRow: { flexDirection: 'row', marginTop: 24, gap: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 14, minHeight: 50, borderWidth: 1, borderColor: C.border },
  actionLast: { flex: 1 },
  actionText: { flexShrink: 1, marginLeft: 8, fontSize: 14, fontWeight: '700', color: C.gold },

  loadingIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  phTitle: { marginTop: 12, fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'center' },
  phText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: C.muted, textAlign: 'center' },
  retry: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: C.border, minHeight: 44 },
  retryText: { flexShrink: 1, marginLeft: 8, fontSize: 14, fontWeight: '700', color: C.gold },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
  infoText: { flex: 1, flexShrink: 1, fontSize: 13, lineHeight: 19, color: '#9ca3af' },
});