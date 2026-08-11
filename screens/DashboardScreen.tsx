import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, Modal, Dimensions, Image, Clipboard
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { walletAPI } from '../utils/api'
import { phoneToAccountNumber } from '../utils/account'
import * as Haptics from 'expo-haptics'
import { announceNewCredit } from '../utils/speech'
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

const friendlyDate = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const y = new Date(now); y.setDate(now.getDate() - 1)
  const t = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
  if (same(d, now)) return `Today, ${t}`
  if (same(d, y)) return `Yesterday, ${t}`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

let pinPromptShown = false

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioInfo, setBioInfo] = useState<any>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [hasAppPin, setHasAppPin] = useState(true)
  const lastTxRef = useRef<string | null>(null)
  const initialLoadDone = useRef(false)

  const [copied, setCopied] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([])
  const bannerScrollRef = useRef<any>(null)

  const banners = [
    ...(user && !user.hasTransactionPin ? [{
      icon: 'lock-closed', color: '#ef4444', bg: '#ffebee', border: '#ffcdd2',
      title: 'Set Your Transaction PIN', desc: 'Required before you can transfer or save',
      screen: 'SetTransactionPin'
    }] : []),
    ...(!user?.isVerified ? [{
      icon: 'alert-circle-outline', color: '#f5a623', bg: '#fff8e1', border: '#ffe0a3',
      title: 'Complete Your Verification', desc: 'Submit BVN or NIN to unlock all features',
      screen: 'KYCVerification'
    }] : []),
    ...(!(user as any)?.email ? [{
      icon: 'mail-outline', color: '#25427a', bg: '#eaf2ff', border: '#dbe9ff',
      title: 'Add Your Email', desc: 'Get receipts and backup verification codes',
      screen: 'Profile'
    }] : []),
  ].filter(b => !dismissedBanners.includes(b.title))

  useEffect(() => {
    if (user && !user.hasTransactionPin) {
      if (!pinPromptShown) {
        pinPromptShown = true
        Alert.alert(
          'Secure Your Account',
          'Set a 4-digit transaction PIN to protect your money. You will need it for every transfer, savings deposit and Ajo contribution.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Set PIN Now', onPress: () => navigation.navigate('SetTransactionPin') }
          ]
        )
      }
    }
  }, [user?.hasTransactionPin])

  useEffect(() => {
    if (banners.length < 2) return
    const timer = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % banners.length
        bannerScrollRef.current?.scrollTo({ x: next * (width - 32), animated: true })
        return next
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [banners.length])

  const copyAccount = () => {
    Clipboard.setString(user?.phone || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddMoney = () => {
    navigation.navigate('AddMoney', {
      accountNumber: phoneToAccountNumber(user?.phone),
      bankName: 'OWODE',
      accountName: user?.fullName || '',
    })
  }

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      const data = response.data.data
      setWallet(data)
      const latestTx = data?.transactions?.[0]
      if (latestTx) {
        if (!initialLoadDone.current) {
          lastTxRef.current = latestTx.id
          initialLoadDone.current = true
        } else if (latestTx.id !== lastTxRef.current && latestTx.type === 'CREDIT') {
          lastTxRef.current = latestTx.id
          addNotification({
            title: 'Payment Received',
            body: `₦${latestTx.amount.toLocaleString()} received in OWODE`,
            type: 'CREDIT'
          })
        }
      }
    } catch (e: any) {
      // A dropped connection is the customer's network, not our platform.
      const offline = !e?.response
      Alert.alert(
        offline ? 'No Internet Connection' : 'Could Not Load',
        offline
          ? 'No internet connection. Pull down to refresh.'
          : 'We could not load your wallet just now. Pull down to try again.'
      )
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
    const updated = [newNotif, ...existing].slice(0, 50)
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
            { text: 'Enable', onPress: () => navigation.navigate('BiometricSetup') }
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
    const addWelcome = async () => {
      const welcomed = await AsyncStorage.getItem('owode_welcomed')
      if (!welcomed) {
        const stored = await AsyncStorage.getItem('owode_notifications')
        const existing: Notification[] = stored ? JSON.parse(stored) : []
        const newNotif: Notification = {
          id: Date.now().toString(),
          title: 'Welcome to OWODE!',
          body: "Nigeria's first guaranteed digital Ajo savings platform. Start saving today!",
          type: 'INFO',
          read: false,
          createdAt: new Date().toISOString()
        }
        const updated = [newNotif, ...existing].slice(0, 50)
        await AsyncStorage.setItem('owode_notifications', JSON.stringify(updated))
        setNotifications(updated)
        await AsyncStorage.setItem('owode_welcomed', 'true')
      }
    }
    addWelcome()
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const actions = [
    { icon: 'swap-horizontal', label: 'Transfer', screen: 'Transfer' },
    { icon: 'trending-up', label: 'Savings', screen: 'Savings' },
    { icon: 'people', label: 'Ajo', screen: 'Ajo' },
    { icon: 'document-text-outline', label: 'Statement', screen: 'Wallet' },
    { icon: 'star-outline', label: 'Trust', screen: 'TrustScore' },
    { icon: 'shield-checkmark-outline', label: 'Verify', screen: 'KYCVerification' },
    { icon: 'gift-outline', label: 'Refer', screen: 'Referral' },
    { icon: 'ellipsis-horizontal', label: 'More', screen: 'Settings' },
  ]

  const getNotifIcon = (type: string): any => {
    switch (type) {
      case 'CREDIT': return 'arrow-down-outline'
      case 'DEBIT': return 'arrow-up-outline'
      case 'ALERT': return 'warning-outline'
      default: return 'information-circle-outline'
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

  const getNotifIconColor = (type: string) => {
    switch (type) {
      case 'CREDIT': return '#22c55e'
      case 'DEBIT': return '#ef4444'
      case 'ALERT': return '#f5a623'
      default: return '#25427a'
    }
  }

  const trustScore = user?.trustScore || 50
  const tier = user?.isVerified ? 3 : trustScore >= 60 ? 2 : 1
  const trustColor = trustScore >= 65 ? '#22c55e' : trustScore >= 35 ? '#f5a623' : '#ef4444'

  useEffect(() => {
    AsyncStorage.getItem('has_app_pin').then(v => setHasAppPin(true))
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#25427a', '#1a2e55']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{user?.fullName?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.headerName} numberOfLines={1}>{user?.fullName?.split(' ')[0]}</Text>
                <View style={styles.tierPill}>
                  <Ionicons name="star" size={8} color="#f5a623" />
                  <Text style={styles.tierPillText}>Tier {tier}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerLogoWrap}>
              <Image source={require('../assets/owode-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('HelpSupport')}>
                <Ionicons name="headset-outline" size={21} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Settings')}>
                <Ionicons name="settings-outline" size={21} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={21} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

        </LinearGradient>

        {/* Alerts carousel */}
        {banners.length > 0 && (
          <View>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (width - 32)))}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {banners.map((bn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.alertBanner, { width: width - 32, backgroundColor: bn.bg, borderColor: bn.border }]}
                  onPress={() => navigation.navigate(bn.screen)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={bn.icon as any} size={22} color={bn.color} />
                  <View style={styles.verifyBannerText}>
                    <Text style={[styles.alertBannerTitle, { color: bn.color }]}>{bn.title}</Text>
                    <Text style={styles.alertBannerDesc}>{bn.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={bn.color} />
                  <TouchableOpacity
                    onPress={() => {
                      setDismissedBanners(prev => [...prev, bn.title])
                      setBannerIndex(0)
                      bannerScrollRef.current?.scrollTo({ x: 0, animated: true })
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.bannerClose}
                  >
                    <Ionicons name="close" size={16} color={bn.color} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {banners.length > 1 && (
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <View key={i} style={[styles.dot, bannerIndex === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.cardTopRow}>
            <TouchableOpacity style={styles.acctRow} onPress={copyAccount} activeOpacity={0.7}>
              <Text style={styles.acctText} numberOfLines={1}>
                {user?.phone} · {user?.fullName}
              </Text>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={13} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.walletBalance}>
              {balanceVisible ? `₦${(wallet?.balance || 0).toLocaleString()}` : '₦ ••••••'}
            </Text>
            <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={21}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.walletUpdated}>Last updated just now</Text>

          <View style={styles.walletActions}>
            <TouchableOpacity style={styles.walletActionGold} onPress={handleAddMoney}>
              <Ionicons name="add" size={15} color="#fff" />
              <Text style={styles.walletActionGoldText}>Add money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletActionGhost} onPress={() => navigation.navigate('Wallet')}>
              <Ionicons name="time-outline" size={15} color="#fff" />
              <Text style={styles.walletActionGhostText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Score */}
        <TouchableOpacity style={styles.trustCard} onPress={() => navigation.navigate('TrustScore')}>
          <View>
            <Text style={styles.trustLabel}>Trust Score</Text>
            <Text style={[styles.trustScore, { color: trustColor }]}>{Math.round(trustScore)}/100</Text>
          </View>
          <View style={styles.trustRight}>
            <View style={styles.trustBarContainer}>
              <View style={[styles.trustBarFill, {
                width: `${Math.min(trustScore, 100)}%` as any,
                backgroundColor: trustColor
              }]} />
            </View>
            <Ionicons
              name={trustScore >= 80 ? 'star' : trustScore >= 50 ? 'star-half' : 'star-outline'}
              size={24}
              color={trustColor}
            />
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </View>
        </TouchableOpacity>

        {/* Rewards */}
        <Text style={styles.sectionTitle}>Rewards</Text>
        <View style={styles.rewardsRow}>
          <TouchableOpacity style={styles.rewardCard} onPress={() => navigation.navigate('Referral')}>
            <View style={[styles.rewardIcon, { backgroundColor: '#fff8e1' }]}>
              <Ionicons name="gift-outline" size={16} color="#f5a623" />
            </View>
            <Text style={styles.rewardLabel}>Referral earnings</Text>
            <Text style={styles.rewardValue}>
              {balanceVisible ? `₦${(wallet?.referralEarnings || 0).toLocaleString()}` : '••••'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rewardCard} onPress={() => navigation.navigate('Savings')}>
            <View style={[styles.rewardIcon, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="trending-up-outline" size={16} color="#22c55e" />
            </View>
            <Text style={styles.rewardLabel}>Total saved</Text>
            <Text style={styles.rewardValue}>
              {balanceVisible ? `₦${(wallet?.totalSaved || 0).toLocaleString()}` : '••••'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Services */}
        <View style={styles.servicesHead}>
          <Text style={styles.servicesTitle}>Services</Text>
          <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'You will soon be able to reorder your services.')}>
            <Text style={styles.servicesEdit}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.servicesCard}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.serviceItem}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceIconBg}>
                <Ionicons name={action.icon as any} size={20} color="#25427a" />
              </View>
              <Text style={styles.serviceLabel} numberOfLines={1}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {!wallet?.transactions?.length ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubText}>Start saving or make a transfer</Text>
          </View>
        ) : (
          wallet?.transactions?.slice(0, 5).map((tx: any) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txCard}
              onPress={() => navigation.navigate('Wallet')}
            >
              <View style={[styles.txIconCircle, {
                backgroundColor: tx.type === 'CREDIT' ? '#e8f5e9' : '#ffebee'
              }]}>
                <Ionicons
                  name={tx.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={tx.type === 'CREDIT' ? '#22c55e' : '#ef4444'}
                />
              </View>
              <View style={styles.txMiddle}>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{friendlyDate(tx.createdAt)}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }]}>
                {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {wallet?.transactions?.length > 5 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.viewAllText}>View All Transactions</Text>
            <Ionicons name="chevron-forward" size={16} color="#25427a" />
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
            <View style={styles.notifModalHeader}>
              <View>
                <Text style={styles.notifModalTitle}>Notifications</Text>
                <Text style={styles.notifModalSub}>{notifications.length} total</Text>
              </View>
              <View style={styles.notifHeaderBtns}>
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={clearNotifications} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeNotifBtn}>
                  <Ionicons name="close" size={18} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons name="notifications-off-outline" size={56} color="#ccc" />
                  <Text style={styles.notifEmptyText}>No notifications yet</Text>
                  <Text style={styles.notifEmptySub}>Payment alerts and updates will appear here</Text>
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
                      <Ionicons
                        name={getNotifIcon(notif.type)}
                        size={22}
                        color={getNotifIconColor(notif.type)}
                      />
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
      <BottomNav navigation={navigation} active="home" />
    </View>
  )
}

const styles = StyleSheet.create({
  headerLogoWrap: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8, marginHorizontal: 6 },
  headerLogo: { width: 108, height: 26 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  cardLogoChip: { backgroundColor: '#fff', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  cardLogoImg: { width: 62, height: 15 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 14, fontWeight: '700' },
  headerName: { color: '#fff', fontSize: 12.5, fontWeight: '700', maxWidth: 68 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 100, marginTop: 2 },
  tierPillText: { color: '#f5a623', fontSize: 9, fontWeight: '700' },
  headerIcon: { width: 27, height: 27, justifyContent: 'center', alignItems: 'center' },
  bannerClose: { marginLeft: 6, opacity: 0.55 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 12 },
  alertBannerTitle: { fontSize: 15, fontWeight: '700' },
  alertBannerDesc: { fontSize: 12.5, color: '#7c8aa5', marginTop: 2 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dbe1ec' },
  dotActive: { width: 16, backgroundColor: '#25427a' },
  servicesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  servicesTitle: { fontSize: 15, fontWeight: '700', color: '#1a2b4a' },
  servicesEdit: { fontSize: 13, color: '#25427a', fontWeight: '600' },
  servicesCard: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, paddingVertical: 14, paddingHorizontal: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  serviceItem: { width: '25%', alignItems: 'center', paddingVertical: 10 },
  serviceIconBg: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#eaf2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  serviceLabel: { fontSize: 11.5, color: '#1a2b4a', fontWeight: '500' },
  pinBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffebee', borderColor: '#ffcdd2', borderWidth: 1, borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 12 },
  pinBannerTitle: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  pinBannerDesc: { fontSize: 12.5, color: '#b3261e', marginTop: 2 },
  acctRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  acctText: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, flexShrink: 1 },
  walletUpdated: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4 },
  walletActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  walletActionGold: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#f5a623', paddingVertical: 10, borderRadius: 10 },
  walletActionGoldText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  walletActionGhost: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingVertical: 10, borderRadius: 10 },
  walletActionGhostText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  rewardsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 4 },
  rewardCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  rewardIcon: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  rewardLabel: { fontSize: 11, color: '#7c8aa5' },
  rewardValue: { fontSize: 15, fontWeight: '700', color: '#1a2b4a', marginTop: 2 },
  lockPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#eaf2ff', borderColor: '#dbe9ff', borderWidth: 1, borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 12 },
  lockPromptTitle: { fontSize: 15, fontWeight: '700', color: '#25427a' },
  lockPromptDesc: { fontSize: 12.5, color: '#5a6b8a', marginTop: 2 },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 6 },
  logoImage: { width: width * 0.28, height: 28 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#25427a' },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  verifiedBadgeText: { fontSize: 11, fontWeight: 'bold' },
  walletCard: { backgroundColor: '#25427a', borderRadius: 20, padding: 20, marginHorizontal: 16, marginTop: 16 },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  walletBalance: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-around' },
  walletStat: { alignItems: 'center' },
  walletSubLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 3 },
  walletSubValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  walletDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  verifyBanner: { backgroundColor: '#fff3e0', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#f5a623' },
  verifyBannerText: { flex: 1 },
  verifyBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#f5a623' },
  verifyBannerDesc: { fontSize: 11, color: '#7c8aa5', marginTop: 2 },
  trustCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  trustLabel: { fontSize: 11, color: '#7c8aa5', marginBottom: 2 },
  trustScore: { fontSize: 20, fontWeight: 'bold' },
  trustRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  trustBarContainer: { width: 80, height: 6, backgroundColor: '#f0f2f7', borderRadius: 3, overflow: 'hidden' },
  trustBarFill: { height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#25427a', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 16 },
  seeAll: { color: '#f5a623', fontSize: 13, fontWeight: '600', marginRight: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  actionCard: { width: (width - 52) / 3 - 7, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  actionIconBg: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  actionLabel: { fontSize: 12, color: '#25427a', fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  emptyState: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#1a2b4a' },
  emptySubText: { fontSize: 13, color: '#7c8aa5' },
  txCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  txIconCircle: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 13, color: '#1a2b4a', fontWeight: '600' },
  txDate: { fontSize: 11, color: '#7c8aa5', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
  viewAllBtn: { marginHorizontal: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#e6eaf2' },
  viewAllText: { color: '#25427a', fontWeight: '600', fontSize: 14 },
  notifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifModal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', paddingTop: 8 },
  notifModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f2f7' },
  notifModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#25427a' },
  notifModalSub: { fontSize: 12, color: '#7c8aa5', marginTop: 2 },
  notifHeaderBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearBtn: { backgroundColor: '#ffebee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  clearBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  closeNotifBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f6fb', justifyContent: 'center', alignItems: 'center' },
  notifEmpty: { alignItems: 'center', padding: 60, gap: 12 },
  notifEmptyText: { fontSize: 16, fontWeight: 'bold', color: '#1a2b4a' },
  notifEmptySub: { fontSize: 13, color: '#7c8aa5', textAlign: 'center' },
  notifItem: { flexDirection: 'row', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  notifItemUnread: { backgroundColor: '#eaf2ff' },
  notifItemIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  notifItemContent: { flex: 1 },
  notifItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a2b4a', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#25427a', marginLeft: 8 },
  notifItemBody: { fontSize: 13, color: '#7c8aa5', lineHeight: 18, marginBottom: 4 },
  notifItemTime: { fontSize: 11, color: '#9aa5b8' },
})
