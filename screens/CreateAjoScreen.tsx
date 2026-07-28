import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Share, KeyboardAvoidingView, Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { userAjoAPI, kycAPI } from '../utils/api'

const MIN_AMOUNT = 10000

export default function CreateAjoScreen({ navigation }: any) {
  const [kyc, setKyc] = useState<{ checked: boolean; ok: boolean }>({ checked: false, ok: false })

  useEffect(() => {
    kycAPI.getStatus()
      .then(res => {
        const d = res.data?.data
        setKyc({ checked: true, ok: !!(d?.hasBVN && d?.hasNIN && d?.isVerified) })
      })
      .catch(() => setKyc({ checked: true, ok: false }))
  }, [])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const [members, setMembers] = useState(6)
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<any>(null)

  const kycDone = kyc.ok

  const create = async () => {
    if (name.trim().length < 3) { Alert.alert('Name your group', 'Give the group a name people will recognise'); return }
    if (Number(amount) < MIN_AMOUNT) {
      Alert.alert('Amount too low', `The minimum contribution is \u20a6${MIN_AMOUNT.toLocaleString()}`)
      return
    }
    try {
      setLoading(true)
      const res = await userAjoAPI.create({
        name: name.trim(), amount: Number(amount), frequency, totalMembers: members
      })
      setCreated(res.data.data)
    } catch (e: any) {
      Alert.alert('Could not create', e.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const shareCode = async () => {
    if (!created) return
    await Share.share({
      message:
        `Join my Ajo group on OWODE\n\n` +
        `Group: ${created.name}\n` +
        `Contribution: \u20a6${Number(created.amount).toLocaleString()} ${String(created.frequency).toLowerCase()}\n` +
        `Members: ${created.totalMembers}\n\n` +
        `Invite code: ${created.inviteCode}\n\n` +
        `Open OWODE, go to Ajo, tap "Join with code" and enter it.`
    })
  }

  if (!kyc.checked) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#25427a" />
      </View>
    )
  }

  if (!kycDone) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#1a2e55', '#25427a']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#f5a623" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Create Ajo</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
        <View style={styles.gate}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#25427a" />
          <Text style={styles.gateTitle}>Verify your identity first</Text>
          <Text style={styles.gateText}>
            You need both your BVN and NIN verified before you can create an Ajo group.
            This protects everyone who joins.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('KYCVerification')}>
            <Text style={styles.btnText}>Verify now</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (created) {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#1a2e55', '#25427a']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#f5a623" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Group created</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={styles.code}>{created.inviteCode}</Text>
            <Text style={styles.codeHint}>
              Share this with the {created.totalMembers - 1} people you want in the group.
              Only people with this code can join.
            </Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={shareCode}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Share invite code</Text>
          </TouchableOpacity>
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>What happens next</Text>
            {[
              'Everyone you invite joins with the code',
              'Once the group is full it goes to OWODE for approval',
              'When approved, collection starts the next day'
            ].map((t, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{t}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#1a2e55', '#25427a']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Create Ajo</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.warnCard}>
          <Ionicons name="information-circle" size={18} color="#d97706" />
          <Text style={styles.warnText}>
            This is a standard Ajo. If a member fails to contribute, OWODE does not cover it.
            Only create groups with people you trust.
          </Text>
        </View>

        <Text style={styles.label}>Group name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Market Women Monthly"
          placeholderTextColor="#9aa5b8"
          value={name}
          onChangeText={setName}
          maxLength={40}
        />

        <Text style={styles.label}>Contribution per member</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.naira}>{'\u20a6'}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="10,000 minimum"
            placeholderTextColor="#9aa5b8"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>
        {amount && Number(amount) < MIN_AMOUNT ? (
          <Text style={styles.err}>Minimum is {'\u20a6'}{MIN_AMOUNT.toLocaleString()}</Text>
        ) : null}

        <Text style={styles.label}>How often</Text>
        <View style={styles.row}>
          {(['WEEKLY', 'MONTHLY'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, frequency === f && styles.chipActive]}
              onPress={() => setFrequency(f)}
            >
              <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
                {f === 'WEEKLY' ? 'Weekly' : 'Monthly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Number of members</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setMembers(m => Math.max(6, m - 1))}
          >
            <Ionicons name="remove" size={20} color="#25427a" />
          </TouchableOpacity>
          <View style={styles.stepValue}>
            <Text style={styles.stepNumber}>{members}</Text>
            <Text style={styles.stepCaption}>members</Text>
          </View>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setMembers(m => Math.min(12, m + 1))}
          >
            <Ionicons name="add" size={20} color="#25427a" />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Between 6 and 12 members, including you.</Text>

        {amount && Number(amount) >= MIN_AMOUNT ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Each member will</Text>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Pay</Text>
              <Text style={styles.sumValue}>
                {'\u20a6'}{Number(amount).toLocaleString()} {frequency === 'WEEKLY' ? 'weekly' : 'monthly'}
              </Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Collect on their turn</Text>
              <Text style={styles.sumValue}>
                {'\u20a6'}{(Number(amount) * members).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.sumRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.sumLabel}>Full cycle</Text>
              <Text style={styles.sumValue}>
                {members} {frequency === 'WEEKLY' ? 'weeks' : 'months'}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.btn} onPress={create} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create group</Text>}
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, minHeight: 56 },
  headerTitle: { flex: 1, flexShrink: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { padding: 20 },
  warnCard: { flexDirection: 'row', gap: 10, backgroundColor: '#fef4e3', borderRadius: 12, padding: 14, marginBottom: 8 },
  warnText: { flex: 1, flexShrink: 1, fontSize: 12.5, lineHeight: 18, color: '#8a5a00' },
  label: { fontSize: 13, fontWeight: '600', color: '#25427a', marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6eaf2', paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#1a2b4a' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6eaf2', paddingHorizontal: 16 },
  naira: { fontSize: 16, fontWeight: '700', color: '#25427a', marginRight: 8 },
  amountInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#1a2b4a' },
  err: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  hint: { fontSize: 12, color: '#7c8aa5', marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6eaf2' },
  chipActive: { backgroundColor: '#25427a', borderColor: '#25427a' },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#25427a' },
  chipTextActive: { color: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6eaf2', padding: 8 },
  stepBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, alignItems: 'center' },
  stepNumber: { fontSize: 22, fontWeight: '700', color: '#1a2b4a' },
  stepCaption: { fontSize: 11, color: '#7c8aa5' },
  summary: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 20 },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#7c8aa5', marginBottom: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f0f2f7' },
  sumLabel: { fontSize: 13, color: '#7c8aa5', flexShrink: 1 },
  sumValue: { fontSize: 13.5, fontWeight: '700', color: '#1a2b4a', flexShrink: 1 },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: '#25427a', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 24, minHeight: 50 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  ghostText: { color: '#7c8aa5', fontSize: 14, fontWeight: '600' },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  gateTitle: { fontSize: 17, fontWeight: '700', color: '#1a2b4a', marginTop: 16, marginBottom: 8 },
  gateText: { fontSize: 13.5, lineHeight: 20, color: '#7c8aa5', textAlign: 'center' },
  codeCard: { backgroundColor: '#25427a', borderRadius: 16, padding: 22, alignItems: 'center' },
  codeLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  code: { fontSize: 34, fontWeight: '700', color: '#fff', marginVertical: 8 },
  codeHint: { fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  stepsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 20 },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: '#1a2b4a', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#25427a' },
  stepText: { flex: 1, flexShrink: 1, fontSize: 13.5, lineHeight: 19, color: '#1a2b4a' }
})
