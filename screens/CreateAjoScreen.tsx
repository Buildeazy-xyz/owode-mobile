import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Share, KeyboardAvoidingView, Platform, Clipboard
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { TopBar, Card, List, Row, Tile, Field, Btn, Eyebrow, Section, Note, ui } from '../components/ui'
import { F, ds, tnum } from '../constants/theme'
import { naira } from '../utils/ajoDue'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { userAjoAPI, kycAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'

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
  const [copied, setCopied] = useState(false)
  const insets = useSafeAreaInsets()

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
        'https://owodeagent.com/join/' + created.inviteCode + '\n\n' +
        'Join my Ajo group "' + created.name + '" on OWODE Alajo.\n' +
        '\u20a6' + Number(created.amount).toLocaleString() + ' ' + String(created.frequency).toLowerCase() +
        ' \u00b7 ' + created.totalMembers + ' members'
    })
  }

  // OWODE Alajo Redesign "Create Ajọ group" + "Group created" boards
  const back = () => navigation.goBack()
  if (!kyc.checked) {
    return <View style={ui.screen}><OwodeLoader size="large" fullscreen color={ds.navy} /></View>
  }

  if (!kycDone) {
    return (
      <View style={ui.screen}>
        <TopBar title="Create Ajọ group" onBack={back} />
        <View style={[ui.body, { alignItems: 'center', paddingTop: 48, gap: 14 }]}>
          <Tile icon="shieldCheck" size={64} />
          <Text style={[ui.h2, { textAlign: 'center' }]}>Verify your identity first</Text>
          <Text style={[ui.lead, { textAlign: 'center' }]}>
            You need both your BVN and NIN verified before you can create an Ajọ group. This protects everyone who joins.
          </Text>
          <Btn title="Verify now" icon="shieldCheck" onPress={() => navigation.navigate('KYCVerification')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      </View>
    )
  }

  if (created) {
    return (
      <View style={ui.screen}>
        <ScrollView contentContainerStyle={[ui.body, { paddingTop: insets.top + 32, gap: 16 }]}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={ca.done}><Icon name="check" size={34} color={ds.navy} width={2.6} /></View>
            <Text style={ui.h2}>Group created</Text>
            <Text style={[ui.lead, { textAlign: 'center', color: ds.muted }]}>
              Share the code with the {created.totalMembers - 1} people you trust. Only people with this code can join.
            </Text>
          </View>
          <View style={ca.codeCard}>
            <Eyebrow color={ds.onHero}>INVITE CODE</Eyebrow>
            <Text style={ca.code}>{created.inviteCode}</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Btn title={copied ? 'Copied' : 'Copy'} icon={copied ? 'check' : 'copy'} small style={{ flex: 1 }}
                onPress={() => { Clipboard.setString(created.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }} />
              <Btn title="Share" icon="share" kind="heroline" small style={{ flex: 1 }} onPress={shareCode} />
            </View>
          </View>
          <Section>What happens next</Section>
          <List>
            <Row icon="share" title="Everyone you invite joins with the code" />
            <Row icon="checkCircle" title="Once the group is full, OWODE approves it" />
            <Row icon="calendar" title="Collection starts the day after approval" />
          </List>
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 28) }}>
          <Btn title="Done" kind="navy" onPress={back} />
        </View>
      </View>
    )
  }

  const amt = Number(amount) || 0
  const tooLow = !!amount && amt < MIN_AMOUNT
  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="Create Ajọ group" onBack={back} />
      <ScrollView contentContainerStyle={[ui.body, { gap: 16 }]} keyboardShouldPersistTaps="handled">
        <Field label="Group name" placeholder="e.g. Market Women Monthly" value={name} onChangeText={setName} maxLength={40} />
        <View style={{ gap: 6 }}>
          <Field label="Amount per member" prefix="₦" placeholder="10,000 minimum" value={amount}
            onChangeText={t => setAmount(t.replace(/\D/g, ''))} keyboardType="numeric" />
          {tooLow ? <Text style={ca.err}>Minimum is {naira(MIN_AMOUNT)}</Text> : null}
        </View>
        <View style={{ gap: 8 }}>
          <Eyebrow>HOW OFTEN</Eyebrow>
          <View style={ca.seg}>
            {(['WEEKLY', 'MONTHLY'] as const).map(f => (
              <TouchableOpacity key={f} style={[ca.segItem, frequency === f && ca.segOn]} onPress={() => setFrequency(f)}>
                <Text style={[ca.segText, frequency === f && ca.segTextOn]}>{f === 'WEEKLY' ? 'Weekly' : 'Monthly'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Eyebrow>NUMBER OF MEMBERS</Eyebrow>
          <View style={ca.stepper}>
            <TouchableOpacity style={ca.stepBtn} onPress={() => setMembers(m => Math.max(6, m - 1))} accessibilityLabel="Fewer members">
              <Text style={ca.stepSign}>−</Text>
            </TouchableOpacity>
            <Text style={ca.stepValue}>{members} members</Text>
            <TouchableOpacity style={ca.stepBtn} onPress={() => setMembers(m => Math.min(12, m + 1))} accessibilityLabel="More members">
              <Text style={ca.stepSign}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={ui.muted}>Between 6 and 12, including you</Text>
        </View>
        {amt >= MIN_AMOUNT ? (
          <Card tone="gold" style={{ gap: 10 }}>
            <Eyebrow color={ds.goldInk}>EACH MEMBER WILL</Eyebrow>
            {[
              ['Pay', `${naira(amt)} ${frequency === 'WEEKLY' ? 'weekly' : 'monthly'}`],
              ['Collect on their turn', naira(amt * members)],
              ['Full cycle', `${members} ${frequency === 'WEEKLY' ? 'weeks' : 'months'}`],
            ].map(([k, v]) => (
              <View key={k} style={ui.rowBetween}>
                <Text style={ca.sumKey}>{k}</Text>
                <Text style={ca.sumVal}>{v}</Text>
              </View>
            ))}
          </Card>
        ) : null}
        <Note icon="alert">This is a standard Ajọ. If a member fails to pay, OWODE does not cover it. Only create groups with people you trust.</Note>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 28) }}>
        <Btn title="Create group" onPress={create} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  )
}

const ca = StyleSheet.create({
  done: { width: 72, height: 72, borderRadius: 36, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  codeCard: { backgroundColor: ds.hero, borderRadius: 22, padding: 22, alignItems: 'center', gap: 14 },
  code: { fontSize: 40, lineHeight: 48, color: '#ffffff', fontFamily: F.x, letterSpacing: 8 },
  err: { fontSize: 12, lineHeight: 15, color: ds.danger, fontFamily: F.b },
  seg: { flexDirection: 'row', backgroundColor: ds.divider, borderRadius: 14, padding: 4, gap: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#ffffff' },
  segText: { fontSize: 14, lineHeight: 17, color: ds.muted, fontFamily: F.s },
  segTextOn: { color: ds.hero, fontFamily: F.x },
  stepper: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: ds.border, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: ds.bg, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 22, lineHeight: 26, color: ds.ink, fontFamily: F.b },
  stepValue: { fontSize: 17, lineHeight: 21, color: ds.ink, fontFamily: F.x },
  sumKey: { fontSize: 14, lineHeight: 17, color: ds.goldInk2, fontFamily: F.r },
  sumVal: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x, ...tnum },
})

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
