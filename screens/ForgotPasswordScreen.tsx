import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
   Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { authAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#1a2e55', '#25427a']} style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Reset password</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <Text style={styles.title}>What is your phone number?</Text>
            <Text style={styles.hint}>
              We will send a 6 digit code by SMS to the number on your OWODE account.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="08012345678"
              placeholderTextColor="#9aa5b8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
            <TouchableOpacity style={styles.btn} onPress={requestCode} disabled={loading}>
              {loading ? <OwodeLoader color="#fff" /> : <Text style={styles.btnText}>Send code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter the code and your new password</Text>
            <Text style={styles.hint}>The code expires in 10 minutes.</Text>

            <Text style={styles.label}>6 digit code</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#9aa5b8"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text style={styles.label}>New password</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={styles.pwInput}
                placeholder="At least 6 characters"
                placeholderTextColor="#9aa5b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ paddingHorizontal: 14 }}>
                <Ionicons name={showPw ? 'eye-outline' : 'eye-off-outline'} size={18} color="#7c8aa5" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm new password</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={styles.pwInput}
                placeholder="Type it again"
                placeholderTextColor="#9aa5b8"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPw}
              />
            </View>
            {confirm.length > 0 && confirm !== password ? (
              <Text style={styles.mismatch}>Passwords do not match</Text>
            ) : null}

            <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
              {loading ? <OwodeLoader color="#fff" /> : <Text style={styles.btnText}>Change password</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={requestCode} disabled={loading} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={styles.resend}>Did not get the code? Send again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
