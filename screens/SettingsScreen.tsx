import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Linking
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius, font, shadow } from '../constants/theme'
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

  const Row = ({ icon, iconBg, label, sub, onPress, right, last }: any) => (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg || colors.tint }]}>
        <Ionicons name={icon} size={18} color={colors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right !== undefined ? right : <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        <Text style={styles.groupTitle}>Security & Privacy</Text>
        <View style={styles.card}>
          <Row
            icon="keypad-outline"
            label={user?.hasTransactionPin ? 'Change Transaction PIN' : 'Set Transaction PIN'}
            sub="Required to authorise transfers and savings"
            onPress={() => navigation.navigate('SetTransactionPin')}
          />
          <Row
            icon="lock-closed-outline"
            label="Change App Lock PIN"
            sub="6-digit PIN to unlock the app"
            onPress={() => navigation.navigate('SetAppPin')}
          />
          <Row
            icon="finger-print-outline"
            label="Biometric Login"
            sub={biometricAvailable ? 'Use fingerprint or face to authenticate' : 'Not enrolled on this device'}
            right={
              <Switch
                value={biometricOn}
                onValueChange={toggleBiometric}
                trackColor={{ false: colors.track, true: colors.gold }}
                thumbColor="#fff"
              />
            }
          />
          <Row
            icon="eye-off-outline"
            label="Hide Balance by Default"
            sub="Keep your balance hidden when the app opens"
            right={
              <Switch
                value={hideBalance}
                onValueChange={toggleHideBalance}
                trackColor={{ false: colors.track, true: colors.gold }}
                thumbColor="#fff"
              />
            }
            last
          />
        </View>

        <Text style={styles.groupTitle}>Notifications</Text>
        <View style={styles.card}>
          <Row
            icon="volume-high-outline"
            label="Voice Payment Alerts"
            sub="Announce payments received out loud"
            right={
              <Switch
                value={voiceAlerts}
                onValueChange={toggleVoice}
                trackColor={{ false: colors.track, true: colors.gold }}
                thumbColor="#fff"
              />
            }
          />
          <Row
            icon="notifications-outline"
            label="Push Notifications"
            sub="Managed in your phone settings"
            onPress={() => Linking.openSettings()}
            last
          />
        </View>

        <Text style={styles.groupTitle}>Verification</Text>
        <View style={styles.card}>
          <Row
            icon="shield-checkmark-outline"
            label="BVN / NIN Verification"
            sub={user?.isVerified ? 'Verified' : 'Not verified'}
            onPress={() => navigation.navigate('KYCVerification')}
          />
          <Row
            icon="star-outline"
            label="Trust Score"
            sub="View your score and how to improve it"
            onPress={() => navigation.navigate('TrustScore')}
            last
          />
        </View>

        <Text style={styles.groupTitle}>Support</Text>
        <View style={styles.card}>
          <Row
            icon="help-buoy-outline"
            label="Help & Support"
            sub="Chat, call, email and FAQs"
            onPress={() => navigation.navigate('HelpSupport')}
            last
          />
        </View>

        <Text style={styles.groupTitle}>Legal</Text>
        <View style={styles.card}>
          <Row
            icon="document-text-outline"
            label="Terms & Conditions"
            onPress={() => Linking.openURL('https://owodealajo.com/terms.html')}
          />
          <Row
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://owodeagent.com/privacy.html')}
          />
          <Row
            icon="trash-outline"
            label="Delete My Account"
            sub="Request permanent account deletion"
            onPress={() => Linking.openURL('https://owodeagent.com/delete-account.html')}
            last
          />
        </View>

        <Text style={styles.groupTitle}>About</Text>
        <View style={styles.card}>
          <Row
            icon="globe-outline"
            label="Visit Our Website"
            sub="owodealajo.com"
            onPress={() => Linking.openURL('https://owodealajo.com')}
          />
          <Row
            icon="information-circle-outline"
            label="App Version"
            right={<Text style={styles.versionText}>{APP_VERSION}</Text>}
            last
          />
        </View>

        <Text style={styles.footer}>OWODE Digital Services Limited</Text>
      </ScrollView>
    </View>
  )
}

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
