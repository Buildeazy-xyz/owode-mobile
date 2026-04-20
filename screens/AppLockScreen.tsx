import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f5a623" />
        <Text style={styles.loadingText}>Verifying...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <PinKeypad
        title="Welcome back"
        subtitle={`${user?.fullName?.split(' ')[0]} — Enter your 6-digit app PIN`}
        pinLength={6}
        onComplete={handlePinComplete}
      />
      <View style={styles.bottomActions}>
        {biometricAvailable && (
          <TouchableOpacity onPress={() => tryBiometric()} style={styles.biometricBtn}>
            <Text style={styles.biometricText}>
              {biometricInfo?.hasFaceID ? '😊 Use Face ID' : '👆 Use Fingerprint'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Login with password instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  bottomActions: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 12 },
  biometricBtn: { backgroundColor: 'rgba(245,166,35,0.25)', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(245,166,35,0.4)' },
  biometricText: { color: '#f5a623', fontWeight: '700', fontSize: 15 },
  logoutBtn: { marginTop: 4 },
  logoutText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 }
})