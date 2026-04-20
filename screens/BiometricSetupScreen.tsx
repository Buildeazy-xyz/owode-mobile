import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Animated
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { getBiometricType, authenticateWithBiometrics } from '../utils/biometrics'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function BiometricSetupScreen({ navigation }: any) {
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
          '✅ Enabled!',
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
      Alert.alert('✅ Success!', 'Biometric authentication is working perfectly!')
    } else {
      Alert.alert('❌ Failed', 'Biometric authentication failed. Please try again.')
    }
  }

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" />
      ) : !biometricInfo?.hasAny ? (
        <View style={styles.content}>
          <Text style={styles.noSupportIcon}>😔</Text>
          <Text style={styles.noSupportTitle}>Not Available</Text>
          <Text style={styles.noSupportDesc}>
            Your device doesn't have biometric hardware or you haven't set up fingerprint/face ID in your phone settings.
          </Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.settingsBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Biometric Icon */}
          <Animated.View style={[styles.biometricCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.biometricIcon}>
              {biometricInfo.hasFaceID ? '😊' : '👆'}
            </Text>
          </Animated.View>

          <Text style={styles.title}>
            {biometricInfo.hasFaceID ? 'Face ID' : 'Fingerprint'}
          </Text>
          <Text style={styles.subtitle}>
            {isEnabled
              ? `${biometricInfo.label} is active on your OWODE account`
              : `Enable ${biometricInfo.label} for faster and more secure access to OWODE`}
          </Text>

          {/* Status */}
          <View style={[styles.statusCard, { borderColor: isEnabled ? '#22c55e' : '#f5a623' }]}>
            <Text style={styles.statusIcon}>{isEnabled ? '✅' : '⚪'}</Text>
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>{isEnabled ? 'Enabled' : 'Not Enabled'}</Text>
              <Text style={styles.statusDesc}>
                {isEnabled
                  ? `Use ${biometricInfo.label} to unlock app and authorize transactions`
                  : `Tap below to enable ${biometricInfo.label} for OWODE`}
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>What you can do with {biometricInfo.label}:</Text>
            {[
              `🔓 Unlock OWODE app instantly`,
              `💸 Authorize transfers faster`,
              `🛡️ Extra layer of security`,
              `⚡ No PIN needed for quick access`
            ].map((f, i) => (
              <Text key={i} style={styles.featureItem}>{f}</Text>
            ))}
          </View>

          {/* Buttons */}
          {!isEnabled ? (
            <TouchableOpacity
              style={styles.enableBtn}
              onPress={handleEnable}
              disabled={setting}
            >
              {setting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enableBtnText}>
                  {biometricInfo.hasFaceID ? '😊 Enable Face ID' : '👆 Enable Fingerprint'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.enabledActions}>
              <TouchableOpacity style={styles.testBtn} onPress={handleTest}>
                <Text style={styles.testBtnText}>🧪 Test It</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disableBtn} onPress={handleDisable}>
                <Text style={styles.disableBtnText}>Disable</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  )
}

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