import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, Modal, Dimensions, Image
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import { walletAPI } from '../utils/api'
import * as Haptics from 'expo-haptics'
import { announcePayment } from '../utils/speech'
import { isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get('window')

interface Notification {
  id: string
  title: string
  body: string
  type: 'CREDIT' | 'DEBIT' | 'INFO' | 'ALERT'
  read: boolean
  createdAt: string
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioInfo, setBioInfo] = useState<any>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [balanceVisible, setBalanceVisible] = useState(true)
  const lastTxRef = useRef<string | null>(null)

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      const data = response.data.data
      setWallet(data)
      const latestTx = data?.transactions?.[0]
      if (latestTx && latestTx.id !== lastTxRef.current && latestTx.type === 'CREDIT') {
        lastTxRef.current = latestTx.id
        const senderName = latestTx.description?.includes('from')
          ? latestTx.description.split('from')[1]?.split('—')[0]?.trim()
          : 'OWODE'
        announcePayment({ type: 'CREDIT', amount: latestTx.amount, sender: senderName })
        // Add to notification center
        addNotification({
          title: '💰 Payment Received!',
          body: `₦${latestTx.amount.toLocaleString()} received${senderName ? ` from ${senderName}` : ''}`,
          type: 'CREDIT'
        })
      }
    } catch {
      Alert.alert('Error', 'Could not load wallet')
    }
  }

  const addNotification = async (notif: { title: string; body: string; type: string }) => {
    const stored = await AsyncStorage.getItem('owode_notifications')
    const existing: Notification[] = stored ? JSON.parse(stored) : []
    const newNotif: Notification = {
      id: Date.now().toString(),
      title: notif.title,
      body: notif.body,
      type: notif.type as any,
      read: false,
      createdAt: new Date().toISOString()
    }
    const updated = [newNotif, ...existing].slice(0, 50) // Keep max 50
    await AsyncStorage.setItem('owode_notifications', JSON.stringify(updated))
    setNotifications(updated)
  }

  const loadNotifications = async () => {
    const stored = await AsyncStorage.getItem('owode_notifications')
    if (stored) setNotifications(JSON.parse(stored))
  }

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    await AsyncStorage.setItem('owode_notifications', JSON.stringify(updated))
  }

  const clearNotifications = async () => {
    setNotifications([])
    await AsyncStorage.removeItem('owode_notifications')
  }

  const markRead = async (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    setNotifications(updated)
    await AsyncStorage.setItem('owode_notifications', JSON.stringify(updated))
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
    loadNotifications()

    // Add welcome notification if first time
    const addWelcome = async () => {
      const welcomed = await AsyncStorage.getItem('owode_welcomed')
      if (!welcomed) {
        await addNotification({
          title: '🎉 Welcome to OWODE!',
          body: 'Nigeria\'s first guaranteed digital Ajo savings platform. Start saving today!',
          type: 'INFO'
        })
        await AsyncStorage.setItem('owode_welcomed', 'true')
      }
    }
    addWelcome()
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const actions = [
    { icon: '💰', label: 'Wallet', screen: 'Wallet', bg: '#e3f2fd' },
    { icon: '💸', label: 'Send Money', screen: 'Transfer', bg: '#fce4ec' },
    { icon: '🤝', label: 'Ajo Groups', screen: 'Ajo', bg: '#e8f5e9' },
    { icon: '🐷', label: 'My Savings', screen: 'Savings', bg: '#fff3e0' },
    { icon: '⭐', label: 'Trust Score', screen: 'TrustScore', bg: '#f3e5f5' },
    { icon: '👤', label: 'Profile', screen: 'Profile', bg: '#e0f7fa' },
  ]

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'CREDIT': return '💰'
      case 'DEBIT': return '💸'
      case 'ALERT': return '⚠️'
      default: return 'ℹ️'
    }
  }

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'CREDIT': return '#e8f5e9'
      case 'DEBIT': return '#ffebee'
      case 'ALERT': return '#fff3e0'
      default: return '#e3f2fd'
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.logoCard}>
                <Image source={require('../assets/owode-logo.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.headerRight}>
              {/* Notification Bell */}
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={() => { setShowNotifications(true); markAllRead() }}
              >
                <Text style={styles.notifIcon}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* Avatar */}
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.fullName?.charAt(0)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greeting}>Good day 👋</Text>
              <Text style={styles.name}>{user?.fullName?.split(' ')[0]}</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: user?.isVerified ? '#22c55e22' : '#f5a62322', borderColor: user?.isVerified ? '#22c55e' : '#f5a623' }]}>
              <Text style={[styles.verifiedBadgeText, { color: user?.isVerified ? '#22c55e' : '#f5a623' }]}>
                {user?.isVerified ? '✅ Verified' : '⏳ Unverified'}
              </Text>
            </View>
          </View>

          {/* Balance Card */}
          <View style={styles.walletCard}>
            <View style={styles.walletTop}>
              <Text style={styles.walletLabel}>Total Balance</Text>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                <Text style={styles.eyeBtn}>{balanceVisible ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.walletBalance}>
              {balanceVisible ? `₦${(wallet?.balance || 0).toLocaleString()}` : '₦ ••••••'}
            </Text>
            <View style={styles.walletRow}>
              <View style={styles.walletStat}>
                <Text style={styles.walletSubLabel}>💰 Total Saved</Text>
                <Text style={styles.walletSubValue}>₦{(wallet?.totalSaved || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.walletDivider} />
              <View style={styles.walletStat}>
                <Text style={styles.walletSubLabel}>💸 Total Payout</Text>
                <Text style={styles.walletSubValue}>₦{(wallet?.totalPayout || 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Verification Banner */}
        {!user?.isVerified && (
          <TouchableOpacity
            style={styles.verifyBanner}
            onPress={() => navigation.navigate('KYCVerification')}
          >
            <Text style={styles.verifyBannerIcon}>⚠️</Text>
            <View style={styles.verifyBannerText}>
              <Text style={styles.verifyBannerTitle}>Complete Your Verification</Text>
              <Text style={styles.verifyBannerDesc}>Submit BVN or NIN to unlock all features</Text>
            </View>
            <Text style={styles.verifyBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Trust Score */}
        <TouchableOpacity style={styles.trustCard} onPress={() => navigation.navigate('TrustScore')}>
          <View style={styles.trustLeft}>
            <Text style={styles.trustLabel}>Trust Score</Text>
            <Text style={styles.trustScore}>{Math.round(user?.trustScore || 50)}/100</Text>
          </View>
          <View style={styles.trustRight}>
            <View style={styles.trustBarContainer}>
              <View style={[styles.trustBarFill, {
                width: `${Math.min(user?.trustScore || 50, 100)}%`,
                backgroundColor: (user?.trustScore || 50) >= 65 ? '#22c55e' : (user?.trustScore || 50) >= 35 ? '#f5a623' : '#ef4444'
              }]} />
            </View>
            <Text style={styles.trustEmoji}>
              {(user?.trustScore || 50) >= 80 ? '🌟' : (user?.trustScore || 50) >= 50 ? '😊' : '😐'}
            </Text>
            <Text style={styles.trustArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: action.bg }]}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {!wallet?.transactions?.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubText}>Start saving or make a transfer! 💪</Text>
          </View>
        ) : (
          wallet?.transactions?.slice(0, 5).map((tx: any) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txCard}
              onPress={() => navigation.navigate('Wallet')}
            >
              <View style={[styles.txIconCircle, { backgroundColor: tx.type === 'CREDIT' ? '#e8f5e9' : '#ffebee' }]}>
                <Text style={styles.txIcon}>{tx.type === 'CREDIT' ? '⬆️' : '⬇️'}</Text>
              </View>
              <View style={styles.txMiddle}>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }]}>
                {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {wallet?.transactions?.length > 5 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.viewAllText}>View All Transactions →</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Notification Center Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.notifModalOverlay}>
          <View style={styles.notifModal}>
            {/* Notif Header */}
            <View style={styles.notifModalHeader}>
              <View>
                <Text style={styles.notifModalTitle}>🔔 Notifications</Text>
                <Text style={styles.notifModalSub}>{notifications.length} total</Text>
              </View>
              <View style={styles.notifHeaderBtns}>
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={clearNotifications} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeNotifBtn}>
                  <Text style={styles.closeNotifText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notif List */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Text style={styles.notifEmptyIcon}>🔔</Text>
                  <Text style={styles.notifEmptyText}>No notifications yet</Text>
                  <Text style={styles.notifEmptySub}>You'll see payment alerts and updates here</Text>
                </View>
              ) : (
                notifications.map(notif => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                    onPress={() => markRead(notif.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.notifItemIcon, { backgroundColor: getNotifColor(notif.type) }]}>
                      <Text style={styles.notifItemIconText}>{getNotifIcon(notif.type)}</Text>
                    </View>
                    <View style={styles.notifItemContent}>
                      <View style={styles.notifItemTop}>
                        <Text style={styles.notifItemTitle}>{notif.title}</Text>
                        {!notif.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifItemBody}>{notif.body}</Text>
                      <Text style={styles.notifItemTime}>
                        {new Date(notif.createdAt).toLocaleDateString('en-NG', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 56, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 6 },
  logoImage: { width: width * 0.28, height: 28 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifIcon: { fontSize: 20 },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#0d47a1' },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  verifiedBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  verifiedBadgeText: { fontSize: 11, fontWeight: 'bold' },
  walletCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 20 },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  eyeBtn: { fontSize: 18 },
  walletBalance: { color: '#fff', fontSize: 38, fontWeight: 'bold', marginBottom: 16 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-around' },
  walletStat: { alignItems: 'center' },
  walletSubLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 3 },
  walletSubValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  walletDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  verifyBanner: { backgroundColor: '#fff3e0', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f5a623' },
  verifyBannerIcon: { fontSize: 22, marginRight: 10 },
  verifyBannerText: { flex: 1 },
  verifyBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#f5a623' },
  verifyBannerDesc: { fontSize: 11, color: '#888', marginTop: 2 },
  verifyBannerArrow: { color: '#f5a623', fontSize: 18 },
  trustCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  trustLeft: {},
  trustLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  trustScore: { fontSize: 20, fontWeight: 'bold', color: '#0d47a1' },
  trustRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  trustBarContainer: { width: 80, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  trustBarFill: { height: 6, borderRadius: 3 },
  trustEmoji: { fontSize: 24 },
  trustArrow: { color: '#ccc', fontSize: 18 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0d47a1', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 16 },
  seeAll: { color: '#f5a623', fontSize: 13, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  actionCard: { width: (width - 48) / 3, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 11, color: '#0d47a1', fontWeight: '600', textAlign: 'center' },
  emptyState: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 13, color: '#888', marginTop: 4 },
  txCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  txIconCircle: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIcon: { fontSize: 18 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 13, color: '#333', fontWeight: '600' },
  txDate: { fontSize: 11, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
  viewAllBtn: { marginHorizontal: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  viewAllText: { color: '#0d47a1', fontWeight: '600', fontSize: 14 },
  // Notification Modal
  notifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifModal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', paddingTop: 8 },
  notifModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  notifModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  notifModalSub: { fontSize: 12, color: '#888', marginTop: 2 },
  notifHeaderBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearBtn: { backgroundColor: '#ffebee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  closeNotifBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  closeNotifText: { color: '#888', fontSize: 16 },
  notifEmpty: { alignItems: 'center', padding: 60 },
  notifEmptyIcon: { fontSize: 56, marginBottom: 16 },
  notifEmptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  notifEmptySub: { fontSize: 13, color: '#888', textAlign: 'center' },
  notifItem: { flexDirection: 'row', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  notifItemUnread: { backgroundColor: '#f0f7ff' },
  notifItemIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  notifItemIconText: { fontSize: 22 },
  notifItemContent: { flex: 1 },
  notifItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0d47a1', marginLeft: 8 },
  notifItemBody: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 4 },
  notifItemTime: { fontSize: 11, color: '#aaa' },
})
