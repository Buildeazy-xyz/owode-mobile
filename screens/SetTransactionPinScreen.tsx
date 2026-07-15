import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function SetTransactionPinScreen({ navigation, route }: any) {
  const { user, refreshUser } = useAuth()
  const fromRegister = route?.params?.fromRegister
  const hasExistingPin = !fromRegister && !!user?.hasTransactionPin

  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(hasExistingPin ? 'current' : 'new')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [keypadKey, setKeypadKey] = useState(0)

  const resetTo = (s: 'current' | 'new' | 'confirm') => { setStep(s); setKeypadKey(k => k + 1) }

  const handleCurrent = (pin: string) => { setCurrentPin(pin); resetTo('new') }

  const handleNew = (pin: string) => {
    if (hasExistingPin && pin === currentPin) {
      Alert.alert('Choose a Different PIN', 'Your new PIN cannot be the same as your current PIN.')
      resetTo('new'); return
    }
    setNewPin(pin); resetTo('confirm')
  }

  const handleConfirm = async (pin: string) => {
    if (pin !== newPin) {
      Alert.alert('PINs Do Not Match', 'The PINs you entered are different. Please try again.')
      setNewPin(''); resetTo('new'); return
    }
    try {
      setLoading(true)
      await authAPI.setTransactionPin(pin, hasExistingPin ? currentPin : undefined)
      if (user) refreshUser({ ...user, hasTransactionPin: true })
      if (fromRegister) {
        Alert.alert('Setup Complete!', 'Your account is fully secured. Welcome to OWODE Alajo!',
          [{ text: 'Login Now', onPress: () => navigation.navigate('Login') }])
      } else {
        Alert.alert(hasExistingPin ? 'PIN Changed' : 'PIN Set',
          hasExistingPin ? 'Your transaction PIN has been updated.' : 'You can now make secure transfers.',
          [{ text: 'Done', onPress: () => navigation.goBack() }])
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || ''
      if (msg.includes('incorrect')) {
        Alert.alert('Wrong Current PIN', 'The current PIN you entered is incorrect. Please start again.')
        setCurrentPin(''); setNewPin(''); resetTo('current')
      } else if (msg.includes('CURRENT_PIN_REQUIRED')) {
        Alert.alert('Verification Needed', 'Please enter your current PIN first.')
        setCurrentPin(''); setNewPin(''); resetTo('current')
      } else {
        Alert.alert('Error', msg || 'Something went wrong. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const stepInfo = {
    current: { title: 'Enter Current PIN', sub: 'Confirm your existing 4-digit transaction PIN', handler: handleCurrent },
    new: { title: hasExistingPin ? 'Enter New PIN' : 'Set Transaction PIN', sub: 'Choose a secure 4-digit PIN for all transfers', handler: handleNew },
    confirm: { title: 'Confirm New PIN', sub: 'Enter the same 4-digit PIN again', handler: handleConfirm },
  }[step]

  const stepIndex = hasExistingPin ? { current: 1, new: 2, confirm: 3 }[step] : { current: 1, new: 1, confirm: 2 }[step]
  const totalSteps = hasExistingPin ? 3 : 2

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      {!fromRegister && (
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      )}
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>Step {stepIndex} of {totalSteps}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#f5a623" />
      ) : (
        <PinKeypad
          key={keypadKey}
          title={stepInfo.title}
          subtitle={stepInfo.sub}
          pinLength={4}
          requireConfirm={false}
          onComplete={stepInfo.handler}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  back: { position: 'absolute', top: 60, left: 24, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  backText: { color: '#f5a623', fontSize: 16, marginLeft: 2 },
  stepBadge: { position: 'absolute', top: 62, alignSelf: 'center', backgroundColor: 'rgba(245,166,35,0.15)', borderColor: '#f5a623', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  stepBadgeText: { color: '#f5a623', fontSize: 12, fontWeight: '700' },
})
