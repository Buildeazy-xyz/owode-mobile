import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { walletAPI } from '../utils/api'
import PinKeypad from '../components/PinKeypad'
import { useAuth } from '../context/AuthContext'
import { announcePayment } from '../utils/speech'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'

export default function TransferScreen({ navigation }: any) {
  const { user } = useAuth()
  const [recipientPhone, setRecipientPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'pin'>('form')
  const [recents, setRecents] = useState<any[]>([])

  useEffect(() => {
    AsyncStorage.getItem('recent_recipients')
      .then(v => { if (v) setRecents(JSON.parse(v)) })
      .catch(() => {})
  }, [])

  const saveRecipient = async (phone: string, name: string) => {
    try {
      const raw = await AsyncStorage.getItem('recent_recipients')
      const list = raw ? JSON.parse(raw) : []
      const next = [{ phone, name }, ...list.filter((r: any) => r.phone !== phone)].slice(0, 8)
      await AsyncStorage.setItem('recent_recipients', JSON.stringify(next))
    } catch (e) {}
  }
  const isProcessing = useRef(false) // ← prevents double transfer
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000]

  const handlePinStep = async () => {
    const bioEnabled = await isBiometricEnabled()
    if (bioEnabled) {
      const bioInfo = await getBiometricType()
      Alert.alert(
        'Authorize Transfer',
        `Use ${bioInfo.label} or PIN to authorize ₦${Number(amount).toLocaleString()} transfer`,
        [
          {
            text: `${bioInfo.icon} ${bioInfo.label}`,
            onPress: async () => {
              const success = await authenticateWithBiometrics('Authorize this transfer')
              if (success) executeTransfer('BIOMETRIC_AUTH')
            }
          },
          { text: 'Use PIN', onPress: () => setStep('pin') },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
    } else {
      setStep('pin')
    }
  }

  const handleContinue = () => {
    if (!recipientPhone || !amount || !description) {
      Alert.alert('Error', 'All fields are required')
      return
    }
    if (recipientPhone.length !== 11) {
      Alert.alert('Error', 'Enter a valid 11 digit phone number')
      return
    }
    if (Number(amount) < 100) {
      Alert.alert('Error', 'Minimum transfer amount is ₦100')
      return
    }
    if (!user?.hasTransactionPin) {
      Alert.alert(
        'Transaction PIN Required',
        'You need to set a transaction PIN before making transfers.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN Now', onPress: () => navigation.navigate('SetTransactionPin') }
        ]
      )
      return
    }
    Alert.alert(
      'Confirm Transfer',
      `Send ₦${Number(amount).toLocaleString()} to ${recipientPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm & Authorize', onPress: handlePinStep }
      ]
    )
  }

  const executeTransfer = async (transactionPin: string) => {
    // Prevent double transfer
    if (isProcessing.current) return
    isProcessing.current = true

    // Immediately go back to form to prevent re-entry
    setStep('form')
    setLoading(true)

    try {
      const response = await walletAPI.transfer(
        recipientPhone,
        Number(amount),
        description,
        transactionPin
      )
      await saveRecipient(recipientPhone, response.data.data.recipient)
      announcePayment({ type: 'DEBIT', amount: Number(amount) })
      navigation.replace('Receipt', {
        transaction: {
          type: 'DEBIT',
          amount: Number(amount),
          balance: response.data.data.newBalance,
          description: `Transfer to ${response.data.data.recipient}`,
          reference: response.data.data.reference,
          status: 'SUCCESS',
          createdAt: new Date().toISOString()
        }
      })
    } catch (error: any) {
      Alert.alert('Transfer Failed', error.response?.data?.message || 'Something went wrong')
      isProcessing.current = false
    } finally {
      setLoading(false)
    }
  }

  if (step === 'pin') {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
        <PinKeypad
          title="Transaction PIN"
          subtitle={`Authorizing ₦${Number(amount).toLocaleString()} transfer`}
          pinLength={4}
          onComplete={executeTransfer}
        />
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setStep('form')}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>← Cancel transfer</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
        <Text style={styles.headerSubtitle}>Transfer to any OWODE user instantly</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d47a1" />
          <Text style={styles.loadingText}>Processing transfer...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {recents.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>Recent recipients</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingTop: 4 }}>
                {recents.map((r: any) => (
                  <TouchableOpacity key={r.phone} style={styles.recentItem} onPress={() => setRecipientPhone(r.phone)}>
                    <View style={styles.recentAvatar}>
                      <Text style={styles.recentAvatarText}>{(r.name || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.recentName} numberOfLines={1}>{(r.name || r.phone).split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Recipient Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="08012345678"
              placeholderTextColor="#9aa5b8"
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Amount (₦)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#9aa5b8"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <Text style={styles.quickLabel}>Quick Select</Text>
            <View style={styles.quickRow}>
              {quickAmounts.map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickBtn, amount === String(q) && styles.quickBtnActive]}
                  onPress={() => setAmount(String(q))}
                >
                  <Text style={[styles.quickBtnText, amount === String(q) && styles.quickBtnTextActive]}>
                    ₦{q.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="What is this for?"
              placeholderTextColor="#9aa5b8"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Transaction PIN warning */}
          {!user?.hasTransactionPin && (
            <View style={styles.pinWarning}>
              <Text style={styles.pinWarningText}>
                ⚠️ You need to set a Transaction PIN before making transfers!
              </Text>
              <TouchableOpacity
                style={styles.pinWarningBtn}
                onPress={() => navigation.navigate('SetTransactionPin')}
              >
                <Text style={styles.pinWarningBtnText}>Set PIN Now →</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sendButton, !user?.hasTransactionPin && styles.sendButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !user?.hasTransactionPin}
          >
            <Text style={styles.sendButtonText}>Send Money</Text>
            {amount ? (
              <Text style={styles.sendButtonAmount}>₦{Number(amount).toLocaleString()}</Text>
            ) : null}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Transfers are instant and secured by OWODE's double-entry ledger system
          </Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  recentItem: { alignItems: 'center', width: 58 },
  recentAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  recentAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  recentName: { fontSize: 11, color: '#7c8aa5', textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30 },
  back: { color: '#f5a623', fontSize: 16, marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#0d47a1', fontSize: 16, marginTop: 16, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#0d47a1', marginBottom: 12 },
  input: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 16, fontSize: 16, color: '#1a2b4a' },
  amountInput: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 16, fontSize: 28, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center', marginBottom: 16 },
  quickLabel: { fontSize: 12, color: '#7c8aa5', marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { backgroundColor: '#f4f6fb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  quickBtnActive: { backgroundColor: '#0d47a1' },
  quickBtnText: { fontSize: 13, color: '#1a2b4a', fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
  pinWarning: { backgroundColor: '#fff3e0', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f5a623' },
  pinWarningText: { fontSize: 13, color: '#f5a623', marginBottom: 12 },
  pinWarningBtn: { backgroundColor: '#f5a623', borderRadius: 10, padding: 12, alignItems: 'center' },
  pinWarningBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  sendButton: { backgroundColor: '#0d47a1', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  sendButtonDisabled: { backgroundColor: '#e6eaf2' },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sendButtonAmount: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  disclaimer: { textAlign: 'center', color: '#7c8aa5', fontSize: 12, marginBottom: 40, lineHeight: 20 }
})