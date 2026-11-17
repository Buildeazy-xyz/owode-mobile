import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
   Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { authAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { TopBar, Field, Btn, ui } from '../components/ui'
import { F, ds } from '../constants/theme'

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const insets = useSafeAreaInsets()

  const requestCode = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 11) { Alert.alert('Check the number', 'Enter your 11 digit phone number'); return }
    try {
      setLoading(true)
      const res = await authAPI.forgotPassword(digits)
      Alert.alert('Check your phone', res.data?.message || 'If that number has an account, we have sent a code.')
      setStep(2)
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not send the code. Try again.')
    } finally { setLoading(false) }
  }

  const submit = async () => {
    if (otp.length !== 6) { Alert.alert('Check the code', 'Enter the 6 digit code sent to your phone'); return }
    if (password.length < 6) { Alert.alert('Password too short', 'Use at least 6 characters'); return }
    if (password !== confirm) { Alert.alert('Passwords do not match', 'Both passwords must be the same'); return }
    try {
      setLoading(true)
      await authAPI.resetPassword(phone.replace(/\D/g, ''), otp, password)
      Alert.alert('Password changed', 'You can now log in with your new password.', [
        { text: 'Log in', onPress: () => navigation.replace('Login') }
      ])
    } catch (e: any) {
      Alert.alert('Could not reset', e.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  // OWODE Alajo Redesign "Forgot password" board
  const spaced = (d: string) => [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(' ')
  const digits = phone.replace(/\D/g, '')
  const match = confirm.length > 0 && confirm === password && password.length >= 6
  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="Forgot password" onBack={() => step === 1 ? navigation.goBack() : setStep(1)} />
      <ScrollView contentContainerStyle={[ui.body, { gap: 18, paddingTop: 22 }]} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={ui.h2}>Reset your password</Text>
              <Text style={ui.lead}>We will send a 6-digit code by SMS to the number on your OWODE account.</Text>
            </View>
            <Field label="Phone number" placeholder="0801 234 5678" value={spaced(digits)}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 11))} keyboardType="phone-pad" maxLength={13} />
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={ui.h2}>Choose a new password</Text>
              <Text style={ui.lead}>Enter the code we sent to {spaced(digits)}. It expires in 10 minutes.</Text>
            </View>
            <Field label="6-digit code" placeholder="123456" value={otp} onChangeText={t => setOtp(t.replace(/\D/g, ''))}
              keyboardType="number-pad" maxLength={6} style={{ letterSpacing: 6, fontSize: 20 }} />
            <Field label="New password" placeholder="At least 6 characters" value={password} onChangeText={setPassword}
              secureTextEntry={!showPw} autoCapitalize="none"
              right={<TouchableOpacity onPress={() => setShowPw(!showPw)} accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={20} color={ds.muted} />
              </TouchableOpacity>} />
            <Field label="Confirm new password" placeholder="Type it again" value={confirm} onChangeText={setConfirm}
              secureTextEntry={!showPw} autoCapitalize="none" />
            {confirm.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name={match ? 'checkCircle' : 'alert'} size={16} color={match ? ds.navy : ds.danger} width={2} />
                <Text style={[ui.muted, { color: match ? ds.inkSoft : ds.danger }]}>
                  {match ? 'Passwords match' : confirm !== password ? 'Passwords do not match' : 'Use at least 6 characters'}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 28), gap: 14, alignItems: 'center' }}>
        <Btn title={step === 1 ? 'Send code' : 'Change password'} onPress={step === 1 ? requestCode : submit} loading={loading} style={{ alignSelf: 'stretch' }} />
        {step !== 1 ? (
          <TouchableOpacity onPress={requestCode} disabled={loading}>
            <Text style={{ fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b }}>Didn't get the code? Send again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, minHeight: 56 },
  headerTitle: { flex: 1, flexShrink: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { padding: 20, backgroundColor: '#f4f6fb', flexGrow: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#1a2b4a', marginBottom: 6, marginTop: 8 },
  hint: { fontSize: 13, lineHeight: 19, color: '#7c8aa5', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#25427a', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6eaf2', paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#1a2b4a' },
  pwWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6eaf2' },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#1a2b4a' },
  mismatch: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  btn: { backgroundColor: '#25427a', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24, minHeight: 50, justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resend: { color: '#25427a', fontSize: 13, fontWeight: '600' },
})
