import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView,
  Image, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { kycAPI } from '../utils/api'

const { width } = Dimensions.get('window')

export default function KYCVerificationScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'bvn' | 'nin'>('bvn')
  const [bvn, setBvn] = useState('')
  const [nin, setNin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmitBVN = async () => {
    if (bvn.length !== 11) {
      Alert.alert('Error', 'BVN must be exactly 11 digits')
      return
    }
    try {
      setLoading(true)
      const response = await kycAPI.submitBVN(bvn)
      Alert.alert(
        'BVN Submitted ✅',
        response.data.message || 'Your BVN has been submitted for verification!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNIN = async () => {
    if (nin.length !== 11) {
      Alert.alert('Error', 'NIN must be exactly 11 digits')
      return
    }
    try {
      setLoading(true)
      const response = await kycAPI.submitNIN(nin)
      Alert.alert(
        'NIN Submitted ✅',
        response.data.message || 'Your NIN has been submitted for verification!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoCard}>
            <Image source={require('../assets/owode-logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Identity Verification</Text>
            <Text style={styles.headerSub}>Verify your identity to unlock all features</Text>
          </View>
        </LinearGradient>

        {/* Why verify */}
        <View style={styles.section}>
          <View style={styles.whyCard}>
            <Text style={styles.whyTitle}>Why verify your identity?</Text>
            <View style={styles.whyRow}>
              {[
                { icon: '🛡️', text: 'Join Guaranteed Ajo' },
                { icon: '💰', text: 'Higher transfer limits' },
                { icon: '⭐', text: 'Higher trust score' },
                { icon: '🔓', text: 'Full platform access' },
              ].map(item => (
                <View key={item.text} style={styles.whyItem}>
                  <Text style={styles.whyIcon}>{item.icon}</Text>
                  <Text style={styles.whyText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.section}>
          <View style={styles.tabs}>
            {(['bvn', 'nin'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'bvn' ? '🏦 BVN' : '🪪 NIN'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* BVN Form */}
        {activeTab === 'bvn' && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Bank Verification Number (BVN)</Text>
              <Text style={styles.formSub}>
                Your BVN is a unique 11-digit number assigned by the Central Bank of Nigeria
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  💡 Dial *565*0# on your registered phone to get your BVN
                </Text>
              </View>
              <Text style={styles.inputLabel}>Enter your 11-digit BVN</Text>
              <TextInput
                style={styles.input}
                placeholder="• • • • • • • • • • •"
                placeholderTextColor="#ccc"
                value={bvn}
                onChangeText={setBvn}
                keyboardType="numeric"
                maxLength={11}
              />
              <View style={styles.progressRow}>
                {Array.from({ length: 11 }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.progressDot, i < bvn.length && styles.progressDotFilled]}
                  />
                ))}
              </View>
              {bvn.length > 0 && bvn.length < 11 && (
                <Text style={styles.inputHint}>{11 - bvn.length} more digits needed</Text>
              )}
              <View style={styles.securityNote}>
                <Text style={styles.securityNoteText}>
                  🔒 Your BVN is encrypted with 256-bit security and verified via YouVerify
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, bvn.length !== 11 && styles.submitBtnDisabled]}
                onPress={handleSubmitBVN}
                disabled={bvn.length !== 11 || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Verify BVN →</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* NIN Form */}
        {activeTab === 'nin' && (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>National Identification Number (NIN)</Text>
              <Text style={styles.formSub}>
                Your NIN is an 11-digit number on your National ID Card
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  💡 Dial *346# on your registered phone to get your NIN
                </Text>
              </View>
              <Text style={styles.inputLabel}>Enter your 11-digit NIN</Text>
              <TextInput
                style={styles.input}
                placeholder="• • • • • • • • • • •"
                placeholderTextColor="#ccc"
                value={nin}
                onChangeText={setNin}
                keyboardType="numeric"
                maxLength={11}
              />
              <View style={styles.progressRow}>
                {Array.from({ length: 11 }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.progressDot, i < nin.length && styles.progressDotFilled]}
                  />
                ))}
              </View>
              {nin.length > 0 && nin.length < 11 && (
                <Text style={styles.inputHint}>{11 - nin.length} more digits needed</Text>
              )}
              <View style={styles.securityNote}>
                <Text style={styles.securityNoteText}>
                  🔒 Your NIN is encrypted with 256-bit security and verified via YouVerify
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, nin.length !== 11 && styles.submitBtnDisabled]}
                onPress={handleSubmitNIN}
                disabled={nin.length !== 11 || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Verify NIN →</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingBottom: 32 },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  logoCard: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 8, marginBottom: 16 },
  logoImage: { width: width * 0.38, height: 38 },
  headerContent: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  section: { marginHorizontal: 16, marginTop: 16 },
  whyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  whyTitle: { fontSize: 14, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12 },
  whyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f7ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, width: (width - 64) / 2 - 4 },
  whyIcon: { fontSize: 16 },
  whyText: { fontSize: 12, color: '#0d47a1', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#0d47a1' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 6 },
  formSub: { fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 16 },
  infoBox: { backgroundColor: '#fff8e1', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ffe082' },
  infoBoxText: { fontSize: 13, color: '#f57c00', lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 8 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 22, color: '#333', letterSpacing: 6, textAlign: 'center', borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e0e0e0' },
  progressDotFilled: { backgroundColor: '#0d47a1' },
  inputHint: { fontSize: 12, color: '#f5a623', marginBottom: 8, textAlign: 'center' },
  securityNote: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#c8e6c9' },
  securityNoteText: { fontSize: 12, color: '#2e7d32', lineHeight: 18 },
  submitBtn: { backgroundColor: '#0d47a1', borderRadius: 14, padding: 18, alignItems: 'center', shadowColor: '#0d47a1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { backgroundColor: '#ccc', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
})