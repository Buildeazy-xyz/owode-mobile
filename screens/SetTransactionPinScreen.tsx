import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function SetTransactionPinScreen({ navigation, route }: any) {
  const { user, refreshUser } = useAuth()
  const fromRegister = route?.params?.fromRegister
  const hasExistingPin = !fromRegister && !!user?.hasTransactionPin

  const [step, setStep] = useState<'verify' | 'new' | 'confirm'>(hasExistingPin ? 'verify' : 'new')
  const [otpCode, setOtpCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [keypadKey, setKeypadKey] = useState(0)
  const [otpChannel, setOtpChannel] = useState('')

  const resetTo = (s: 'new' | 'confirm') => { setStep(s); setKeypadKey(k => k + 1) }

  const sendCode = async () => {
    if (!user?.phone) { Alert.alert('Error', 'No phone number on file'); return }
    try {
      setSending(true)
      const res = await authAPI.sendOTP(user.phone, undefined, (user as any)?.email || undefined)
      setOtpChannel(res.data?.channel === 'email' ? 'email' : 'SMS')
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not send code')
    } finally { setSending(false) }
  }

  useEffect(() => { if (hasExistingPin) sendCode() }, [])

  const handleVerifyContinue = () => {
    if (otpCode.length !== 6) { Alert.alert('Enter Code', 'Enter the 6-digit code sent to you'); return }
    resetTo('new')
  }

  const handleNew = (pin: string) => { setNewPin(pin); resetTo('confirm') }

  const handleConfirm = async (pin: string) => {
    if (pin !== newPin) {
      Alert.alert('PINs Do Not Match', 'The PINs you entered are different. Please try again.')
      setNewPin(''); resetTo('new'); return
    }
    try {
      setLoading(true)
      if (hasExistingPin) {
        await authAPI.resetTransactionPin(otpCode, pin)
      } else {
        await authAPI.setTransactionPin(pin)
      }
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
      if (msg.includes('OTP')) {
        Alert.alert('Verification Failed', msg + '\n\nPlease start again.')
        setOtpCode(''); setNewPin(''); setStep('verify')
        if (hasExistingPin) sendCode()
      } else {
        Alert.alert('Error', msg || 'Something went wrong. Please try again.')
      }
    } finally { setLoading(false) }
  }

  if (step === 'verify') {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 1 of 3</Text></View>
        <View style={styles.verifyBox}>
          <Ionicons name="shield-checkmark" size={44} color="#f5a623" />
          <Text style={styles.verifyTitle}>Verify it's you</Text>
          <Text style={styles.verifySub}>
            {sending ? 'Sending a verification code...' : `Enter the 6-digit code sent to your ${otpChannel || 'phone'}`}
          </Text>
          <TextInput
            style={styles.otpInput}
            placeholder="------"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="number-pad"
            maxLength={6}
            value={otpCode}
            onChangeText={setOtpCode}
          />
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyContinue}>
            <Text style={styles.verifyBtnText}>Verify & Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={sendCode} disabled={sending} style={{ marginTop: 14 }}>
            <Text style={styles.resendText}>{sending ? 'Sending...' : 'Resend code'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  const stepInfo = {
    new: { title: hasExistingPin ? 'Enter New PIN' : 'Set Transaction PIN', sub: 'Choose a secure 4-digit PIN for all transfers', handler: handleNew },
    confirm: { title: 'Confirm New PIN', sub: 'Enter the same 4-digit PIN again', handler: handleConfirm },
  }[step]

  const stepIndex = hasExistingPin ? { new: 2, confirm: 3 }[step] : { new: 1, confirm: 2 }[step]
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
  verifyBox: { width: '100%', alignItems: 'center', paddingHorizontal: 10 },
  verifyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 14 },
  verifySub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  otpInput: { width: '70%', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.4)', borderRadius: 14, color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: 12, textAlign: 'center', paddingVertical: 14 },
  verifyBtn: { marginTop: 24, backgroundColor: '#f5a623', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40, width: '80%', alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendText: { color: '#f5a623', fontSize: 14, fontWeight: '600' },
})
