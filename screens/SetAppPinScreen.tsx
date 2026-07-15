import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'

export default function SetAppPinScreen({ navigation, route }: any) {
  const fromRegister = route?.params?.fromRegister
  const [hasExistingPin, setHasExistingPin] = useState(false)
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [keypadKey, setKeypadKey] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem('has_app_pin').then(v => {
      const exists = !!v && !fromRegister
      setHasExistingPin(exists)
      setStep(exists ? 'current' : 'new')
      setReady(true)
    })
  }, [])

  const resetTo = (s: 'current' | 'new' | 'confirm') => { setStep(s); setKeypadKey(k => k + 1) }

  const handleCurrent = (pin: string) => { setCurrentPin(pin); resetTo('new') }

  const handleNew = (pin: string) => {
    if (hasExistingPin && pin === currentPin) {
      Alert.alert('Choose a Different PIN', 'Your new app lock PIN cannot be the same as the current one.')
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
      await authAPI.setAppPin(pin, hasExistingPin ? currentPin : undefined)
      await AsyncStorage.setItem('has_app_pin', 'true')
      if (fromRegister) {
        navigation.navigate('SetTransactionPin', { fromRegister: true })
      } else {
        Alert.alert(hasExistingPin ? 'App Lock PIN Changed' : 'App Lock PIN Set',
          'Your app is protected with a 6-digit lock PIN.',
          [{ text: 'Done', onPress: () => navigation.goBack() }])
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || ''
      if (msg.includes('incorrect')) {
        Alert.alert('Wrong Current PIN', 'The current app PIN you entered is incorrect. Please start again.')
        setCurrentPin(''); setNewPin(''); resetTo('current')
      } else if (msg.includes('CURRENT_PIN_REQUIRED')) {
        Alert.alert('Verification Needed', 'Please enter your current app PIN first.')
        setCurrentPin(''); setNewPin(''); resetTo('current')
      } else {
        Alert.alert('Error', msg || 'Something went wrong. Please try again.')
      }
    } finally { setLoading(false) }
  }

  if (!ready) return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      <ActivityIndicator size="large" color="#f5a623" />
    </LinearGradient>
  )

  const stepInfo = {
    current: { title: 'Enter Current App PIN', sub: 'Confirm your existing 6-digit app lock PIN', handler: handleCurrent },
    new: { title: hasExistingPin ? 'Enter New App PIN' : 'Set App Lock PIN', sub: 'Choose a 6-digit PIN to unlock the app', handler: handleNew },
    confirm: { title: 'Confirm New App PIN', sub: 'Enter the same 6-digit PIN again', handler: handleConfirm },
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
          pinLength={6}
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
