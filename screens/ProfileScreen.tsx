import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Image, Dimensions,
  Linking, TextInput, Modal
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0d47a1" />
      </View>
    )
  }

  const kycItems = [
    {
      icon: 'card-outline' as any, bg: '#e3f2fd', iconColor: '#0d47a1',
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

  const securityItems = [
    {
      icon: 'keypad-outline' as any, bg: '#e3f2fd', iconColor: '#0d47a1',
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
      icon: 'mail-open-outline' as any, bg: '#e3f2fd', iconColor: '#0d47a1',
      label: 'Email Support',
      sub: 'support@owodealajo.com',
      onPress: () => Linking.openURL('mailto:support@owodealajo.com')
    },
    {
      icon: 'globe-outline' as any, bg: '#fff3e0', iconColor: '#f5a623',
      label: 'Visit Website',
      sub: 'owode.xyz',
      onPress: () => Linking.openURL('https://owode.xyz')
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
      onPress: () => Linking.openURL('https://owode.xyz')
    },
    {
      icon: 'shield-checkmark-outline' as any, bg: '#e8f5e9', iconColor: '#22c55e',
      label: 'Privacy Policy',
      sub: 'How we protect your data',
      onPress: () => Linking.openURL('https://owode.xyz')
    },
  ]

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#f5a623" />
        </TouchableOpacity>
        <View style={styles.logoCard}>
          <Image source={require('../assets/owode-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser?.fullName?.charAt(0)}</Text>
            <View style={styles.avatarEdit}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </View>
          <Text style={styles.name}>{currentUser?.fullName}</Text>
          <Text style={styles.phone}>{currentUser?.phone}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { borderColor: currentUser?.isVerified ? '#22c55e' : '#f5a623' }]}>
              <Ionicons
                name={currentUser?.isVerified ? 'checkmark-circle' : 'time-outline'}
                size={11}
                color={currentUser?.isVerified ? '#22c55e' : '#f5a623'}
              />
              <Text style={[styles.badgeText, { color: currentUser?.isVerified ? '#22c55e' : '#f5a623' }]}>
                {currentUser?.isVerified ? ' Verified' : ' Unverified'}
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
          { label: 'Balance', value: `₦${(currentUser?.wallet?.balance || 0).toLocaleString()}` },
          { label: 'Total Saved', value: `₦${(currentUser?.wallet?.totalSaved || 0).toLocaleString()}` },
          { label: 'Total Payout', value: `₦${(currentUser?.wallet?.totalPayout || 0).toLocaleString()}` },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Trust Score */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.trustHeader}>
            <View style={styles.trustTitleRow}>
              <Ionicons name="star" size={16} color={trustColor} />
              <Text style={styles.cardTitle}> Trust Score</Text>
            </View>
            <Text style={[styles.trustScore, { color: trustColor }]}>
              {Math.round(trustScore)}/100 — {trustLabel}
            </Text>
          </View>
          <View style={styles.trustBar}>
            <View style={[styles.trustFill, { width: `${Math.min(trustScore, 100)}%`, backgroundColor: trustColor }]} />
          </View>
          <Text style={styles.trustHint}>Complete KYC and maintain good payment history to increase your score</Text>
        </View>
      </View>

      {/* KYC */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identity Verification (KYC)</Text>
        <View style={styles.card}>
          {kycItems.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={[styles.menuSub, item.done && { color: '#22c55e' }]}>{item.sub}</Text>
                </View>
                <Ionicons
                  name={item.done ? 'checkmark-circle' : 'chevron-forward'}
                  size={18}
                  color={item.done ? '#22c55e' : '#ccc'}
                />
              </TouchableOpacity>
              {i < kycItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          {securityItems.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              {i < securityItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.card}>
          {[
            { label: 'Full Name', value: currentUser?.fullName, editable: false },
            { label: 'Phone Number', value: currentUser?.phone, editable: false },
            { label: 'Email', value: currentUser?.email || 'Not provided — tap to add', editable: true },
            { label: 'Country', value: currentUser?.country || 'Nigeria', editable: false },
            { label: 'Account Type', value: currentUser?.role, editable: false },
            { label: 'Wallet Status', value: currentUser?.wallet?.isLocked ? 'Locked' : 'Active', editable: false },
          ].map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => item.editable && setShowEmailModal(true)}
                disabled={!item.editable}
              >
                <Text style={styles.infoLabel}>{item.label}</Text>
                <View style={styles.infoRight}>
                  <Text style={[styles.infoValue, item.editable && !currentUser?.email && { color: '#f5a623' }]}>
                    {item.value}
                  </Text>
                  {item.editable && (
                    <Ionicons
                      name={currentUser?.email ? 'create-outline' : 'add-circle-outline'}
                      size={16}
                      color="#0d47a1"
                    />
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
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <View style={styles.card}>
          {supportItems.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIconBg, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
              {i < supportItems.length - 1 && <View style={styles.divider} />}
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
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}> Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Save</Text>
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
  backBtn: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 },
  logoCard: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 8, marginBottom: 16 },
  logoImage: { width: width * 0.38, height: 38 },
  avatarContainer: { alignItems: 'center', paddingHorizontal: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0d47a1', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  statsRow: { flexDirection: 'row', margin: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  statLabel: { fontSize: 10, color: '#888' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0d47a1', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  trustTitleRow: { flexDirection: 'row', alignItems: 'center' },
  trustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  trustScore: { fontSize: 12, fontWeight: 'bold' },
  trustBar: { height: 6, backgroundColor: '#f0f0f0', marginHorizontal: 16, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  trustFill: { height: 6, borderRadius: 3 },
  trustHint: { fontSize: 11, color: '#aaa', lineHeight: 16, paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: '#f5f5f5', marginLeft: 64 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  menuSub: { fontSize: 12, color: '#999', marginTop: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: 13, color: '#888' },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#333', maxWidth: 160, textAlign: 'right' },
  appInfoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  logoCardSmall: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 8 },
  logoImageSmall: { width: 80, height: 30 },
  appInfoTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  appInfoSub: { fontSize: 11, color: '#888', marginTop: 2 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ef4444' },
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
