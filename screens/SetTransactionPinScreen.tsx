import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function SetTransactionPinScreen({ navigation, route }: any) {
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState<'set' | 'confirm'>('set')
  const [firstPin, setFirstPin] = useState('')
  const [loading, setLoading] = useState(false)
  const fromRegister = route?.params?.fromRegister

  const handleFirstPin = (pin: string) => {
    setFirstPin(pin)
    setStep('confirm')
  }

  const handleConfirmPin = async (pin: string) => {
    if (pin !== firstPin) {
      Alert.alert('Error', 'PINs do not match. Try again.')
      setStep('set')
      setFirstPin('')
      return
    }
    try {
      setLoading(true)
      await authAPI.setTransactionPin(pin)
      if (user) {
        refreshUser({ ...user, hasTransactionPin: true })
      }

      if (fromRegister) {
        Alert.alert(
          '🎉 Setup Complete!',
          'Your account is fully secured! Welcome to OWODE Alajo!\n\n✅ App Lock PIN set\n✅ Transaction PIN set\n\nYou can now login!',
          [{ text: 'Login Now', onPress: () => navigation.navigate('Login') }]
        )
      } else {
        Alert.alert(
          '✅ Transaction PIN Set!',
          'You can now make secure transfers.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        )
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      {!fromRegister && (
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}

      {/* Progress indicator for registration flow */}
      {fromRegister && (
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <View style={[styles.progressStep, styles.progressStepDone]}>
              <Text style={styles.progressStepText}>✅</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, styles.progressStepDone]}>
              <Text style={styles.progressStepText}>✅</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <Text style={styles.progressStepText}>3</Text>
            </View>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Register</Text>
            <Text style={styles.progressLabel}>App PIN</Text>
            <Text style={[styles.progressLabel, { color: '#f5a623' }]}>Trans PIN</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" />
      ) : step === 'set' ? (
        <PinKeypad
          title="Set Transaction PIN"
          subtitle="Choose a secure 4-digit PIN for all transfers"
          pinLength={4}
          onComplete={handleFirstPin}
        />
      ) : (
        <PinKeypad
          title="Confirm Transaction PIN"
          subtitle="Enter the same 4-digit PIN again to confirm"
          pinLength={4}
          onComplete={handleConfirmPin}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  back: { position: 'absolute', top: 60, left: 24 },
  backText: { color: '#f5a623', fontSize: 16 },
  progressContainer: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressStep: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  progressStepActive: { backgroundColor: '#f5a623' },
  progressStepDone: { backgroundColor: '#22c55e' },
  progressStepText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  progressLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  progressLabels: { flexDirection: 'row', gap: 28 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' }
})