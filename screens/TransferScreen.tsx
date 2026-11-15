import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { F, ds, tnum } from '../constants/theme'
import { commas, naira } from '../utils/ajoDue'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authAPI, walletAPI } from '../utils/api'
import PinKeypad from '../components/PinKeypad'
import { useAuth } from '../context/AuthContext'
import { announcePayment } from '../utils/speech'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import OwodeLoader from '../components/OwodeLoader'
import { getTransactionLocation } from '../utils/location'

export default function TransferScreen({ navigation }: any) {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [kbOpen, setKbOpen] = useState(false)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'pin'>('form')
  const [recents, setRecents] = useState<any[]>([])
  const [recipientName, setRecipientName] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')

  useEffect(() => {
    walletAPI.getBalance()
      .then(r => setWalletBalance(Number(r.data?.data?.balance || 0)))
      .catch(() => {})
    // The on-screen keypad hides while the phone keyboard is up so they never overlap.
    const show = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false))
    return () => { show.remove(); hide.remove() }
  }, [])

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
  const isProcessing = useRef(false) // prevents double transfer
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

  useEffect(() => {
    setRecipientName('')
    setLookupError('')
    let digits = recipientPhone.replace(/\D/g, '')
    // Some people leave off the leading zero. Treat 8085806038 as 08085806038.
    if (digits.length === 10 && digits[0] !== '0') digits = '0' + digits
    if (digits.length !== 11) return
    let cancelled = false
    setLookingUp(true)
    const timer = setTimeout(async () => {
      try {
        const res = await authAPI.lookupRecipient(digits)
        if (!cancelled) {
          setRecipientName(res.data?.data?.fullName || '')
          if (res.data?.data?.fullName) Keyboard.dismiss()
        }
      } catch (e: any) {
        if (!cancelled) {
          const status = e?.response?.status
          setLookupError(
            status === 404
              ? 'No OWODE account found for this number'
              : !e?.response
                ? 'No internet connection'
                : 'Could not check this number'
          )
        }
      } finally {
        if (!cancelled) setLookingUp(false)
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [recipientPhone])

  const handleContinue = () => {
    if (recipientPhone.replace(/\D/g, '').length === 11 && !recipientName) {
      Alert.alert('Recipient not confirmed', 'We could not confirm an OWODE account for that number. Check it and try again.')
      return
    }
    if (!recipientPhone) {
      Alert.alert('Phone number needed', "Enter the phone number you want to send money to.")
      return
    }
    const phoneDigits = recipientPhone.replace(/\D/g, '')
    if (phoneDigits.length !== 11 && phoneDigits.length !== 10) {
      Alert.alert('Check the number', 'Enter the full phone number, for example 08012345678.')
      return
    }
    if (!amount) {
      Alert.alert('Amount needed', 'Enter how much you want to send.')
      return
    }
    if (Number(amount) < 100) {
      Alert.alert('Error', 'Minimum transfer amount is ₦100')
      return
    }
    if (walletBalance !== null && Number(amount) > walletBalance) {
      Alert.alert('Not enough money', `Your wallet balance is ${naira(walletBalance)}.`)
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
      `Send ₦${Number(amount).toLocaleString()} to ${recipientName || recipientPhone}?`,
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
      // Ask for location at the moment it matters. Never blocks the transfer.
      const location = await getTransactionLocation()

      // Normalise here too, so a 10-digit entry reaches the right account.
      let sendTo = recipientPhone.replace(/\D/g, '')
      if (sendTo.length === 10 && sendTo[0] !== '0') sendTo = '0' + sendTo

      const response = await walletAPI.transfer(
        sendTo,
        Number(amount),
        description.trim() || 'Wallet transfer',
        transactionPin,
        location
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
      <LinearGradient colors={[ds.hero, ds.hero]} style={{ flex: 1 }}>
        <PinKeypad
          title="Transaction PIN"
          subtitle={`Authorizing ₦${Number(amount).toLocaleString()} transfer`}
          pinLength={4}
          requireConfirm={false}
          onComplete={executeTransfer}
        />
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setStep('form')}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cancel transfer</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  // ─── Form — OWODE Alajo Redesign "Send money" board ──────────────────
  const pressKey = (k: string) => {
    Keyboard.dismiss()
    if (k === 'del') { setAmount(prev => prev.slice(0, -1)); return }
    setAmount(prev => {
      if (!prev && (k === '0' || k === '00')) return prev
      const next = prev + k
      return next.length > 9 ? prev : next
    })
  }

  // 08034127781 -> "0803 412 7781", the way people read numbers out
  const spacedPhone = (d: string) =>
    [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(' ')

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del']
  const canPay = !!user?.hasTransactionPin

  if (loading) {
    return (
      <View style={[t.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <OwodeLoader size="large" fullscreen color={ds.navy} />
        <Text style={t.loadingText}>Processing transfer...</Text>
      </View>
    )
  }

  return (
    <View style={t.screen}>
      <View style={[t.header, { paddingTop: insets.top + 18 }]}>
        <TouchableOpacity style={t.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon name="back" size={20} color={ds.ink} width={2} />
        </TouchableOpacity>
        <Text style={t.h1}>Send money</Text>
      </View>

      <View style={t.recipientBlock}>
        <Text style={t.eyebrow}>RECIPIENT'S OWODE PHONE NUMBER</Text>
        <TextInput
          style={[t.input, recipientPhone ? t.inputOn : null]}
          placeholder="08012345678"
          placeholderTextColor="#9aa5b8"
          value={spacedPhone(recipientPhone)}
          onChangeText={v => setRecipientPhone(v.replace(/\D/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          maxLength={13}
        />
        {lookingUp ? (
          <View style={t.chip}>
            <OwodeLoader size="small" color={ds.navy} />
            <Text style={t.chipSub}>Checking account...</Text>
          </View>
        ) : recipientName ? (
          <View style={t.chip}>
            <Icon name="checkCircle" size={20} color={ds.navy} width={2} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={t.chipName} numberOfLines={1}>{recipientName}</Text>
              <Text style={t.chipSub}>Name confirmed by OWODE</Text>
            </View>
          </View>
        ) : lookupError ? (
          <View style={[t.chip, { backgroundColor: ds.dangerSoft }]}>
            <Icon name="alert" size={20} color={ds.danger} width={2} />
            <Text style={[t.chipSub, { color: ds.danger, flex: 1 }]} numberOfLines={2}>{lookupError}</Text>
          </View>
        ) : !recipientPhone && recents.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {recents.map((r: any) => (
              <TouchableOpacity key={r.phone} style={t.recent} onPress={() => setRecipientPhone(r.phone)}>
                <Text style={t.recentText} numberOfLines={1}>{(r.name || r.phone).split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={t.amountBlock}>
        <Text style={t.eyebrow}>AMOUNT</Text>
        <View style={t.amountRow}>
          <Text style={t.amountSym}>₦</Text>
          <Text style={[t.amount, !amount && { color: '#9aa5b8' }]}>{amount ? commas(Number(amount)) : '0'}</Text>
        </View>
        <Text style={t.balance}>
          {walletBalance === null ? ' ' : `Wallet balance ${naira(walletBalance)}`}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      {!kbOpen && (
        <View style={t.pad}>
          {keys.map(k => (
            <TouchableOpacity
              key={k}
              style={t.key}
              onPress={() => pressKey(k)}
              onLongPress={k === 'del' ? () => setAmount('') : undefined}
              activeOpacity={0.6}
              accessibilityLabel={k === 'del' ? 'Delete' : k}
            >
              {k === 'del'
                ? <Icon name="backspace" size={24} color={ds.ink} />
                : <Text style={t.keyText}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom + 12, 28) }}>
        <TouchableOpacity
          style={t.cta}
          onPress={canPay ? handleContinue : () => navigation.navigate('SetTransactionPin')}
          activeOpacity={0.85}
        >
          <Text style={t.ctaText}>{canPay ? 'Continue — enter PIN' : 'Set your transaction PIN first'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const t = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.bg, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 20, lineHeight: 24, color: ds.ink, fontFamily: F.x },
  recipientBlock: { paddingTop: 22, paddingHorizontal: 20, gap: 14 },
  eyebrow: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6 },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: ds.border, paddingHorizontal: 16, fontSize: 17, lineHeight: 21, fontFamily: F.b, color: ds.ink, ...tnum },
  inputOn: { borderColor: ds.navy },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ds.blueSoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
  chipName: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  chipSub: { fontSize: 12, lineHeight: 15, color: ds.inkSoft, fontFamily: F.r },
  recent: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: ds.bg, alignItems: 'center', justifyContent: 'center' },
  recentText: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.b },
  amountBlock: { paddingTop: 30, paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  amountSym: { fontSize: 28, lineHeight: 34, color: ds.muted, fontFamily: F.b },
  amount: { fontSize: 48, lineHeight: 59, color: ds.ink, fontFamily: F.x, letterSpacing: -1, ...tnum },
  balance: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.r, ...tnum },
  pad: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  key: { width: '32%', height: 56, borderRadius: 14, backgroundColor: ds.bg, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 22, lineHeight: 27, color: ds.ink, fontFamily: F.b },
  cta: { height: 54, borderRadius: 16, backgroundColor: ds.navy, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#ffffff', fontSize: 16, lineHeight: 20, fontFamily: F.x },
  loadingText: { color: ds.navy, fontSize: 16, lineHeight: 20, marginTop: 16, fontFamily: F.s },
})
