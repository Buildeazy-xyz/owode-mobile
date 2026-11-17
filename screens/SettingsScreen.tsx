import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Linking
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, font, shadow } from '../constants/theme'
import { TopBar, List, Row, ui } from '../components/ui'
import { F, ds } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import { getBiometricType, isBiometricEnrolled } from '../utils/biometrics'

const APP_VERSION = '1.0.1'

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth()
  const [biometricOn, setBiometricOn] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)
  const [voiceAlerts, setVoiceAlerts] = useState(true)

  useEffect(() => {
    (async () => {
      const b = await AsyncStorage.getItem('biometric_enabled')
      setBiometricOn(b === 'true')
      const hb = await AsyncStorage.getItem('hide_balance')
      setHideBalance(hb === 'true')
      const va = await AsyncStorage.getItem('voice_alerts')
      setVoiceAlerts(va !== 'false')
      try { setBiometricAvailable(await isBiometricEnrolled()) } catch { setBiometricAvailable(false) }
    })()
  }, [])

  const toggleBiometric = async (v: boolean) => {
    if (v && !biometricAvailable) {
      Alert.alert('Not Available', 'No fingerprint or face is enrolled on this device. Set one up in your phone settings first.')
      return
    }
    setBiometricOn(v)
    await AsyncStorage.setItem('biometric_enabled', v ? 'true' : 'false')
  }

  const toggleHideBalance = async (v: boolean) => {
    setHideBalance(v)
    await AsyncStorage.setItem('hide_balance', v ? 'true' : 'false')
  }

  const toggleVoice = async (v: boolean) => {
    setVoiceAlerts(v)
    await AsyncStorage.setItem('voice_alerts', v ? 'true' : 'false')
  }

  // OWODE Alajo Redesign "Settings" board
  const sw = (value: boolean, onChange: (v: boolean) => void) => (
    <Switch value={value} onValueChange={onChange}
      trackColor={{ false: '#cfd6e3', true: ds.navy }} thumbColor="#ffffff" />
  )
  const Group = ({ title }: { title: string }) => <Text style={st.group}>{title}</Text>

  return (
    <View style={ui.screen}>
      <TopBar title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[ui.body, { gap: 10, paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        <Group title="SECURITY" />
        <List>
          <Row icon="key" title={user?.hasTransactionPin ? 'Change transaction PIN' : 'Set transaction PIN'}
            sub="Required for transfers and savings" onPress={() => navigation.navigate('SetTransactionPin')} />
          <Row icon="lock" title="Change app lock PIN" sub="6-digit PIN to open the app"
            onPress={() => navigation.navigate('SetAppPin')} />
          <Row icon="finger" title="Fingerprint or face"
            sub={biometricAvailable ? 'Unlock and confirm faster' : 'Not set up on this phone'}
            right={sw(biometricOn, toggleBiometric)} />
          <Row icon="eyeOff" title="Hide balance on open" sub="Keep your balance hidden when the app opens"
            right={sw(hideBalance, toggleHideBalance)} />
        </List>

        <Group title="ALERTS" />
        <List>
          <Row icon="mic" title="Voice payment alerts" sub="Announce money received out loud"
            right={sw(voiceAlerts, toggleVoice)} />
          <Row icon="bell" title="Push notifications" sub="Managed in your phone settings"
            onPress={() => Linking.openSettings()} />
        </List>

        <Group title="ACCOUNT" />
        <List>
          <Row icon="shieldCheck" title="BVN / NIN verification" sub={user?.isVerified ? 'Verified' : 'Not verified yet'}
            onPress={() => navigation.navigate('KYCVerification')} />
          <Row icon="star" tone="gold" title="Trust score" sub="See your score and how to raise it"
            onPress={() => navigation.navigate('TrustScore')} />
          <Row icon="help" title="Help & support" sub="Chat, call, email and FAQs"
            onPress={() => navigation.navigate('HelpSupport')} />
        </List>

        <Group title="LEGAL" />
        <List>
          <Row icon="doc" title="Terms & conditions" onPress={() => Linking.openURL('https://owodealajo.com/terms.html')} />
          <Row icon="shield" title="Privacy policy" onPress={() => Linking.openURL('https://owodeagent.com/privacy.html')} />
          <Row icon="trash" danger title="Delete my account" sub="Request permanent deletion"
            onPress={() => Linking.openURL('https://owodeagent.com/delete-account.html')} />
        </List>

        <Text style={st.version}>OWODE Alajo · OWODE Digital Services Limited · RC 8569061</Text>
      </ScrollView>
    </View>
  )
}

const st = StyleSheet.create({
  group: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6, paddingHorizontal: 4, paddingTop: 6 },
  version: { fontSize: 11, lineHeight: 16, color: ds.muted, fontFamily: F.r, textAlign: 'center', paddingTop: 10 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg,
    backgroundColor: colors.navy,
  },
  backBtn: { width: 24 },
  headerTitle: { color: '#fff', fontSize: font.h3, fontWeight: font.bold },
  groupTitle: {
    fontSize: font.tiny, fontWeight: font.bold, color: colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.sm, marginHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    marginHorizontal: spacing.lg, overflow: 'hidden', ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.track },
  iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: font.body, fontWeight: font.semi, color: colors.text },
  rowSub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  versionText: { fontSize: font.small, color: colors.textMuted, fontWeight: font.semi },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xl },
})
