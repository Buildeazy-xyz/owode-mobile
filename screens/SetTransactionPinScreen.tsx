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
  const onSuccess = route.params?.onSuccess

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
      Alert.alert('✅ Transaction PIN Set!', 'You can now make transfers securely.', [
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
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" />
      ) : step === 'set' ? (
        <PinKeypad
          title="Set Transaction PIN"
          subtitle="Choose a 4-digit PIN for transfers"
          pinLength={4}
          onComplete={handleFirstPin}
        />
      ) : (
        <PinKeypad
          title="Confirm PIN"
          subtitle="Enter the same PIN again"
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
  backText: { color: '#f5a623', fontSize: 16 }
})