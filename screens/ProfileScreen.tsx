import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, TextInput, ActivityIndicator
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { kycAPI } from '../utils/api'

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth()
  const [kycStatus, setKycStatus] = useState<any>(null)
  const [bvn, setBvn] = useState('')
  const [nin, setNin] = useState('')
  const [loading, setLoading] = useState(false)

  const loadKYC = async () => {
    try {
      const response = await kycAPI.getStatus()
      setKycStatus(response.data.data)
    } catch (error) {
      console.error('KYC load error')
    }
  }

  useEffect(() => { loadKYC() }, [])

  const handleSubmitBVN = async () => {
    if (!bvn || bvn.length !== 11) {
      Alert.alert('Error', 'BVN must be exactly 11 digits')
      return
    }
    try {
      setLoading(true)
      await kycAPI.submitBVN(bvn)
      Alert.alert('Success', 'BVN submitted successfully!')
      await loadKYC()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNIN = async () => {
    if (!nin || nin.length !== 11) {
      Alert.alert('Error', 'NIN must be exactly 11 digits')
      return
    }
    try {
      setLoading(true)
      await kycAPI.submitNIN(nin)
      Alert.alert('Success', 'NIN submitted successfully!')
      await loadKYC()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ])
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View />
      </View>

      {/* Profile Info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={[styles.badge, { backgroundColor: user?.isVerified ? '#22c55e' : '#f5a623' }]}>
          <Text style={styles.badgeText}>{user?.isVerified ? '✅ Verified' : '⏳ Unverified'}</Text>
        </View>
      </View>

      {/* KYC Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KYC Status</Text>
        <View style={styles.kycCard}>
          <View style={styles.kycRow}>
            <Text style={styles.kycLabel}>BVN</Text>
            <Text style={[styles.kycStatus, { color: kycStatus?.hasBVN ? '#22c55e' : '#ef4444' }]}>
              {kycStatus?.hasBVN ? '✅ Submitted' : '❌ Not Submitted'}
            </Text>
          </View>
          <View style={styles.kycRow}>
            <Text style={styles.kycLabel}>NIN</Text>
            <Text style={[styles.kycStatus, { color: kycStatus?.hasNIN ? '#22c55e' : '#ef4444' }]}>
              {kycStatus?.hasNIN ? '✅ Submitted' : '❌ Not Submitted'}
            </Text>
          </View>
          <View style={styles.kycRow}>
            <Text style={styles.kycLabel}>Status</Text>
            <Text style={[styles.kycStatus, {
              color: kycStatus?.status === 'VERIFIED' ? '#22c55e' :
                kycStatus?.status === 'PENDING' ? '#f5a623' : '#ef4444'
            }]}>{kycStatus?.status}</Text>
          </View>
        </View>
      </View>

      {/* Submit BVN */}
      {!kycStatus?.hasBVN && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit BVN</Text>
          <TextInput style={styles.input} placeholder="Enter 11-digit BVN" value={bvn} onChangeText={setBvn} keyboardType="numeric" maxLength={11} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitBVN} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit BVN</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Submit NIN */}
      {!kycStatus?.hasNIN && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit NIN</Text>
          <TextInput style={styles.input} placeholder="Enter 11-digit NIN" value={nin} onChangeText={setNin} keyboardType="numeric" maxLength={11} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitNIN} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit NIN</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  phone: { fontSize: 14, color: '#888', marginTop: 4 },
  badge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  section: { margin: 16, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12 },
  kycCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  kycRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  kycLabel: { fontSize: 14, color: '#333', fontWeight: '600' },
  kycStatus: { fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, color: '#333' },
  submitBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { margin: 16, backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
})