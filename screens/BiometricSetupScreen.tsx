import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Animated, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { getBiometricType, authenticateWithBiometrics } from '../utils/biometrics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import OwodeLoader from '../components/OwodeLoader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { TopBar, List, Row, Tile, Btn, ui } from '../components/ui'
import { ds } from '../constants/theme'

export default function BiometricSetupScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const [biometricInfo, setBiometricInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [setting, setSetting] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const pulseAnim = new Animated.Value(1)

  useEffect(() => {
    loadBiometricInfo()
    startPulse()
  }, [])

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start()
  }

  const loadBiometricInfo = async () => {
    try {
      const info = await getBiometricType()
      setBiometricInfo(info)
      const enabled = await AsyncStorage.getItem('biometric_enabled')
      setIsEnabled(!!enabled)
    } catch (e) {
      console.log('Biometric info error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleEnable = async () => {
    try {
      setSetting(true)
      const success = await authenticateWithBiometrics(
        `Verify your ${biometricInfo?.label} to enable it for OWODE`
      )
      if (success) {
        await AsyncStorage.setItem('biometric_enabled', 'true')
        setIsEnabled(true)
        Alert.alert(
          'Enabled!',
          `${biometricInfo?.label} is now enabled for OWODE. You can use it to unlock the app and authorize transactions.`,
          [{ text: 'Great!', onPress: () => navigation.goBack() }]
        )
      }
    } catch (e) {
      Alert.alert('Error', 'Could not enable biometric authentication')
    } finally {
      setSetting(false)
    }
  }

  const handleDisable = async () => {
    Alert.alert(
      'Disable Biometrics',
      `Are you sure you want to disable ${biometricInfo?.label}? You will need to use your PIN instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable', style: 'destructive', onPress: async () => {
            await AsyncStorage.removeItem('biometric_enabled')
            setIsEnabled(false)
          }
        }
      ]
    )
  }

  const handleTest = async () => {
    const success = await authenticateWithBiometrics('Test your biometric authentication')
    if (success) {
      Alert.alert('Success!', 'Biometric authentication is working perfectly!')
    } else {
      Alert.alert('Failed', 'Biometric authentication failed. Please try again.')
    }
  }

  // OWODE Alajo Redesign "Fingerprint setup" board
  const label = biometricInfo?.hasFaceID ? 'face' : 'fingerprint'
  return (
    <View style={ui.screen}>
      <TopBar title="Fingerprint & face" onBack={() => navigation.goBack()} />
      {loading ? (
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      ) : !biometricInfo?.hasAny ? (
        <View style={[ui.body, { alignItems: 'center', paddingTop: 48, gap: 12 }]}>
          <Tile icon="finger" size={64} tone="grey" />
          <Text style={[ui.h2, { textAlign: 'center' }]}>Not set up on this phone</Text>
          <Text style={[ui.lead, { textAlign: 'center' }]}>
            Add a fingerprint or face in your phone settings first, then come back here to turn it on for OWODE.
          </Text>
          <Btn title="Go back" kind="outline" onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[ui.body, { gap: 22 }]}>
            <View style={{ alignItems: 'center', gap: 14, paddingTop: 22 }}>
              <Animated.View style={[bio.outer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={bio.inner}><Icon name="finger" size={46} color={ds.navy} /></View>
              </Animated.View>
              <Text style={[ui.h2, { textAlign: 'center' }]}>
                {isEnabled ? `${biometricInfo.hasFaceID ? 'Face' : 'Fingerprint'} is on` : `Use your ${label}`}
              </Text>
              <Text style={[ui.lead, { textAlign: 'center', color: ds.muted, maxWidth: 300 }]}>
                {isEnabled
                  ? `You can unlock OWODE and approve payments with your ${label}.`
                  : 'Open OWODE and approve payments with a touch instead of typing your PIN every time.'}
              </Text>
            </View>
            <List>
              <Row icon="lock" title="Unlock the app" right={<Icon name="check" size={18} color={ds.navy} width={2.4} />} />
              <Row icon="send" title="Approve transfers" right={<Icon name="check" size={18} color={ds.navy} width={2.4} />} />
              <Row icon="shield" title={`Your ${label} stays on this phone`} sub="OWODE never sees or stores it" />
            </List>
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 28), gap: 10 }}>
            {!isEnabled ? (
              <>
                <Btn title={`Turn on ${label}`} icon="finger" onPress={handleEnable} loading={setting} />
                <Btn title="Not now" kind="outline" onPress={() => navigation.goBack()} />
              </>
            ) : (
              <>
                <Btn title="Test it" kind="navy" onPress={handleTest} />
                <Btn title="Turn off" kind="danger" onPress={handleDisable} />
              </>
            )}
          </View>
        </>
      )}
    </View>
  )
}

const bio = StyleSheet.create({
  outer: { width: 120, height: 120, borderRadius: 60, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
})

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  back: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  backText: { color: '#f5a623', fontSize: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  noSupportIcon: { fontSize: 64, marginBottom: 16 },
  noSupportTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  noSupportDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  settingsBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 16, paddingHorizontal: 32 },
  settingsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  biometricCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(245,166,35,0.2)',
    borderWidth: 3, borderColor: '#f5a623',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10
  },
  biometricIcon: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 16, borderWidth: 1,
    width: '100%', marginBottom: 16
  },
  statusIcon: { fontSize: 24 },
  statusText: { flex: 1 },
  statusTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 16, width: '100%', marginBottom: 32
  },
  featuresTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 },
  featureItem: { color: '#fff', fontSize: 14, marginBottom: 8 },
  enableBtn: {
    backgroundColor: '#f5a623', borderRadius: 16,
    padding: 18, width: '100%', alignItems: 'center',
    shadowColor: '#f5a623', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8
  },
  enableBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  enabledActions: { flexDirection: 'row', gap: 12, width: '100%' },
  testBtn: {
    flex: 1, backgroundColor: '#f5a623',
    borderRadius: 16, padding: 16, alignItems: 'center'
  },
  testBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disableBtn: {
    flex: 1, backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)'
  },
  disableBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
})