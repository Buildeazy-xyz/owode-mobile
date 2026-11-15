import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Image, Dimensions,
  Linking, TextInput, Modal
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../utils/api'
import { isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import OwodeLoader from '../components/OwodeLoader'
import Icon, { IconName } from '../components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { savingsAPI } from '../utils/api'
import { F, ds, tnum } from '../constants/theme'
import { naira, initials } from '../utils/ajoDue'

const { width } = Dimensions.get('window')

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, refreshUser } = useAuth()
  const [freshUser, setFreshUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioInfo, setBioInfo] = useState<any>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [savedInGoals, setSavedInGoals] = useState(0)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    loadFreshData()
    checkBio()
    // wallet.totalSaved misses goal savings; the goal total is the honest figure
    savingsAPI.getGoals()
      .then(r => setSavedInGoals((r.data?.data || []).reduce((t: number, g: any) => t + (g.currentAmount || 0), 0)))
      .catch(() => {})
  }, [])

  const loadFreshData = async () => {
    try {
      const response = await authAPI.getMe()
      const data = response.data.data
      setFreshUser(data)
      setEmail(data.email || '')
      refreshUser({ ...user, ...data })
    } catch {
      setFreshUser(user)
    } finally {
      setLoading(false)
    }
  }

  const checkBio = async () => {
    const enabled = await isBiometricEnabled()
    const info = await getBiometricType()
    setBioEnabled(enabled)
    setBioInfo(info)
  }

  const handleSaveEmail = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address')
      return
    }
    try {
      setEmailLoading(true)
      await authAPI.updateEmail(email)
      setFreshUser((prev: any) => ({ ...prev, email }))
      refreshUser({ ...user, email } as any)
      setShowEmailModal(false)
      Alert.alert('Success', 'Email updated successfully!')
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not update email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ])
  }

  const currentUser = freshUser || user
  const trustScore = currentUser?.trustScore || 0
  const trustColor = trustScore >= 65 ? '#22c55e' : trustScore >= 35 ? '#f5a623' : '#ef4444'
  const trustLabel = trustScore >= 65 ? 'Excellent' : trustScore >= 35 ? 'Good' : 'Low'

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6fb' }}>
        <OwodeLoader size="large" fullscreen color="#25427a" />
      </View>
    )
  }

  const kycItems = [
    {
      icon: 'card-outline' as any, bg: '#e3f2fd', iconColor: '#25427a',
      label: 'BVN Verification',
      sub: currentUser?.hasBVN ? 'BVN verified' : 'Not submitted — tap to verify',
      done: currentUser?.hasBVN,
      onPress: () => navigation.navigate('KYCVerification')
    },
    {
      icon: 'card-outline' as any, bg: '#f3e5f5', iconColor: '#9c27b0',
      label: 'NIN Verification',
      sub: currentUser?.hasNIN ? 'NIN verified' : 'Not submitted — tap to verify',
      done: currentUser?.hasNIN,
      onPress: () => navigation.navigate('KYCVerification')
    },
    {
      icon: 'happy-outline' as any, bg: '#e8f5e9', iconColor: '#22c55e',
      label: 'Face Verification',
      sub: currentUser?.isVerified ? 'Identity fully verified' : 'Not verified — tap to start',
      done: currentUser?.isVerified,
      onPress: () => navigation.navigate('FaceVerification')
    },
  ]

  const hasBVN = !!(currentUser as any)?.hasBVN
  const hasNIN = !!(currentUser as any)?.hasNIN
  const kycLevel = currentUser?.isVerified ? 3 : (hasBVN || hasNIN) ? 2 : 1
  const kycLabel = kycLevel === 3 ? 'Fully verified' : kycLevel === 2 ? 'Identity submitted' : 'Basic account'
  const kycHint = kycLevel === 3
    ? 'You have full access to all features.'
    : kycLevel === 2
      ? 'Your BVN/NIN is under review. We will notify you once approved.'
      : 'Add your BVN or NIN to raise your limits and unlock all features.'

  const securityItems = [
    {
      icon: 'keypad-outline' as any, bg: '#e3f2fd', iconColor: '#25427a',
      label: currentUser?.hasTransactionPin ? 'Change Transaction PIN' : 'Set Transaction PIN',
      sub: currentUser?.hasTransactionPin ? '4-digit PIN is set' : 'Not set — tap to set now',
      onPress: () => navigation.navigate('SetTransactionPin')
    },
    {
      icon: 'lock-closed-outline' as any, bg: '#fff3e0', iconColor: '#f5a623',
      label: 'Change App Lock PIN',
      sub: '6-digit PIN to lock your app',
      onPress: () => navigation.navigate('SetAppPin')
    },
  ]

  const supportItems = [
    {
      icon: 'mic-outline' as any, bg: '#e8f5e9', iconColor: '#22c55e',
      label: 'WhatsApp Support',
      sub: '+234 802 097 3590',
      onPress: () => Linking.openURL('https://wa.me/2348020973590?text=Hello OWODE Support')
    },
    {
      icon: 'mail-open-outline' as any, bg: '#e3f2fd', iconColor: '#25427a',
      label: 'Email Support',
      sub: 'support@owodealajo.com',
      onPress: () => Linking.openURL('mailto:support@owodealajo.com')
    },
    {
      icon: 'globe-outline' as any, bg: '#fff3e0', iconColor: '#f5a623',
      label: 'Visit Website',
      sub: 'owodealajo.com',
      onPress: () => Linking.openURL('https://owodealajo.com')
    },
    {
      icon: 'settings-outline' as any, bg: '#eaf2ff', iconColor: '#25427a',
      label: 'Settings',
      sub: 'Security, notifications and more',
      onPress: () => navigation.navigate('Settings')
    },
    {
      icon: 'share-social-outline' as any, bg: '#fce4ec', iconColor: '#e91e63',
      label: 'Refer a Friend',
      sub: 'Invite friends and earn rewards',
      onPress: () => navigation.navigate('Referral')
    },
    {
      icon: 'document-outline' as any, bg: '#f3e5f5', iconColor: '#9c27b0',
      label: 'Terms & Conditions',
      sub: 'Read our terms of service',
      onPress: () => Linking.openURL('https://owodealajo.com')
    },
    {
      icon: 'shield-checkmark-outline' as any, bg: '#e8f5e9', iconColor: '#22c55e',
      label: 'Privacy Policy',
      sub: 'How we protect your data',
      onPress: () => Linking.openURL('https://owodealajo.com')
    },
  ]

  // ─── OWODE Alajo Redesign "Profile" board ────────────────────────────
  const verifiedText = kycLevel === 3 ? 'Verified' : kycLevel === 2 ? 'Under review' : 'Not verified'
  const stats = [
    { label: 'Balance', value: naira(currentUser?.wallet?.balance || 0) },
    { label: 'Saved', value: naira(savedInGoals) },
    { label: 'Payouts', value: naira(currentUser?.wallet?.totalPayout || 0) },
  ]
  type RowT = { icon: IconName; title: string; sub?: string; onPress: () => void; right?: React.ReactNode; tone?: 'gold' | 'red' }
  const renderRows = (rows: RowT[]) => (
    <View style={p.list}>
      {rows.map((r, i) => {
        const tone = r.tone === 'gold' ? { bg: ds.goldSoft, fg: ds.goldInk }
          : r.tone === 'red' ? { bg: ds.dangerSoft, fg: ds.danger }
          : { bg: ds.blueSoft, fg: ds.navy }
        return (
          <TouchableOpacity key={r.title} style={[p.row, i < rows.length - 1 && p.rowLine]} onPress={r.onPress} activeOpacity={0.7}>
            <View style={[p.tile, { backgroundColor: tone.bg }]}>
              <Icon name={r.icon} size={18} color={tone.fg} width={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[p.rowTitle, r.tone === 'red' && { color: ds.danger }]} numberOfLines={1}>{r.title}</Text>
              {!!r.sub && <Text style={p.rowSub} numberOfLines={1}>{r.sub}</Text>}
            </View>
            {r.right !== undefined ? r.right : r.tone === 'red' ? null : <Icon name="chevron" size={18} color="#9aa5b8" width={2} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: ds.bg }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={[p.hero, { paddingTop: insets.top + 20 }]}>
        <View style={p.rowBetween}>
          <Text style={p.h1}>Profile</Text>
          <TouchableOpacity style={p.gearBtn} onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings">
            <Icon name="gear" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={p.avatar}><Text style={p.avatarText}>{initials(currentUser?.fullName)}</Text></View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={p.name} numberOfLines={1}>{currentUser?.fullName}</Text>
            <Text style={p.phone}>{String(currentUser?.phone || '').replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name={kycLevel === 3 ? 'shieldCheck' : 'shield'} size={14} color={kycLevel === 3 ? ds.gold : ds.onHero} width={2} />
              <Text style={[p.verified, kycLevel !== 3 && { color: ds.onHero }]}>{verifiedText} · Level {kycLevel} of 3</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {stats.map((s, i) => (
            <View key={s.label} style={[{ flex: 1, gap: 3 }, i > 0 && p.statSplit]}>
              <Text style={p.statLabel}>{s.label}</Text>
              <Text style={p.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingTop: 18, paddingHorizontal: 20, gap: 12 }}>
        {renderRows([
          {
            icon: 'star', tone: 'gold', title: 'Trust score',
            sub: `${Math.round(trustScore)} of 100 · ${trustLabel}`,
            onPress: () => navigation.navigate('TrustScore'),
            right: (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={p.goldPill}>{Math.round(trustScore)}</Text>
                <Icon name="chevron" size={18} color="#9aa5b8" width={2} />
              </View>
            ),
          },
          { icon: 'shieldCheck', title: 'Identity verification', sub: kycLabel, onPress: () => navigation.navigate('KYCVerification') },
          {
            icon: 'user', title: 'Account details', sub: 'Name, phone, email',
            onPress: () => setShowDetails(!showDetails),
            right: <View style={{ transform: [{ rotate: showDetails ? '90deg' : '0deg' }] }}><Icon name="chevron" size={18} color="#9aa5b8" width={2} /></View>,
          },
          { icon: 'gift', title: 'Refer & earn', sub: 'Invite friends and earn trust points', onPress: () => navigation.navigate('Referral') },
        ])}

        {showDetails && (
          <View style={p.list}>
            {[
              { k: 'Full name', v: currentUser?.fullName },
              { k: 'Phone', v: currentUser?.phone },
              { k: 'Email', v: currentUser?.email || 'Add email', edit: true },
              { k: 'Account type', v: String(currentUser?.role || '').toLowerCase() },
            ].map((d, i, arr) => (
              <TouchableOpacity
                key={d.k}
                style={[p.detail, i < arr.length - 1 && p.rowLine]}
                disabled={!d.edit}
                onPress={() => setShowEmailModal(true)}
              >
                <Text style={p.detailKey}>{d.k}</Text>
                <Text style={[p.detailVal, d.edit && { color: ds.navy }]} numberOfLines={1}>{d.v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {renderRows([
          { icon: 'help', title: 'Help & support', sub: 'Chat, call, email and FAQs', onPress: () => navigation.navigate('HelpSupport') },
          { icon: 'doc', title: 'Terms & privacy', onPress: () => Linking.openURL('https://owodealajo.com/privacy') },
          { icon: 'logout', title: 'Log out', tone: 'red', onPress: handleLogout },
        ])}

        <Text style={p.footer}>OWODE Alajo · OWODE Digital Services Limited · RC 8569061</Text>
      </View>

      {/* Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {currentUser?.email ? 'Update Email' : 'Add Email Address'}
            </Text>
            <Text style={styles.modalSub}>
              Adding your email increases your trust score and helps with account recovery
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. john@email.com"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEmailModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEmail} disabled={emailLoading}>
                {emailLoading
                  ? <OwodeLoader color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    <BottomNav navigation={navigation} active="profile" />
    </View>
  )
}

const styles = StyleSheet.create({
  kycCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  kycTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  kycLevel: { fontSize: 17, fontWeight: '800', color: '#1a2b4a' },
  kycLabel: { fontSize: 12.5, color: '#7c8aa5', marginTop: 2 },
  kycAction: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#eaf2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  kycActionText: { fontSize: 12, fontWeight: '700', color: '#25427a' },
  kycTrack: { height: 7, borderRadius: 4, backgroundColor: '#f0f2f7', overflow: 'hidden' },
  kycFill: { height: 7, borderRadius: 4, backgroundColor: '#f5a623' },
  kycHint: { fontSize: 12, color: '#7c8aa5', marginTop: 10, lineHeight: 16 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  statusChipText: { fontSize: 10.5, fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { paddingBottom: 32 },
  backBtn: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 },
  logoCard: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 8, marginBottom: 16 },
  logoImage: { width: width * 0.38, height: 38 },
  avatarContainer: { alignItems: 'center', paddingHorizontal: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#25427a', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  statsRow: { flexDirection: 'row', margin: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1a2b4a' },
  statLabel: { fontSize: 10, color: '#7c8aa5' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#25427a', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1a2b4a' },
  trustTitleRow: { flexDirection: 'row', alignItems: 'center' },
  trustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  trustScore: { fontSize: 12, fontWeight: 'bold' },
  trustBar: { height: 6, backgroundColor: '#f0f2f7', marginHorizontal: 16, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  trustFill: { height: 6, borderRadius: 3 },
  trustHint: { fontSize: 11, color: '#9aa5b8', lineHeight: 16, paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: '#f4f6fb', marginLeft: 64 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1a2b4a' },
  menuSub: { fontSize: 12, color: '#999', marginTop: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: 13, color: '#7c8aa5' },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1a2b4a', maxWidth: 160, textAlign: 'right' },
  appInfoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  logoCardSmall: { backgroundColor: '#f4f6fb', borderRadius: 10, padding: 8 },
  logoImageSmall: { width: 80, height: 30 },
  appInfoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a2b4a' },
  appInfoSub: { fontSize: 11, color: '#7c8aa5', marginTop: 2 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#25427a', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#7c8aa5', marginBottom: 20, lineHeight: 20 },
  modalInput: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 16, fontSize: 16, color: '#1a2b4a', borderWidth: 1, borderColor: '#f0f2f7', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, backgroundColor: '#f4f6fb', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalCancelText: { color: '#7c8aa5', fontWeight: '600' },
  modalSaveBtn: { flex: 1, backgroundColor: '#25427a', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
})

const p = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { backgroundColor: ds.hero, paddingHorizontal: 20, paddingBottom: 22, gap: 18 },
  h1: { fontSize: 24, lineHeight: 29, color: '#ffffff', fontFamily: F.x },
  gearBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, lineHeight: 24, color: ds.hero, fontFamily: F.x },
  name: { fontSize: 18, lineHeight: 22, color: '#ffffff', fontFamily: F.x },
  phone: { fontSize: 13, lineHeight: 16, color: ds.onHero, fontFamily: F.r, ...tnum },
  verified: { fontSize: 12, lineHeight: 15, color: ds.gold, fontFamily: F.b },
  statSplit: { borderLeftWidth: 1, borderLeftColor: ds.heroLine, paddingLeft: 14 },
  statLabel: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
  statValue: { fontSize: 16, lineHeight: 20, color: '#ffffff', fontFamily: F.x, ...tnum },
  list: { backgroundColor: ds.card, borderRadius: 18, borderWidth: 1, borderColor: ds.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  rowSub: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  goldPill: { fontSize: 12, lineHeight: 15, color: ds.goldInk, fontFamily: F.b, backgroundColor: ds.goldSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  detail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  detailKey: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.r },
  detailVal: { flexShrink: 1, fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.b, textAlign: 'right' },
  footer: { fontSize: 11, lineHeight: 16, color: ds.muted, fontFamily: F.r, textAlign: 'center', paddingTop: 4 },
})
