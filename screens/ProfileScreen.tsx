import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Image, Dimensions,
  Linking, TextInput, Modal
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../utils/api'
import { isBiometricEnabled, getBiometricType } from '../utils/biometrics'

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

  useEffect(() => {
    loadFreshData()
    checkBio()
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
      refreshUser({ ...user, email })
      setShowEmailModal(false)
      Alert.alert('Success ✅', 'Email updated successfully!')
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
  const trustColor = (currentUser?.trustScore || 0) >= 65 ? '#22c55e' : (currentUser?.trustScore || 0) >= 35 ? '#f5a623' : '#ef4444'
  const trustLabel = (currentUser?.trustScore || 0) >= 65 ? 'Excellent' : (currentUser?.trustScore || 0) >= 35 ? 'Good' : 'Low'

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0d47a1" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.logoCard}>
          <Image source={require('../assets/owode-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser?.fullName?.charAt(0)}</Text>
            <View style={styles.avatarEdit}>
              <Text style={styles.avatarEditText}>📷</Text>
            </View>
          </View>
          <Text style={styles.name}>{currentUser?.fullName}</Text>
          <Text style={styles.phone}>{currentUser?.phone}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { borderColor: currentUser?.isVerified ? '#22c55e' : '#f5a623' }]}>
              <Text style={[styles.badgeText, { color: currentUser?.isVerified ? '#22c55e' : '#f5a623' }]}>
                {currentUser?.isVerified ? '✅ Verified' : '⏳ Unverified'}
              </Text>
            </View>
            <View style={[styles.badge, { borderColor: '#f5a623' }]}>
              <Text style={[styles.badgeText, { color: '#f5a623' }]}>{currentUser?.role}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Balance', value: `₦${(currentUser?.wallet?.balance || 0).toLocaleString()}`, icon: '💰', color: '#0d47a1' },
          { label: 'Total Saved', value: `₦${(currentUser?.wallet?.totalSaved || 0).toLocaleString()}`, icon: '🏦', color: '#22c55e' },
          { label: 'Total Payout', value: `₦${(currentUser?.wallet?.totalPayout || 0).toLocaleString()}`, icon: '💸', color: '#f5a623' },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Trust Score */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.trustHeader}>
            <Text style={styles.cardTitle}>⭐ Trust Score</Text>
            <Text style={[styles.trustScore, { color: trustColor }]}>
              {Math.round(currentUser?.trustScore || 0)}/100 — {trustLabel}
            </Text>
          </View>
          <View style={styles.trustBar}>
            <View style={[styles.trustFill, {
              width: `${Math.min(currentUser?.trustScore || 0, 100)}%`,
              backgroundColor: trustColor
            }]} />
          </View>
          <Text style={styles.trustHint}>Complete KYC and maintain good payment history to increase your score</Text>
        </View>
      </View>

      {/* KYC */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Identity Verification (KYC)</Text>
        <View style={styles.card}>
          {[
            {
              icon: '🏦', bg: '#e3f2fd',
              label: 'BVN Verification',
              sub: currentUser?.hasBVN ? '✅ BVN verified' : '❌ Not submitted — tap to verify',
              onPress: () => navigation.navigate('KYCVerification')
            },
            {
              icon: '🪪', bg: '#f3e5f5',
              label: 'NIN Verification',
              sub: currentUser?.hasNIN ? '✅ NIN verified' : '❌ Not submitted — tap to verify',
              onPress: () => navigation.navigate('KYCVerification')
            },
            {
              icon: '😊', bg: '#e8f5e9',
              label: 'Face Verification',
              sub: currentUser?.isVerified ? '✅ Identity fully verified' : '❌ Not verified — tap to start',
              onPress: () => navigation.navigate('FaceVerification')
            },
          ].map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                  <Text style={styles.menuIconText}>{item.icon}</Text>
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuArrow}>→</Text>
              </TouchableOpacity>
              {i < 2 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Security — NO Face ID here */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Security</Text>
        <View style={styles.card}>
          {[
            {
              icon: '💳', bg: '#e3f2fd',
              label: currentUser?.hasTransactionPin ? 'Change Transaction PIN' : 'Set Transaction PIN',
              sub: currentUser?.hasTransactionPin ? '4-digit PIN is set ✅' : 'Not set — tap to set now ⚠️',
              onPress: () => navigation.navigate('SetTransactionPin')
            },
            {
              icon: '🔒', bg: '#fff3e0',
              label: 'Change App Lock PIN',
              sub: '6-digit PIN to lock your app',
              onPress: () => navigation.navigate('SetAppPin')
            },
            {
              icon: '👆', bg: '#e8f5e9',
              label: bioEnabled ? `Change ${bioInfo?.label || 'Biometrics'}` : `Set Up ${bioInfo?.label || 'Biometrics'}`,
              sub: bioEnabled ? `${bioInfo?.label} is active ✅` : 'Use biometrics for faster login',
              onPress: () => navigation.navigate('BiometricSetup')
            },
          ].map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                  <Text style={styles.menuIconText}>{item.icon}</Text>
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuArrow}>→</Text>
              </TouchableOpacity>
              {i < 2 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Account Details</Text>
        <View style={styles.card}>
          {[
            { label: 'Full Name', value: currentUser?.fullName, editable: false },
            { label: 'Phone Number', value: currentUser?.phone, editable: false },
            { label: 'Email', value: currentUser?.email || 'Not provided — tap to add', editable: true },
            { label: 'Country', value: currentUser?.country || 'Nigeria', editable: false },
            { label: 'Account Type', value: currentUser?.role, editable: false },
            { label: 'Wallet Status', value: currentUser?.wallet?.isLocked ? '🔒 Locked' : '🔓 Active', editable: false },
          ].map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => item.editable && setShowEmailModal(true)}
                disabled={!item.editable}
              >
                <Text style={styles.infoLabel}>{item.label}</Text>
                <View style={styles.infoRight}>
                  <Text style={[
                    styles.infoValue,
                    item.editable && !currentUser?.email && { color: '#f5a623' }
                  ]}>
                    {item.value}
                  </Text>
                  {item.editable && (
                    <Text style={styles.editBtn}>
                      {currentUser?.email ? '✏️' : '+ Add'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {i < 5 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Help & Support</Text>
        <View style={styles.card}>
          {[
            {
              icon: '💬', bg: '#e8f5e9',
              label: 'WhatsApp Support',
              sub: '+234 802 097 3590',
              onPress: () => Linking.openURL('https://wa.me/2348020973590?text=Hello OWODE Support, I need help with my account')
            },
            {
              icon: '📧', bg: '#e3f2fd',
              label: 'Email Support',
              sub: 'support@owodealajo.com',
              onPress: () => Linking.openURL('mailto:support@owodealajo.com?subject=OWODE Support Request')
            },
            {
              icon: '🌐', bg: '#fff3e0',
              label: 'Visit Website',
              sub: 'owode.xyz',
              onPress: () => Linking.openURL('https://owode.xyz')
            },
            {
              icon: '📋', bg: '#f3e5f5',
              label: 'Terms & Conditions',
              sub: 'Read our terms of service',
              onPress: () => Linking.openURL('https://owode.xyz')
            },
            {
              icon: '🔒', bg: '#fce4ec',
              label: 'Privacy Policy',
              sub: 'How we protect your data',
              onPress: () => Linking.openURL('https://owode.xyz')
            },
          ].map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                  <Text style={styles.menuIconText}>{item.icon}</Text>
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuArrow}>→</Text>
              </TouchableOpacity>
              {i < 4 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.appInfoRow}>
            <View style={styles.logoCardSmall}>
              <Image source={require('../assets/owode-logo.png')} style={styles.logoImageSmall} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appInfoTitle}>OWODE Alajo</Text>
              <Text style={styles.appInfoSub}>Version 1.0.0</Text>
              <Text style={styles.appInfoSub}>OWODE Digital Services Limited</Text>
              <Text style={styles.appInfoSub}>CAC: RC 8569061</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {currentUser?.email ? '✏️ Update Email' : '+ Add Email Address'}
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
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEmailModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEmail}
                disabled={emailLoading}
              >
                {emailLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Save →</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingBottom: 32 },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  logoCard: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 8, marginBottom: 16 },
  logoImage: { width: width * 0.38, height: 38 },
  avatarContainer: { alignItems: 'center', paddingHorizontal: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0d47a1', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarEditText: { fontSize: 13 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  statsRow: { flexDirection: 'row', margin: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0d47a1', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  trustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  trustScore: { fontSize: 12, fontWeight: 'bold' },
  trustBar: { height: 6, backgroundColor: '#f0f0f0', marginHorizontal: 16, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  trustFill: { height: 6, borderRadius: 3 },
  trustHint: { fontSize: 11, color: '#aaa', lineHeight: 16, paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: '#f5f5f5', marginLeft: 64 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuIconText: { fontSize: 20 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  menuSub: { fontSize: 12, color: '#888', marginTop: 2 },
  menuArrow: { color: '#ccc', fontSize: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: 13, color: '#888' },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#333', maxWidth: 160, textAlign: 'right' },
  editBtn: { fontSize: 12, color: '#0d47a1', fontWeight: '700' },
  appInfoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  logoCardSmall: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 8 },
  logoImageSmall: { width: 80, height: 30 },
  appInfoTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  appInfoSub: { fontSize: 11, color: '#888', marginTop: 2 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 20 },
  modalInput: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalSaveBtn: { flex: 1, backgroundColor: '#0d47a1', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
})
 