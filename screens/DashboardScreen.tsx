import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import { walletAPI } from '../utils/api'
import * as Haptics from 'expo-haptics'
import { announcePayment } from '../utils/speech'
import { isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioInfo, setBioInfo] = useState<any>(null)
  const lastTxRef = useRef<string | null>(null)

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      setWallet(response.data.data)
      const latestTx = response.data.data?.transactions?.[0]
      if (latestTx && latestTx.id !== lastTxRef.current && latestTx.type === 'CREDIT') {
        lastTxRef.current = latestTx.id
        const senderName = latestTx.description?.includes('from')
          ? latestTx.description.split('from')[1]?.split('—')[0]?.trim()
          : 'OWODE'
        announcePayment({ type: 'CREDIT', amount: latestTx.amount, sender: senderName })
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not load wallet')
    }
  }

  const checkBiometricSetup = async () => {
    const enabled = await isBiometricEnabled()
    const info = await getBiometricType()
    setBioEnabled(enabled)
    setBioInfo(info)
    if (!enabled) {
      const dismissed = await AsyncStorage.getItem('biometric_prompt_dismissed')
      if (!dismissed && info.hasAny) {
        Alert.alert(
          `Enable ${info.label}?`,
          `Set up ${info.label} for faster and more secure access to OWODE`,
          [
            { text: 'Not Now', onPress: () => AsyncStorage.setItem('biometric_prompt_dismissed', 'true') },
            { text: `Enable ${info.icon}`, onPress: () => navigation.navigate('BiometricSetup') }
          ]
        )
      }
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await loadWallet()
    setRefreshing(false)
  }

  useEffect(() => {
    loadWallet()
    checkBiometricSetup()
  }, [])

  const actions = [
    { icon: '💰', label: 'Wallet', screen: 'Wallet' },
    { icon: '💸', label: 'Send Money', screen: 'Transfer' },
    { icon: '🤝', label: 'Ajo Groups', screen: 'Ajo' },
    { icon: '🐷', label: 'My Savings', screen: 'Savings' },
    { icon: '⭐', label: 'Trust Score', screen: 'TrustScore' },
    { icon: '👤', label: 'Profile', screen: 'Profile' },
    { icon: bioInfo?.hasFaceID ? '😊' : '👆', label: bioEnabled ? 'Bio Active' : 'Enable Bio', screen: 'BiometricSetup' },
    { icon: '😊', label: 'Face Verify', screen: 'FaceVerification' },
  ]

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.name}>{user?.fullName}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.fullName?.charAt(0)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Total Balance</Text>
          <Text style={styles.walletBalance}>
            ₦{wallet?.balance?.toLocaleString() || '0'}
          </Text>
          <View style={styles.walletRow}>
            <View>
              <Text style={styles.walletSubLabel}>Total Saved</Text>
              <Text style={styles.walletSubValue}>
                ₦{wallet?.totalSaved?.toLocaleString() || '0'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View>
              <Text style={styles.walletSubLabel}>Total Payout</Text>
              <Text style={styles.walletSubValue}>
                ₦{wallet?.totalPayout?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Trust Score Widget */}
      <TouchableOpacity
        style={styles.trustCard}
        onPress={() => navigation.navigate('TrustScore')}
      >
        <View>
          <Text style={styles.trustLabel}>Your Trust Score</Text>
          <Text style={styles.trustScore}>
            {Math.round(user?.trustScore || 50)}/100
          </Text>
        </View>
        <View style={styles.trustRight}>
          <Text style={styles.trustEmoji}>
            {(user?.trustScore || 50) >= 80 ? '🌟' : (user?.trustScore || 50) >= 50 ? '😊' : '😐'}
          </Text>
          <Text style={styles.trustArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Verification Banner */}
      {!user?.isVerified && (
        <TouchableOpacity
          style={styles.verifyBanner}
          onPress={() => navigation.navigate('FaceVerification')}
        >
          <Text style={styles.verifyBannerIcon}>⚠️</Text>
          <View style={styles.verifyBannerText}>
            <Text style={styles.verifyBannerTitle}>Verify your identity</Text>
            <Text style={styles.verifyBannerDesc}>Complete face verification to unlock all features</Text>
          </View>
          <Text style={styles.verifyBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.screen)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {!wallet?.transactions?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubText}>Start saving today! 💪</Text>
        </View>
      ) : (
        wallet?.transactions?.map((tx: any) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={[
              styles.txIconCircle,
              { backgroundColor: tx.type === 'CREDIT' ? '#e8f5e9' : '#ffebee' }
            ]}>
              <Text style={styles.txIcon}>
                {tx.type === 'CREDIT' ? '⬆️' : '⬇️'}
              </Text>
            </View>
            <View style={styles.txMiddle}>
              <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
              <Text style={styles.txDate}>
                {new Date(tx.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[
              styles.txAmount,
              { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }
            ]}>
              {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
            </Text>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  walletCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 24 },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  walletBalance: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginVertical: 8 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  walletSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },
  walletSubValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  actionCard: { width: '30%', backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 11, color: '#0d47a1', fontWeight: '600', textAlign: 'center' },
  trustCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  trustLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  trustScore: { fontSize: 22, fontWeight: 'bold', color: '#0d47a1' },
  trustRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustEmoji: { fontSize: 28 },
  trustArrow: { color: '#888', fontSize: 18 },
  verifyBanner: { backgroundColor: '#fff3e0', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f5a623' },
  verifyBannerIcon: { fontSize: 24, marginRight: 12 },
  verifyBannerText: { flex: 1 },
  verifyBannerTitle: { fontSize: 14, fontWeight: 'bold', color: '#f5a623' },
  verifyBannerDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  verifyBannerArrow: { color: '#f5a623', fontSize: 18 },
  emptyState: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 30, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 4 },
  txCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  txIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIcon: { fontSize: 18 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 14, color: '#333', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' }
})