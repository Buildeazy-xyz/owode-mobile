import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import OwodeLoader from '../components/OwodeLoader'
import Icon from '../components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F, ds } from '../constants/theme'

export default function SetTransactionPinScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets()
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
      <LinearGradient colors={['#14244a', '#14244a']} style={styles.container}>
        <View style={[styles.topRow, { paddingTop: insets.top + 18 }]}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Icon name="back" size={20} color="#ffffff" width={2} />
          </TouchableOpacity>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step 1 of 3</Text></View>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.verifyBox}>
          <View style={styles.lockTile}><Icon name="shieldCheck" size={26} color={ds.gold} width={2} /></View>
          <Text style={styles.verifyTitle}>Verify it's you</Text>
          <Text style={styles.verifySub}>
            {sending ? 'Sending a verification code...' : `Enter the 6-digit code sent to your ${otpChannel || 'phone'}`}
          </Text>
          <TextInput
            style={styles.otpInput}
            placeholder="------"
            placeholderTextColor="rgba(255,255,255,0.25)"
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
    <LinearGradient colors={['#14244a', '#14244a']} style={styles.container}>
      <View style={[styles.topRow, { paddingTop: insets.top + 18 }]}>
        {!fromRegister ? (
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Icon name="back" size={20} color="#ffffff" width={2} />
          </TouchableOpacity>
        ) : <View style={{ width: 44 }} />}
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>Step {stepIndex} of {totalSteps}</Text></View>
        <View style={{ width: 44 }} />
      </View>
      {loading ? (
        <OwodeLoader size="large" fullscreen color="#f5a623" />
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
  container: { flex: 1, backgroundColor: '#14244a' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#ffffff' },
  stepBadge: { backgroundColor: ds.heroChip, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  stepBadgeText: { color: ds.onHero, fontSize: 12, lineHeight: 15, fontFamily: F.b },
  verifyBox: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 36, gap: 10 },
  lockTile: { width: 56, height: 56, borderRadius: 18, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { color: '#ffffff', fontSize: 22, lineHeight: 27, fontFamily: F.x },
  verifySub: { color: ds.onHero, fontSize: 14, lineHeight: 20, fontFamily: F.r, textAlign: 'center', marginBottom: 14 },
  otpInput: { alignSelf: 'stretch', height: 64, backgroundColor: ds.heroChip, borderWidth: 1.5, borderColor: ds.heroBtn, borderRadius: 16, color: '#ffffff', fontSize: 28, fontFamily: F.x, letterSpacing: 12, textAlign: 'center' },
  verifyBtn: { alignSelf: 'stretch', marginTop: 14, backgroundColor: ds.gold, borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText: { color: ds.hero, fontSize: 16, lineHeight: 20, fontFamily: F.x },
  resendText: { color: ds.gold, fontSize: 14, lineHeight: 17, fontFamily: F.b },
})
