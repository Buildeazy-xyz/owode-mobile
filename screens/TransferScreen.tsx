import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { walletAPI } from '../utils/api'
import PinKeypad from '../components/PinKeypad'
import { useAuth } from '../context/AuthContext'
import { announcePayment } from '../utils/speech'

export default function TransferScreen({ navigation }: any) {
  const { user } = useAuth()
  const [recipientPhone, setRecipientPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'pin'>('form')
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000]

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

    // Check if transaction PIN is set
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
        { text: 'Confirm & Enter PIN', onPress: () => setStep('pin') }
      ]
    )
  }

  const executeTransfer = async (transactionPin: string) => {
    try {
      setLoading(true)
      const response = await walletAPI.transfer(recipientPhone, Number(amount), description, transactionPin)
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

    announcePayment({ type: 'DEBIT', amount: Number(amount) })
    } catch (error: any) {
      Alert.alert('Transfer Failed', error.response?.data?.message || 'Something went wrong')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

if (step === 'pin') {
  return (
    <View style={{ flex: 1 }}>
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
    </View>
  )
}

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
        <Text style={styles.headerSubtitle}>Transfer to any OWODE user instantly</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Recipient Phone Number</Text>
          <TextInput style={styles.input} placeholder="08012345678" placeholderTextColor="#888" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" maxLength={11} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor="#888" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Text style={styles.quickLabel}>Quick Select</Text>
          <View style={styles.quickRow}>
            {quickAmounts.map(q => (
              <TouchableOpacity key={q} style={[styles.quickBtn, amount === String(q) && styles.quickBtnActive]} onPress={() => setAmount(String(q))}>
                <Text style={[styles.quickBtnText, amount === String(q) && styles.quickBtnTextActive]}>₦{q.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={styles.input} placeholder="What is this for?" placeholderTextColor="#888" value={description} onChangeText={setDescription} />
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={handleContinue} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.sendButtonText}>Send Money 💸</Text>
              {amount ? <Text style={styles.sendButtonAmount}>₦{Number(amount).toLocaleString()}</Text> : null}
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>🔒 Transfers are instant and secured by OWODE's double-entry ledger system</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  pinContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30 },
  back: { color: '#f5a623', fontSize: 16, marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#0d47a1', marginBottom: 12 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, color: '#333' },
  amountInput: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 28, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center', marginBottom: 16 },
  quickLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  quickBtnActive: { backgroundColor: '#0d47a1' },
  quickBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  quickBtnTextActive: { color: '#fff' },
  sendButton: { backgroundColor: '#0d47a1', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sendButtonAmount: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  disclaimer: { textAlign: 'center', color: '#888', fontSize: 12, marginBottom: 40, lineHeight: 20 },
  backLink: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 20 }
})