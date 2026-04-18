import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { logout, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isSettingPin, setIsSettingPin] = useState(false)

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

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      <Text style={styles.greeting}>Welcome back</Text>
      <Text style={styles.name}>{user?.fullName} 👋</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" style={{ marginTop: 40 }} />
      ) : (
        <PinKeypad
          title="Enter App PIN"
          subtitle="Enter your 6-digit PIN to continue"
          onComplete={handlePinComplete}
        />
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Login with password instead</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 4 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  logoutBtn: { marginTop: 20 },
  logoutText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 }
})