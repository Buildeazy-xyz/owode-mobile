import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import BottomNav from '../components/BottomNav'
import Icon, { IconName } from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { walletAPI, savingsAPI, userAjoAPI, guaranteedAjoAPI } from '../utils/api'
import * as Haptics from 'expo-haptics'
import { isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { F, ds, tnum } from '../constants/theme'
import {
  AjoKind, ajoMembers, ajoSize, ajoCurrentPosition, ajoDueAmount, ajoIsFull,
  ajoDueWord, initials, naira, splitNaira,
} from '../utils/ajoDue'

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
  // Built by hand so every phone shows "4:12 pm", whatever its Intl support.
  const h = d.getHours()
  const t = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
  if (same(d, now)) return `Today, ${t}`
  if (same(d, y)) return `Yesterday, ${t}`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

let pinPromptShown = false

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const [wallet, setWallet] = useState<any>(null)
  const [savedInGoals, setSavedInGoals] = useState(0)
  const [ajoDue, setAjoDue] = useState<null | { group: any; kind: AjoKind }>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([])
  const lastTxRef = useRef<string | null>(null)
  const initialLoadDone = useRef(false)

  const banners: { icon: IconName; title: string; desc: string; screen: string; tone: 'danger' | 'gold' | 'blue' }[] = [
    ...(user && !user.hasTransactionPin ? [{
      icon: 'lock' as IconName, tone: 'danger' as const,
      title: 'Set your transaction PIN', desc: 'Required before you can send, save or pay Ajọ',
      screen: 'SetTransactionPin'
    }] : []),
    ...(!user?.isVerified ? [{
      icon: 'shieldCheck' as IconName, tone: 'gold' as const,
      title: 'Complete your verification', desc: 'Submit BVN or NIN to unlock all features',
      screen: 'KYCVerification'
    }] : []),
    ...(!(user as any)?.email ? [{
      icon: 'mail' as IconName, tone: 'blue' as const,
      title: 'Add your email', desc: 'Get receipts and backup verification codes',
      screen: 'Profile'
    }] : []),
  ].filter(b => !dismissedBanners.includes(b.title))
  const banner = banners[0]

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

  const handleAddMoney = () => {
    navigation.navigate('AddMoney', {
      accountName: user?.fullName || '',
    })
  }

  // wallet.totalSaved only moves on Ajo payouts and agent collections, so it
  // read ₦0 for people saving in goals. The honest figure is the goal total.
  const loadSavedInGoals = async () => {
    try {
      const res = await savingsAPI.getGoals()
      const goals: any[] = res.data?.data || []
      setSavedInGoals(goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0))
    } catch {}
  }

  // The first group where this user still owes this cycle's contribution.
  const loadAjoDue = async () => {
    try {
      const [mine, guaranteed] = await Promise.all([
        userAjoAPI.mine().catch(() => null),
        guaranteedAjoAPI.getAllGroups().catch(() => null),
      ])
      const list: { group: any; kind: AjoKind }[] = [
        ...((mine?.data?.data || []) as any[]).map(group => ({ group, kind: 'standard' as AjoKind })),
        ...((guaranteed?.data?.data || []) as any[]).map(group => ({ group, kind: 'guaranteed' as AjoKind })),
      ]
      const due = list.find(({ group, kind }) => {
        const me = ajoMembers(group).find((m: any) => m.userId === user?.id)
        return me && !me.hasPaid && ajoIsFull(group, kind)
      })
      setAjoDue(due || null)
    } catch {}
  }

  const loadWallet = async () => {
    loadSavedInGoals()
    loadAjoDue()
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

  const checkBiometricSetup = async () => {
    const enabled = await isBiometricEnabled()
    const info = await getBiometricType()
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

  // Coming back from Notifications, Add money or an Ajọ payment should show fresh state.
  const seenFocus = useRef(false)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (!seenFocus.current) { seenFocus.current = true; return }
      loadNotifications(); loadWallet()
    })
    return unsub
  }, [navigation])

  const unreadCount = notifications.filter(n => !n.read).length
  const bal = splitNaira(wallet?.balance || 0)

  const shortcuts: { icon: IconName; label: string; go: () => void }[] = [
    { icon: 'savings', label: 'Save', go: () => navigation.navigate('Savings') },
    { icon: 'ajo', label: 'Ajọ', go: () => navigation.navigate('Ajo') },
    { icon: 'shieldCheck', label: 'Guaranteed', go: () => navigation.navigate('Ajo', { tab: 'guaranteed' }) },
    { icon: 'gift', label: 'Refer', go: () => navigation.navigate('Referral') },
  ]

  const toneColors = {
    danger: { tile: ds.dangerSoft, ink: ds.danger },
    gold: { tile: ds.goldSoft, ink: ds.goldInk },
    blue: { tile: ds.blueSoft, ink: ds.navy },
  }

  const renderAjoDue = () => {
    if (!ajoDue) return null
    const { group, kind } = ajoDue
    const members = ajoMembers(group)
    const n = ajoSize(group, kind)
    const cur = ajoCurrentPosition(group, kind)
    const paid = members.filter((m: any) => m.hasPaid).length
    const me = members.find((m: any) => m.userId === user?.id)
    const myPos = me?.position || 0
    const when = myPos === cur ? 'you collect this cycle'
      : myPos < cur ? 'you have collected'
      : `you collect in cycle ${myPos}`
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.eyebrow}>AJỌ DUE {ajoDueWord(group.frequency).toUpperCase()}</Text>
          <Text style={styles.goldPill}>Cycle {cur} of {n}</Text>
        </View>
        <View style={[styles.rowBetween, { gap: 12 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{paid} of {n} paid · {when}</Text>
          </View>
          <Text style={styles.dueAmount}>{naira(ajoDueAmount(group, kind))}</Text>
        </View>
        <TouchableOpacity
          style={styles.navyBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Ajo', { groupId: group.id, groupType: kind })}
        >
          <Text style={styles.navyBtnText}>Pay contribution</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const txs: any[] = wallet?.transactions?.slice(0, 5) || []

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 110, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.navy} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.greetLeft} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user?.fullName)}</Text>
            </View>
            <View style={{ gap: 2, flexShrink: 1 }}>
              <Text style={styles.greetSmall}>{greeting()}</Text>
              <Text style={styles.greetName} numberOfLines={1}>{user?.fullName}</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.roundBtn} accessibilityLabel="Help" onPress={() => navigation.navigate('HelpSupport')}>
              <Icon name="help" size={20} color={ds.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roundBtn}
              accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell" size={20} color={ds.ink} />
              {unreadCount > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance */}
        <View style={styles.hero}>
          <View style={styles.rowBetween}>
            <Text style={styles.heroLabel}>Wallet balance</Text>
            <TouchableOpacity
              onPress={() => setBalanceVisible(!balanceVisible)}
              style={{ padding: 6 }}
              accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}
            >
              <Icon name={balanceVisible ? 'eye' : 'eyeOff'} size={18} color={ds.onHero} />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceSym}>₦</Text>
            <Text style={styles.balanceWhole}>{balanceVisible ? bal.whole : '••••••'}</Text>
            {balanceVisible ? <Text style={styles.balanceSym}>{bal.kobo}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.goldBtn} onPress={handleAddMoney} activeOpacity={0.85}>
              <Icon name="plus" size={18} color={ds.hero} width={2.2} />
              <Text style={styles.goldBtnText}>Add money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Transfer')} activeOpacity={0.85}>
              <Icon name="send" size={18} color="#ffffff" width={2} />
              <Text style={styles.outlineBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shortcuts */}
        <View style={styles.shortcuts}>
          {shortcuts.map(s => (
            <TouchableOpacity key={s.label} style={styles.shortcut} onPress={s.go} activeOpacity={0.7}>
              <View style={styles.shortcutTile}>
                <Icon name={s.icon} size={24} color={ds.navy} />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account set-up nudge (PIN, verification, email) */}
        {banner && (
          <TouchableOpacity style={styles.nudge} onPress={() => navigation.navigate(banner.screen)} activeOpacity={0.8}>
            <View style={[styles.txTile, { backgroundColor: toneColors[banner.tone].tile }]}>
              <Icon name={banner.icon} size={18} color={toneColors[banner.tone].ink} width={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[styles.txTitle, { color: toneColors[banner.tone].ink }]} numberOfLines={1}>{banner.title}</Text>
              <Text style={styles.txDate} numberOfLines={2}>{banner.desc}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setDismissedBanners(prev => [...prev, banner.title])}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Dismiss"
            >
              <Icon name="close" size={16} color={ds.muted} width={2} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {renderAjoDue()}

        {/* Recent activity */}
        <View style={{ gap: 10 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.link}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listCard}>
            {txs.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.txTitle}>No transactions yet</Text>
                <Text style={styles.txDate}>Add money or start saving to see activity here</Text>
              </View>
            ) : txs.map((tx: any, i: number) => {
              const credit = tx.type === 'CREDIT'
              const saving = !credit && /save|saving|goal/i.test(tx.description || '')
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.txRow, i < txs.length - 1 && styles.txRowLine]}
                  onPress={() => navigation.navigate('Receipt', { transaction: tx })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.txTile, { backgroundColor: credit ? ds.blueSoft : ds.goldSoft }]}>
                    <Icon name={credit ? 'receive' : saving ? 'savings' : 'send'} size={18} color={credit ? ds.navy : ds.goldInk} width={2} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>{tx.description}</Text>
                    <Text style={styles.txDate}>{friendlyDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={styles.txAmount}>
                    {balanceVisible ? `${credit ? '+' : '−'}${naira(tx.amount)}` : '••••'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} active="home" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ds.bg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  greetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, marginRight: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 15, lineHeight: 18, fontFamily: F.b },
  greetSmall: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  greetName: { fontSize: 16, lineHeight: 20, color: ds.ink, fontFamily: F.b },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: ds.gold, borderWidth: 2, borderColor: '#ffffff' },

  hero: { backgroundColor: ds.hero, borderRadius: 22, padding: 20, gap: 16 },
  heroLabel: { fontSize: 13, lineHeight: 16, color: ds.onHero, fontFamily: F.r },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  balanceSym: { fontSize: 20, lineHeight: 24, color: ds.onHero, fontFamily: F.b, ...tnum },
  balanceWhole: { fontSize: 36, lineHeight: 44, color: '#ffffff', fontFamily: F.x, letterSpacing: -0.5, ...tnum },
  goldBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: ds.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  goldBtnText: { color: ds.hero, fontSize: 15, lineHeight: 18, fontFamily: F.x },
  outlineBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: ds.heroBtn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlineBtnText: { color: '#ffffff', fontSize: 15, lineHeight: 18, fontFamily: F.b },

  shortcuts: { flexDirection: 'row', gap: 10 },
  shortcut: { flex: 1, alignItems: 'center', gap: 8 },
  shortcutTile: { width: 56, height: 56, borderRadius: 18, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 12, lineHeight: 15, color: ds.ink, fontFamily: F.s },

  nudge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ds.card, borderRadius: 18, borderWidth: 1, borderColor: ds.border, paddingVertical: 14, paddingHorizontal: 16 },

  card: { backgroundColor: ds.card, borderRadius: 18, borderWidth: 1, borderColor: ds.border, padding: 16, gap: 14 },
  eyebrow: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6 },
  goldPill: { fontSize: 12, lineHeight: 15, color: ds.goldInk, fontFamily: F.b, backgroundColor: ds.goldSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  cardTitle: { fontSize: 16, lineHeight: 20, color: ds.ink, fontFamily: F.b },
  cardSub: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.r },
  dueAmount: { fontSize: 18, lineHeight: 22, color: ds.ink, fontFamily: F.x, ...tnum },
  navyBtn: { height: 46, borderRadius: 12, backgroundColor: ds.navy, alignItems: 'center', justifyContent: 'center' },
  navyBtnText: { color: '#ffffff', fontSize: 15, lineHeight: 18, fontFamily: F.b },

  sectionTitle: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  link: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b },
  listCard: { backgroundColor: ds.card, borderRadius: 18, borderWidth: 1, borderColor: ds.border, overflow: 'hidden' },
  emptyRow: { paddingVertical: 18, paddingHorizontal: 16, gap: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  txRowLine: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  txTile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  txDate: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  txAmount: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x, ...tnum },
})
