import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function SetAppPinScreen({ navigation, route }: any) {
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
      await authAPI.setAppPin(pin)
      await AsyncStorage.setItem('has_app_pin', 'true')

      if (fromRegister) {
        // After registration flow — go to set transaction PIN
        Alert.alert(
          '✅ App PIN Set!',
          'Great! Now set your Transaction PIN for secure transfers.',
          [{ text: 'Continue', onPress: () => navigation.navigate('SetTransactionPin', { fromRegister: true }) }]
        )
      } else {
        Alert.alert(
          '✅ App PIN Set!',
          'Your app will now lock when minimized.',
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
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <Text style={styles.progressStepText}>2</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressStepText}>3</Text>
            </View>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Register</Text>
            <Text style={[styles.progressLabel, { color: '#f5a623' }]}>App PIN</Text>
            <Text style={styles.progressLabel}>Trans PIN</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" />
      ) : step === 'set' ? (
        <PinKeypad
          title="Set App Lock PIN"
          subtitle="Choose a 6-digit PIN to lock your app when minimized"
          pinLength={6}
          onComplete={handleFirstPin}
        />
      ) : (
        <PinKeypad
          title="Confirm App PIN"
          subtitle="Enter the same 6-digit PIN again to confirm"
          pinLength={6}
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