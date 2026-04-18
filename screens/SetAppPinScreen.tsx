import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function SetAppPinScreen({ navigation }: any) {
  const [step, setStep] = useState<'set' | 'confirm'>('set')
  const [firstPin, setFirstPin] = useState('')
  const [loading, setLoading] = useState(false)

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
      Alert.alert('Success', 'App PIN set successfully! Your app will now lock when minimized.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" />
      ) : step === 'set' ? (
        <PinKeypad
          title="Set App PIN"
          subtitle="Choose a 6-digit PIN to lock your app"
          pinLength={6}
          onComplete={handleFirstPin}
        />
      ) : (
        <PinKeypad
          title="Confirm PIN"
          subtitle="Enter the same PIN again to confirm"
          pinLength={6}
          onComplete={handleConfirmPin}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }
})
