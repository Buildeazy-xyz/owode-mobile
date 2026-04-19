import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import * as LocalAuthentication from 'expo-local-authentication'

export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { logout, user } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => { tryBiometric() }, [])

  const tryBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync()
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (compatible && enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify your identity to open OWODE',
          fallbackLabel: 'Use PIN instead'
        })
        if (result.success) onUnlock()
      }
    } catch (e) {}
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
        title={`Welcome back`}
        subtitle={`${user?.fullName} — Enter your 6-digit app PIN`}
        pinLength={6}
        onComplete={handlePinComplete}
      />
      <View style={styles.bottomActions}>
        <TouchableOpacity onPress={tryBiometric} style={styles.biometricBtn}>
          <Text style={styles.biometricText}>👆 Use Fingerprint</Text>
        </TouchableOpacity>
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
  biometricBtn: { backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  biometricText: { color: '#f5a623', fontWeight: '600', fontSize: 14 },
  logoutBtn: {},
  logoutText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 }
})