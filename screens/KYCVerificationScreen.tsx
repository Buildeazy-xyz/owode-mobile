import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ScrollView,
  Image, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { kycAPI, authAPI } from '../utils/api'
import { Ionicons } from '@expo/vector-icons'
import OwodeLoader from '../components/OwodeLoader'
import { TopBar, Card, List, Row, Tile, Pill, Field, Btn, Section, Note, ui } from '../components/ui'
import { F, ds } from '../constants/theme'

const { width } = Dimensions.get('window')

export default function KYCVerificationScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'bvn' | 'nin'>('bvn')
  const [bvn, setBvn] = useState('')
  const [nin, setNin] = useState('')
  const [loading, setLoading] = useState(false)
  const [kycStatusState, setKycStatusState] = useState<{hasBVN?: boolean; hasNIN?: boolean; isVerified?: boolean}>({})

  React.useEffect(() => {
    authAPI.getMe().then((r: any) => {
      const d = r.data?.data
      if (d) setKycStatusState({ hasBVN: d.hasBVN, hasNIN: d.hasNIN, isVerified: d.isVerified })
    }).catch(() => {})
  }, [])

  const handleSubmitBVN = async () => {
    if (bvn.length !== 11) {
      Alert.alert('Error', 'BVN must be exactly 11 digits')
      return
    }
    try {
      setLoading(true)
      const response = await kycAPI.submitBVN(bvn)
      Alert.alert(
        'BVN Submitted',
        response.data.message || 'Your BVN has been submitted for verification!',
        [{ text: 'OK' }]
      )
      setKycStatusState(st => ({ ...st, hasBVN: true }))
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
        'NIN Submitted',
        response.data.message || 'Your NIN has been submitted for verification!',
        [{ text: 'OK' }]
      )
      setKycStatusState(st => ({ ...st, hasNIN: true }))
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // OWODE Alajo Redesign "Identity verification" board — BVN and NIN cards stacked
  const idCard = (kind: 'bvn' | 'nin') => {
    const isB = kind === 'bvn'
    const done = isB ? kycStatusState.hasBVN : kycStatusState.hasNIN
    const value = isB ? bvn : nin
    const setValue = isB ? setBvn : setNin
    const submit = isB ? handleSubmitBVN : handleSubmitNIN
    const title = isB ? 'Bank Verification Number (BVN)' : 'National Identification Number (NIN)'
    const masked = (v: string) => v.length === 11 ? `${v.slice(0, 3)} •••• ••${v.slice(-2)}` : ''
    if (done) {
      return (
        <Card key={kind} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Tile icon={kycStatusState.isVerified ? 'checkCircle' : 'clock'} tone={kycStatusState.isVerified ? 'blue' : 'gold'} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={kv.title}>{isB ? 'BVN' : 'NIN'}</Text>
            <Text style={ui.muted}>{kycStatusState.isVerified ? 'Confirmed' : 'Submitted — we are checking it'}</Text>
          </View>
          <Pill tone={kycStatusState.isVerified ? 'blue' : 'gold'}>{kycStatusState.isVerified ? 'Verified' : 'Under review'}</Pill>
        </Card>
      )
    }
    return (
      <Card key={kind}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tile icon={isB ? 'shieldCheck' : 'doc'} tone="gold" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={kv.title}>{title}</Text>
            <Text style={ui.muted}>{isB ? 'Dial *565*0# on your registered line to get it' : 'Dial *346# on your registered line to get it'}</Text>
          </View>
        </View>
        <Field label={isB ? 'BVN' : 'NIN'} placeholder="11 digits" value={value}
          onChangeText={t => setValue(t.replace(/\D/g, '').slice(0, 11))} keyboardType="number-pad" maxLength={11} />
        {value.length > 0 && value.length < 11 ? <Text style={ui.muted}>{11 - value.length} more digits</Text> : null}
        <Btn title={`Verify ${isB ? 'BVN' : 'NIN'}`} small onPress={submit} loading={loading && activeTab === kind}
          disabled={value.length !== 11 || loading} />
      </Card>
    )
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="Identity verification" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ui.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={ui.lead}>Verify once with your BVN and NIN. It keeps your money safe and unlocks every feature.</Text>
        <View onTouchStart={() => setActiveTab('bvn')}>{idCard('bvn')}</View>
        <View onTouchStart={() => setActiveTab('nin')}>{idCard('nin')}</View>
        <Section>What it unlocks</Section>
        <List>
          <Row icon="ajo" title="Join Guaranteed Ajọ groups" />
          <Row icon="send" title="Send and receive larger amounts" />
          <Row icon="star" tone="gold" title="+10 trust points for each" />
        </List>
        <Note icon="lock">Your number is encrypted and only used to confirm who you are.</Note>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const kv = StyleSheet.create({
  title: { fontSize: 14, lineHeight: 18, color: ds.ink, fontFamily: F.x },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
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
  whyTitle: { fontSize: 14, fontWeight: 'bold', color: '#25427a', marginBottom: 12 },
  whyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eaf2ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, width: (width - 64) / 2 - 4 },
  whyIcon: { fontSize: 16 },
  whyText: { fontSize: 12, color: '#25427a', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#f0f2f7', borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#7c8aa5' },
  tabTextActive: { color: '#25427a' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#25427a', marginBottom: 6 },
  formSub: { fontSize: 13, color: '#7c8aa5', lineHeight: 20, marginBottom: 16 },
  infoBox: { backgroundColor: '#fff8e1', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ffe082' },
  infoBoxText: { fontSize: 13, color: '#f57c00', lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#25427a', marginBottom: 8 },
  input: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 16, fontSize: 22, color: '#1a2b4a', letterSpacing: 6, textAlign: 'center', borderWidth: 1, borderColor: '#f0f2f7', marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e6eaf2' },
  progressDotFilled: { backgroundColor: '#25427a' },
  inputHint: { fontSize: 12, color: '#f5a623', marginBottom: 8, textAlign: 'center' },
  securityNote: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#c8e6c9' },
  securityNoteText: { fontSize: 12, color: '#22c55e', lineHeight: 18 },
  submitBtn: { backgroundColor: '#25427a', borderRadius: 14, padding: 18, alignItems: 'center', shadowColor: '#25427a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { backgroundColor: '#e6eaf2', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
})