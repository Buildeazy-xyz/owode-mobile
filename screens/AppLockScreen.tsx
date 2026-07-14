import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'

export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { logout, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricInfo, setBiometricInfo] = useState<any>(null)

  useEffect(() => {
    checkAndTryBiometric()
  }, [])

  const checkAndTryBiometric = async () => {
    const enabled = await isBiometricEnabled()
    const info = await getBiometricType()
    setBiometricAvailable(enabled)
    setBiometricInfo(info)
    if (enabled) {
      tryBiometric(info)
    }
  }

  const tryBiometric = async (info?: any) => {
    const bioInfo = info || biometricInfo
    const success = await authenticateWithBiometrics(
      `Use ${bioInfo?.label || 'biometrics'} to unlock OWODE`
    )
    if (success) onUnlock()
  }

  const handlePinComplete = async (pin: string) => {
    try {
      setLoading(true)
      await authAPI.verifyAppPin(pin)
      onUnlock()
    } catch (error: any) {
      Alert.alert('Wrong PIN', 'Incorrect app PIN. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.loadingContainer}>
        <Image
          source={require('../assets/owode-logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#f5a623" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Verifying...</Text>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
      {/* Logo at top */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/owode-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            👤 {user?.fullName?.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* PIN Keypad */}
      <PinKeypad
        title="App Locked"
        subtitle="Enter your 6-digit PIN to unlock"
        pinLength={6}
        onComplete={handlePinComplete}
      />

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {biometricAvailable && (
          <TouchableOpacity
            onPress={() => tryBiometric()}
            style={styles.biometricBtn}
          >
            <Text style={styles.biometricText}>
              {biometricInfo?.hasFaceID ? 'Use Face ID' : '👆 Use Fingerprint'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Login with password instead</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingLogo: { width: 260, height: 90 },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  logoContainer: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  logo: { width: 260, height: 90, marginBottom: 12 },
  userBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  userBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bottomActions: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 12 },
  biometricBtn: { backgroundColor: 'rgba(245,166,35,0.25)', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(245,166,35,0.4)' },
  biometricText: { color: '#f5a623', fontWeight: '700', fontSize: 15 },
  logoutBtn: { marginTop: 4 },
  logoutText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 }
})