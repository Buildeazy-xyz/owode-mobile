import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'

interface BiometricGateProps {
  children: React.ReactNode
  reason?: string
}

export default function BiometricGate({ children, reason }: BiometricGateProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    try {
      setLoading(true)
      const enabled = await isBiometricEnabled()
      if (!enabled) { setUnlocked(true); return }
      const success = await authenticateWithBiometrics(reason || 'Verify your identity')
      if (success) setUnlocked(true)
    } finally {
      setLoading(false)
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>Secure Content</Text>
      <Text style={styles.subtitle}>{reason || 'Verify your identity to view this'}</Text>
      <TouchableOpacity style={styles.btn} onPress={handleUnlock} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>👆 Verify Identity</Text>}
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  icon: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 40 },
  btn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 16, paddingHorizontal: 32 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
})