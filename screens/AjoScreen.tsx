import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl,
  TextInput, Share, Modal, Keyboard, Dimensions, Platform, BackHandler
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { F, ds, tnum } from '../constants/theme'
import {
  ajoMembers, ajoSize, ajoCurrentPosition, ajoPayout, ajoDueAmount, ajoIsFull,
  ajoDueWord, shortName, naira,
} from '../utils/ajoDue'
import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import BottomNav from '../components/BottomNav'
import { LinearGradient } from 'expo-linear-gradient'
import { userAjoAPI, ajoAPI, guaranteedAjoAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { announceAjoPayout, announceContribution } from '../utils/speech'
import PinKeypad from '../components/PinKeypad'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import OwodeLoader from '../components/OwodeLoader'

const SCREEN_H = Dimensions.get('window').height

export default function AjoScreen({ navigation, route }: any) {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  // Opened from Home's "Pay contribution", or by tapping one of your groups.
  const [focus, setFocus] = useState<null | { id: string; kind: 'standard' | 'guaranteed'; fromParam: boolean }>(
    route?.params?.groupId
      ? { id: route.params.groupId, kind: route.params.groupType === 'guaranteed' ? 'guaranteed' : 'standard', fromParam: true }
      : null
  )
  useEffect(() => {
    if (route?.params?.groupId) {
      setFocus({ id: route.params.groupId, kind: route.params.groupType === 'guaranteed' ? 'guaranteed' : 'standard', fromParam: true })
    }
    if (route?.params?.tab) setActiveTab(route.params.tab)
  }, [route?.params?.groupId, route?.params?.tab])
  const [standardGroups, setStandardGroups] = useState<any[]>([])
  const [guaranteedGroups, setGuaranteedGroups] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showJoinCode, setShowJoinCode] = useState(false)
  const [kbHeight, setKbHeight] = useState(0)
  const [joinCode, setJoinCode] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [joining, setJoining] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'standard' | 'guaranteed'>(route?.params?.tab || 'all')
  const [contributeModal, setContributeModal] = useState(false)
  const [pinStep, setPinStep] = useState(false)
  const [contributeMode, setContributeMode] = useState<'standard' | 'guaranteed'>('guaranteed')
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [contributing, setContributing] = useState(false)

  const loadGroups = async () => {
    try {
      // Standard ajo is invite-only - only show groups you are actually in.
      const [standardRes, guaranteedRes] = await Promise.all([
        userAjoAPI.mine(),
        guaranteedAjoAPI.getAllGroups()
      ])
      setStandardGroups(standardRes.data.data || [])
      setGuaranteedGroups(guaranteedRes.data.data || [])
    } catch (error) {
      Alert.alert('Error', 'Could not load Ajo groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGroups() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadGroups()
    setRefreshing(false)
  }

  const allGroups = [
    ...standardGroups.map(g => ({ ...g, type: 'standard' })),
    ...guaranteedGroups.map(g => ({ ...g, type: 'guaranteed' }))
  ]

  const filteredGroups = allGroups
    .filter(g => {
      if (activeTab === 'standard') return g.type === 'standard'
      if (activeTab === 'guaranteed') return g.type === 'guaranteed'
      return true
    })
    .filter(g =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.frequency.toLowerCase().includes(search.toLowerCase())
    )

  const handleJoinStandard = async (groupId: string) => {
    try {
      const response = await ajoAPI.joinGroup(groupId)
      Alert.alert('Joined!', response.data.message)
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  const handleJoinGuaranteed = async (groupId: string) => {
    try {
      await guaranteedAjoAPI.joinGroup(groupId)
      Alert.alert('Joined!', 'You joined the Guaranteed Ajo group!')
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  // Someone tapped an invite link: owodeagent.com/join/ABC123 or owode://join/ABC123
  const handleDeepLink = (url: string | null) => {
    if (!url) return
    const m = url.match(/\/join\/([A-Za-z0-9]{6})/)
    if (!m) return
    const code = m[1].toUpperCase()
    setJoinCode(code)
    setShowJoinCode(true)
    userAjoAPI.preview(code)
      .then(res => setPreview(res.data.data))
      .catch(() => Alert.alert('Not found', 'That invite link is no longer valid'))
  }

  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink)
    const sub = Linking.addEventListener('url', e => handleDeepLink(e.url))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0))
    return () => { show.remove(); hide.remove() }
  }, [])

  const lookupCode = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { Alert.alert('Check the code', 'Invite codes are 6 characters'); return }
    try {
      setJoining(true)
      const res = await userAjoAPI.preview(code)
      setPreview(res.data.data)
    } catch (e: any) {
      Alert.alert('Not found', e.response?.data?.message || 'No group found with that code')
      setPreview(null)
    } finally { setJoining(false) }
  }

  const confirmJoin = async () => {
    try {
      setJoining(true)
      await userAjoAPI.join(joinCode.trim().toUpperCase())
      setShowJoinCode(false); setJoinCode(''); setPreview(null)
      Alert.alert(
        'Request sent',
        'The person who created this group will review your request. You will be notified once they respond.'
      )
      loadGroups()
    } catch (e: any) {
      Alert.alert('Could not join', e.response?.data?.message || 'Something went wrong')
    } finally { setJoining(false) }
  }

  const handleContributeStandard = async (groupId: string, groupName: string, amount: number) => {
    if (!user?.hasTransactionPin) {
      Alert.alert(
        'Set your PIN first',
        'You need a 4-digit transaction PIN before you can do this.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => navigation.navigate('SetTransactionPin') }
        ]
      )
      return
    }
    Alert.alert(
      'Confirm Contribution',
      `Contribute ₦${amount.toLocaleString()} to "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue', onPress: () => {
            setSelectedGroup({ id: groupId, name: groupName, amount })
            setContributeMode('standard')
            setContributeModal(true)
            setPinStep(true)
          }
        }
      ]
    )
  }

  const executeStandardContribution = async (pin: string) => {
    try {
      setContributing(true)
      const response = await ajoAPI.contribute(selectedGroup.id, pin)
      const data = response.data.data
      setContributeModal(false)
      setPinStep(false)
      if (data.payoutSent) {
        announceAjoPayout(data.payoutAmount, selectedGroup.name)
        Alert.alert('Payout!', `₦${data.payoutAmount?.toLocaleString()} paid out this cycle!`)
      } else {
        announceContribution(selectedGroup.amount, selectedGroup.name)
        Alert.alert('Contributed!', `${data.paidCount} of ${data.paidCount + data.remainingCount} members paid`)
      }
      await loadGroups()
    } catch (error: any) {
      setPinStep(false)
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setContributing(false)
    }
  }

  const handleContributeGuaranteed = async (group: any) => {
    if (!user?.hasTransactionPin) {
      Alert.alert(
        'Set your PIN first',
        'You need a 4-digit transaction PIN before you can do this.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => navigation.navigate('SetTransactionPin') }
        ]
      )
      return
    }
    setSelectedGroup(group)
    const bioEnabled = await isBiometricEnabled()
    if (bioEnabled) {
      const bioInfo = await getBiometricType()
      Alert.alert(
        'Authorize Contribution',
        `Contribute ₦${(group.amount + group.guaranteeFee)?.toLocaleString()} to "${group.name}"?`,
        [
          {
            text: `${bioInfo.icon} ${bioInfo.label}`,
            onPress: async () => {
              const success = await authenticateWithBiometrics('Authorize Ajo contribution')
              if (success) await executeGuaranteedContribution('BIOMETRIC_AUTH')
            }
          },
          { text: 'Use PIN', onPress: () => setContributeModal(true) },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
    } else {
      setContributeModal(true)
    }
  }

  const executeGuaranteedContribution = async (pin: string) => {
    try {
      setContributing(true)
      const response = await guaranteedAjoAPI.contribute(selectedGroup.id, pin)
      const data = response.data.data
      setContributeModal(false)
      setPinStep(false)
      if (data.payoutSent) {
        Alert.alert('Payout Sent!', `₦${data.payoutAmount?.toLocaleString()} paid out!`)
      } else {
        Alert.alert('Contributed!', `${data.paidCount} of ${data.paidCount + data.remainingCount} members paid.`)
      }
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
      setPinStep(false)
    } finally {
      setContributing(false)
    }
  }

  const handleShare = async (group: any) => {
    try {
      const spotsLeft = group.totalMembers - (group.members?.length || 0)
      const isGuaranteed = group.type === 'guaranteed'
      await Share.share({
        message:
          `${isGuaranteed ? '' : ''} Join my ${isGuaranteed ? 'Guaranteed ' : ''}Ajo group on OWODE!\n\n` +
          `Group: ${group.name}\n` +
          `Amount: ₦${group.amount?.toLocaleString()} per cycle\n` +
          (isGuaranteed ? `Guarantee fee: ₦${group.guaranteeFee?.toLocaleString()}\n` : '') +
          `Frequency: ${group.frequency}\n` +
          `Spots left: ${spotsLeft}\n\n` +
          (isGuaranteed ? `✅ Payout is 100% GUARANTEED by OWODE Avatar AI!\n\n` : '') +
          `Download OWODE Alajo and search for "${group.name}" to join!\n\n` +
          `Download: https://play.google.com/store/apps/details?id=com.owode.alajo.app`,
        title: 'Join my OWODE Ajo Group!'
      })
    } catch (error) {
      console.log('Share error:', error)
    }
  }

  const isMyGroup = (group: any) => group.members?.some((m: any) => m.userId === user?.id)
  const myMember = (group: any) => group.members?.find((m: any) => m.userId === user?.id)

  // ─── Group view — OWODE Alajo Redesign "Ajọ group" board ───────────────
  const focusGroup = focus
    ? (focus.kind === 'guaranteed' ? guaranteedGroups : standardGroups).find(g => g.id === focus.id)
    : null

  const closeFocus = () => {
    if (focus?.fromParam && navigation.canGoBack()) navigation.goBack()
    else setFocus(null)
  }

  useEffect(() => {
    if (!focus || focus.fromParam) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setFocus(null); return true })
    return () => sub.remove()
  }, [focus])

  const renderGroupView = (group: any, kind: 'standard' | 'guaranteed') => {
    const members = ajoMembers(group)
    const n = ajoSize(group, kind)
    const cur = ajoCurrentPosition(group, kind)
    const paid = members.filter((m: any) => m.hasPaid).length
    const me = members.find((m: any) => m.userId === user?.id)
    const full = ajoIsFull(group, kind)
    const recipient = members.find((m: any) => m.position === cur)
    const frac = n > 0 ? Math.min(1, paid / n) : 0
    const R = 42.5, C = 2 * Math.PI * R
    const word = ajoDueWord(group.frequency)

    const payNow = () => {
      if (kind === 'standard') handleContributeStandard(group.id, group.name, group.amount)
      else { setContributeMode('guaranteed'); handleContributeGuaranteed({ ...group, type: 'guaranteed' }) }
    }

    const status = !me ? 'none' : me.hasPaid ? 'paid' : !full ? 'waiting' : 'due'

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[g.hero, { paddingTop: insets.top + 18 }]}>
          <View style={g.heroTop}>
            <TouchableOpacity style={g.backBtn} onPress={closeFocus} accessibilityLabel="Back">
              <Icon name="back" size={20} color="#ffffff" width={2} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={g.groupName} numberOfLines={1}>{group.name}</Text>
              <Text style={g.groupMeta} numberOfLines={1}>
                {naira(group.amount)} {String(group.frequency || '').toLowerCase()} · {n} members{kind === 'guaranteed' ? ' · Guaranteed' : ''}
              </Text>
            </View>
          </View>
          <View style={g.heroBody}>
            <View style={g.ring} accessibilityLabel={`${paid} of ${n} members have paid this cycle`}>
              <Svg width={96} height={96}>
                <Circle cx={48} cy={48} r={R} stroke={ds.heroLine} strokeWidth={11} fill="none" />
                {frac > 0 && (
                  <Circle
                    cx={48} cy={48} r={R} stroke={ds.gold} strokeWidth={11} fill="none"
                    strokeDasharray={`${C * frac} ${C}`} rotation={-90} origin="48, 48"
                  />
                )}
              </Svg>
              <View style={g.ringCenter}>
                <Text style={g.ringNum}>{paid}/{n}</Text>
                <Text style={g.ringLabel}>paid</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={g.payoutLabel}>Cycle {cur} payout</Text>
              <Text style={g.payoutAmount}>{naira(ajoPayout(group, kind))}</Text>
              <Text style={g.payoutTo}>
                {!full ? 'starts when the group is full'
                  : recipient?.userId === user?.id ? 'comes to you when everyone pays'
                  : `goes to ${shortName(recipient?.user?.fullName)} when everyone pays`}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20, gap: 14 }}>
          <View style={g.contrib}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={g.eyebrow}>YOUR CONTRIBUTION</Text>
              <Text style={g.contribValue} numberOfLines={1} adjustsFontSizeToFit>
                {status === 'paid' ? 'Paid this cycle'
                  : status === 'waiting' ? 'Waiting for members'
                  : status === 'none' ? 'Not a member'
                  : `${naira(ajoDueAmount(group, kind))} due ${word}`}
              </Text>
            </View>
            {status === 'due' ? (
              <TouchableOpacity style={g.payBtn} onPress={payNow} activeOpacity={0.85} disabled={contributing}>
                <Text style={g.payText}>Pay now</Text>
              </TouchableOpacity>
            ) : status === 'paid' ? (
              <Icon name="checkCircle" size={26} color={ds.navy} width={2} />
            ) : null}
          </View>

          {kind === 'guaranteed' && (
            <View style={g.cover}>
              <Icon name="shieldCheck" size={20} color={ds.goldInk} width={2} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={g.coverTitle}>OWODE covers missed payments</Text>
                <Text style={g.coverText}>Includes {naira(group.guaranteeFee || 0)} guarantee fee. If anyone misses a payment, the payout still goes out in full.</Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={g.section}>Payout order</Text>
            {kind === 'guaranteed' ? (
              <TouchableOpacity onPress={() => navigation.navigate('GroupHistory', { groupId: group.id })}>
                <Text style={{ fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b }}>History</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={g.list}>
            {members.map((m: any, i: number) => {
              const mine = m.userId === user?.id
              const isCur = m.position === cur && full
              const done = full && m.position < cur
              const label = isCur ? 'This cycle'
                : done ? 'Collected'
                : m.position === cur + 1 ? 'Next'
                : mine ? `In ${m.position - cur} cycles`
                : 'Later'
              const dot = isCur ? { bg: ds.gold, fg: ds.hero }
                : mine ? { bg: ds.navy, fg: '#ffffff' }
                : done ? { bg: ds.divider, fg: ds.muted }
                : { bg: ds.blueSoft, fg: ds.navy }
              return (
                <View
                  key={m.id}
                  style={[g.row, i < members.length - 1 && g.rowLine, isCur && { backgroundColor: ds.goldWash }]}
                >
                  <View style={[g.dot, { backgroundColor: dot.bg }]}>
                    <Text style={[g.dotText, { color: dot.fg }]}>{m.position}</Text>
                  </View>
                  <Text style={[g.name, (mine || isCur) && { fontFamily: F.b }]} numberOfLines={1}>
                    {mine ? 'You' : shortName(m.user?.fullName)}
                  </Text>
                  <Text style={[g.state, isCur && { color: ds.goldInk2, fontFamily: F.b }]}>{label}</Text>
                </View>
              )
            })}
            {members.length < n && Array.from({ length: n - members.length }).map((_, i) => (
              <View key={`open-${i}`} style={[g.row, g.rowLine]}>
                <View style={[g.dot, { backgroundColor: ds.divider }]}>
                  <Text style={[g.dotText, { color: ds.muted }]}>{members.length + i + 1}</Text>
                </View>
                <Text style={[g.name, { color: ds.muted }]}>Open seat</Text>
                <Text style={g.state}>Waiting</Text>
              </View>
            ))}
          </View>

          {!full && (
            <TouchableOpacity style={g.shareRow} onPress={() => handleShare({ ...group, type: kind })} activeOpacity={0.8}>
              <Icon name="share" size={18} color={ds.navy} width={2} />
              <Text style={g.shareText}>Invite people to fill open seats</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    )
  }

  const modals = (
    <>
      {/* Guaranteed Contribute Modal */}
      <Modal visible={contributeModal} animationType="slide" transparent>
        {pinStep ? (
          <LinearGradient colors={['#14244a', '#14244a']} style={styles.pinContainer}>
            {contributing ? (
              <OwodeLoader size="large" fullscreen color="#f5a623" />
            ) : (
              <>
                <PinKeypad
                  title="Transaction PIN"
                  subtitle="Enter your 4-digit PIN to confirm"
                  pinLength={4}
                  requireConfirm={false}
                  onComplete={contributeMode === 'standard' ? executeStandardContribution : executeGuaranteedContribution}
                />
                <TouchableOpacity onPress={() => { setPinStep(false); setContributeModal(false) }}>
                  <Text style={styles.cancelPinText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        ) : (
          <View style={C.backdrop}>
            <View style={[C.sheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
              <View style={C.grab} />
              <Text style={C.title}>Confirm contribution</Text>
              {selectedGroup && (
                <>
                  <View>
                    {[
                      ['Group', selectedGroup.name],
                      ['Contribution', naira(selectedGroup.amount || 0)],
                      ['Guarantee fee', naira(selectedGroup.guaranteeFee || 0)],
                    ].map(([k, v], i) => (
                      <View key={k} style={[C.row, i < 2 && C.rowLine]}>
                        <Text style={C.key}>{k}</Text>
                        <Text style={C.val} numberOfLines={1}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={C.totalRow}>
                    <Text style={C.totalKey}>Total</Text>
                    <Text style={C.total}>{naira((selectedGroup.amount || 0) + (selectedGroup.guaranteeFee || 0))}</Text>
                  </View>
                  <View style={C.note}>
                    <Icon name="shieldCheck" size={20} color={ds.goldInk} width={2} />
                    <Text style={C.noteText}>Your payout is protected. If a member misses a payment, OWODE covers it.</Text>
                  </View>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[C.btn, C.btnOutline]} onPress={() => setContributeModal(false)}>
                  <Text style={C.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[C.btn, C.btnGold]} onPress={() => setPinStep(true)} activeOpacity={0.85}>
                  <Text style={C.btnGoldText}>Continue to PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
      <Modal
        visible={showJoinCode}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowJoinCode(false); setPreview(null) }}
      >
        <View style={C.backdrop}>
          <View style={[C.sheet, { maxHeight: SCREEN_H - kbHeight - 40, paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
            <View style={C.grab} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={C.title}>Join a group</Text>
              <TouchableOpacity onPress={() => { setShowJoinCode(false); setJoinCode(''); setPreview(null) }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close">
                <Icon name="close" size={20} color={ds.muted} width={2} />
              </TouchableOpacity>
            </View>

            {!preview ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
                <Text style={J.lead}>Ask the group creator for the 6-character code.</Text>
                <TextInput
                  style={J.code}
                  placeholder="K7Q2MX"
                  placeholderTextColor="#c3cbda"
                  value={joinCode}
                  onChangeText={t => setJoinCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  autoFocus
                />
                <View style={J.note}>
                  <Icon name="info" size={18} color={ds.muted} width={2} />
                  <Text style={J.noteText}>Standard Ajọ: if a member fails to pay, OWODE does not cover it. Only join groups with people you trust.</Text>
                </View>
                <TouchableOpacity style={[C.btn, C.btnGold, { flex: 0 }, joinCode.length < 6 && { opacity: 0.45 }]}
                  onPress={lookupCode} disabled={joining || joinCode.length < 6} activeOpacity={0.85}>
                  {joining ? <OwodeLoader color={ds.hero} size="small" /> : <Text style={C.btnGoldText}>Find group</Text>}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={J.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Text style={J.name} numberOfLines={2}>{preview.name}</Text>
                    <Text style={J.pill}>Standard</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      ['PAY', naira(Number(preview.amount))],
                      ['HOW OFTEN', String(preview.frequency || '').charAt(0) + String(preview.frequency || '').slice(1).toLowerCase()],
                      ['PAYOUT', naira(Number(preview.amount) * preview.totalMembers)],
                    ].map(([k, v]) => (
                      <View key={k} style={J.stat}>
                        <Text style={J.statKey}>{k}</Text>
                        <Text style={J.statVal} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={J.seats}>{preview.joined} of {preview.totalMembers} seats filled</Text>
                    <Text style={[J.seats, { color: ds.navy, fontFamily: F.b }]}>{Math.max(0, preview.totalMembers - preview.joined)} left</Text>
                  </View>
                  <View style={J.track}><View style={[J.fill, { width: `${Math.round(Math.min(1, preview.joined / Math.max(1, preview.totalMembers)) * 100)}%` }]} /></View>
                  {preview.memberNames?.length ? (
                    <Text style={J.members} numberOfLines={2}>Already in: {preview.memberNames.join(', ')}</Text>
                  ) : null}
                </View>
                <View style={J.note}>
                  <Icon name="info" size={18} color={ds.muted} width={2} />
                  <Text style={J.noteText}>The creator approves your request. You start paying when every seat is filled.</Text>
                </View>
                {preview.alreadyIn ? (
                  <View style={[C.btn, { backgroundColor: ds.divider }]}><Text style={[C.btnGoldText, { color: ds.muted }]}>Request already sent</Text></View>
                ) : (
                  <TouchableOpacity style={[C.btn, C.btnGold, { flex: 0 }]} onPress={confirmJoin} disabled={joining} activeOpacity={0.85}>
                    {joining ? <OwodeLoader color={ds.hero} size="small" /> : <Text style={C.btnGoldText}>Request to join</Text>}
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setPreview(null)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b }}>Use a different code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </>
  )

  if (focus && loading) {
    return (
      <View style={[styles.container, { backgroundColor: ds.bg }]}>
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      </View>
    )
  }

  if (focus && focusGroup) {
    return (
      <View style={styles.container}>
        {renderGroupView(focusGroup, focus.kind)}
        {modals}
        <BottomNav navigation={navigation} active="ajo" />
      </View>
    )
  }

  // ─── OWODE Alajo Redesign "Ajọ groups" board ─────────────────────────
  const renderCard = (group: any) => {
    const kind: 'standard' | 'guaranteed' = group.type === 'guaranteed' ? 'guaranteed' : 'standard'
    const isMember = isMyGroup(group)
    const member = myMember(group)
    const members = ajoMembers(group)
    const n = ajoSize(group, kind)
    const full = ajoIsFull(group, kind)
    const paid = members.filter((m: any) => m.hasPaid).length
    const cur = ajoCurrentPosition(group, kind)
    const freq = String(group.frequency || '').toLowerCase()
    const meta = full
      ? `${naira(group.amount)} ${freq} · cycle ${cur} of ${n}`
      : `${naira(group.amount)} ${freq} · ${members.length} of ${n} seats filled`
    const fill = full ? paid / n : members.length / n
    const pending = kind === 'standard' ? (group.members || []).filter((m: any) => m.status === 'PENDING').length : 0
    const canManage = kind === 'standard' && group.createdBy === user?.id && group.approvalStatus !== 'APPROVED'

    let status = ''
    let action: React.ReactNode = null
    if (!isMember) {
      status = full ? 'Group is full' : `${n - members.length} seat${n - members.length === 1 ? '' : 's'} left`
      action = full ? <Text style={[L.pill, { backgroundColor: ds.divider, color: ds.muted }]}>Full</Text> : (
        <TouchableOpacity style={L.navyBtn} activeOpacity={0.85}
          onPress={() => kind === 'guaranteed' ? handleJoinGuaranteed(group.id) : handleJoinStandard(group.id)}>
          <Text style={L.navyBtnText}>Join</Text>
        </TouchableOpacity>
      )
    } else if (!full) {
      status = 'starts when full'
      action = <Text style={[L.pill, { backgroundColor: ds.divider, color: ds.muted }]}>Waiting</Text>
    } else if (member?.hasPaid) {
      status = `${paid} of ${n} paid · you have paid`
      action = <Text style={[L.pill, { backgroundColor: ds.blueSoft, color: ds.navy }]}>Paid</Text>
    } else {
      status = `${paid} of ${n} paid · you owe ${ajoDueWord(group.frequency)}`
      action = (
        <TouchableOpacity style={L.goldBtn} activeOpacity={0.85}
          onPress={() => kind === 'standard'
            ? handleContributeStandard(group.id, group.name, group.amount)
            : (setContributeMode('guaranteed'), handleContributeGuaranteed(group))}>
          <Text style={L.goldBtnText}>Pay</Text>
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity
        key={`${kind}-${group.id}`}
        style={L.card}
        activeOpacity={isMember ? 0.85 : 1}
        onPress={() => isMember && setFocus({ id: group.id, kind, fromParam: false })}
      >
        <View style={[L.rowBetween, { alignItems: 'flex-start', gap: 10 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={L.name} numberOfLines={1}>{group.name}</Text>
            <Text style={L.meta} numberOfLines={1}>{meta}</Text>
          </View>
          <Text style={[L.pill, kind === 'guaranteed'
            ? { backgroundColor: ds.goldSoft, color: ds.goldInk }
            : { backgroundColor: ds.blueSoft, color: ds.navy }]}>
            {kind === 'guaranteed' ? 'Guaranteed' : 'Standard'}
          </Text>
        </View>
        <View style={L.track}><View style={[L.fill, { width: `${Math.round(Math.min(1, fill) * 100)}%` }]} /></View>
        <View style={L.rowBetween}>
          <Text style={L.status} numberOfLines={1}>{status}</Text>
          {action}
        </View>
        {canManage && (
          <TouchableOpacity style={L.manage} activeOpacity={0.8}
            onPress={() => navigation.navigate('ManageAjo', {
              groupId: group.id, groupName: group.name, inviteCode: group.inviteCode,
              amount: group.amount, frequency: group.frequency,
            })}>
            <Icon name="gear" size={16} color={ds.navy} />
            <Text style={L.manageText} numberOfLines={1}>{pending ? `Manage group · ${pending} waiting` : 'Manage group'}</Text>
            <Icon name="chevron" size={16} color="#9aa5b8" width={2} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: ds.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 110, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.navy} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[L.rowBetween, { marginBottom: 6 }]}>
          <Text style={L.h1}>Ajọ groups</Text>
          <TouchableOpacity style={L.create} onPress={() => navigation.navigate('CreateAjo')} activeOpacity={0.85}>
            <Icon name="plus" size={16} color="#ffffff" width={2.4} />
            <Text style={L.createText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={L.seg}>
          {([['all', 'All'], ['standard', 'Standard'], ['guaranteed', 'Guaranteed']] as const).map(([k, label]) => {
            const on = activeTab === k
            return (
              <TouchableOpacity key={k} style={[L.segItem, on && L.segOn]} onPress={() => setActiveTab(k)}>
                <Text style={[L.segText, on && L.segTextOn]} numberOfLines={1}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={L.search}>
          <Icon name="search" size={18} color={ds.muted} />
          <TextInput style={L.searchInput} placeholder="Search groups" placeholderTextColor="#9aa5b8"
            value={search} onChangeText={setSearch} />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={16} color={ds.muted} width={2} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={L.invite} onPress={() => setShowJoinCode(true)} activeOpacity={0.8}>
          <View style={L.tile}><Icon name="key" size={18} color={ds.navy} width={2} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={L.inviteTitle}>Have an invite code?</Text>
            <Text style={L.meta}>Join a group with the 6-character code</Text>
          </View>
          <Icon name="chevron" size={18} color="#9aa5b8" width={2} />
        </TouchableOpacity>

        {activeTab === 'guaranteed' && (
          <View style={L.cover}>
            <Icon name="shieldCheck" size={20} color={ds.goldInk} width={2} />
            <Text style={L.coverText}>In Guaranteed Ajọ, OWODE covers missed payments so every payout goes out in full.</Text>
          </View>
        )}

        {loading ? (
          <OwodeLoader size="large" color={ds.navy} label="Loading your groups…" />
        ) : filteredGroups.length === 0 ? (
          <View style={L.empty}>
            <Text style={L.name}>{search ? `No groups match "${search}"` : 'No Ajọ groups yet'}</Text>
            <Text style={[L.meta, { textAlign: 'center' }]}>{search ? 'Try a different name' : 'Create one or join with an invite code'}</Text>
          </View>
        ) : (
          [...filteredGroups]
            .sort((a, b) => Number(isMyGroup(b)) - Number(isMyGroup(a)))
            .map(renderCard)
        )}
      </ScrollView>

      {modals}

      <BottomNav navigation={navigation} active="ajo" />
    </View>
  )
}

const styles = StyleSheet.create({
  jcBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  jcSheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' },
  jcHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f2f7' },
  jcTitle: { flex: 1, flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#1a2b4a' },
  jcLabel: { fontSize: 13, fontWeight: '600', color: '#25427a', marginBottom: 10 },
  jcInput: { backgroundColor: '#f4f6fb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e6eaf2', paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: '#1a2b4a', textAlign: 'center' },
  jcWarn: { flexDirection: 'row', gap: 9, backgroundColor: '#fef4e3', borderRadius: 12, padding: 12, marginTop: 16 },
  jcWarnText: { flex: 1, flexShrink: 1, fontSize: 12, lineHeight: 17, color: '#8a5a00' },
  jcBtn: { backgroundColor: '#25427a', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18, minHeight: 50 },
  jcBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  jcGroupName: { fontSize: 18, fontWeight: '700', color: '#1a2b4a', marginBottom: 14 },
  jcRows: { backgroundColor: '#f4f6fb', borderRadius: 12, paddingHorizontal: 14 },
  jcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#e6eaf2' },
  jcRowKey: { flexShrink: 1, fontSize: 13, color: '#7c8aa5' },
  jcRowVal: { flexShrink: 1, fontSize: 13.5, fontWeight: '700', color: '#1a2b4a' },
  jcMembers: { fontSize: 12, lineHeight: 17, color: '#7c8aa5', marginTop: 12 },
  joinCodeBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eaf2ff', marginHorizontal: 14, marginBottom: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 46 },
  joinCodeText: { flex: 1, flexShrink: 1, fontSize: 13, fontWeight: '600', color: '#25427a' },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6fb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a2b4a' },
  clearSearch: { fontSize: 14, color: '#7c8aa5', padding: 4 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f4f6fb', alignItems: 'center' },
  tabActive: { backgroundColor: '#25427a' },
  tabText: { fontSize: 11, color: '#7c8aa5', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  guaranteedInfoBar: { backgroundColor: '#e8f5e9', padding: 10, paddingHorizontal: 16 },
  guaranteedInfoText: { fontSize: 12, color: '#22c55e', textAlign: 'center', fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#1a2b4a', marginBottom: 6, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: '#7c8aa5', textAlign: 'center', lineHeight: 19 },
  groupCard: { backgroundColor: '#fff', marginHorizontal: 14, marginTop: 14, marginBottom: 8, borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  guaranteedCard: { borderWidth: 1.5, borderColor: '#bbf7d0' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { fontSize: 15, fontWeight: '700', color: '#25427a', marginBottom: 2 },
  groupFrequencyText: { fontSize: 12, color: '#7c8aa5' },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  standardBadge: { backgroundColor: '#eaf2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  standardBadgeText: { fontSize: 10, color: '#25427a', fontWeight: 'bold' },
  guaranteedBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  guaranteedBadgeText: { fontSize: 10, color: '#d97706', fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  groupAmount: { fontSize: 22, fontWeight: '700', color: '#25427a' },
  groupAmountLabel: { fontSize: 11, color: '#7c8aa5', marginBottom: 12 },
  progressSection: { marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#7c8aa5' },
  progressValue: { fontSize: 12, fontWeight: 'bold', color: '#1a2b4a' },
  progressBar: { height: 8, backgroundColor: '#f0f2f7', borderRadius: 4 },
  progressBarFill: { height: 8, borderRadius: 4 },
  warningBox: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 10, marginBottom: 12 },
  warningText: { fontSize: 12, color: '#f5a623', textAlign: 'center' },
  avatarCoverage: { backgroundColor: '#f4f6fb', borderRadius: 12, padding: 12, marginBottom: 12 },
  avatarCoverageText: { fontSize: 12, color: '#1a2b4a', marginBottom: 6 },
  coverageBar: { height: 6, backgroundColor: '#e6eaf2', borderRadius: 3 },
  coverageBarFill: { height: 6, borderRadius: 3 },
  membersTitle: { fontSize: 12, fontWeight: '600', color: '#1a2b4a', marginBottom: 8 },
  membersRow: { marginBottom: 16 },
  memberChip: { alignItems: 'center', marginRight: 12, width: 52 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberName: { fontSize: 10, color: '#1a2b4a', textAlign: 'center' },
  groupActions: { gap: 8 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.5 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eaf2ff', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 10, minHeight: 42 },
  manageBtnText: { flex: 1, flexShrink: 1, fontSize: 13, fontWeight: '700', color: '#25427a' },
  joinBtn: { backgroundColor: '#25427a' },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  contributeBtn: { backgroundColor: '#22c55e' },
  contributeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberBadge: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 10, marginBottom: 4, alignItems: 'center' },
  memberBadgeText: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  cycleInfo: { fontSize: 11, color: '#9aa5b8', textAlign: 'center', marginTop: 12 },
  shareBtn: { backgroundColor: '#eaf2ff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#25427a', marginTop: 4 },
  shareBtnText: { color: '#25427a', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#25427a', marginBottom: 14 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  confirmLabel: { fontSize: 13, color: '#7c8aa5' },
  confirmValue: { fontSize: 13, color: '#1a2b4a' },
  avatarNote: { backgroundColor: '#eaf2ff', borderRadius: 12, padding: 12, marginVertical: 16 },
  avatarNoteText: { fontSize: 12, color: '#25427a', textAlign: 'center' },
  confirmBtn: { backgroundColor: '#25427a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelText: { textAlign: 'center', color: '#7c8aa5', fontSize: 13 },
  pinContainer: { flex: 1 },
  cancelPinText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 20, textAlign: 'center' }
})

const g = StyleSheet.create({
  hero: { backgroundColor: ds.hero, paddingHorizontal: 20, paddingBottom: 24, gap: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 17, lineHeight: 21, color: '#ffffff', fontFamily: F.x },
  groupMeta: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  ring: { width: 96, height: 96 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontSize: 22, lineHeight: 27, color: '#ffffff', fontFamily: F.x, ...tnum },
  ringLabel: { fontSize: 10, lineHeight: 12, color: ds.onHero, fontFamily: F.r },
  payoutLabel: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
  payoutAmount: { fontSize: 26, lineHeight: 32, color: '#ffffff', fontFamily: F.x, ...tnum },
  payoutTo: { fontSize: 13, lineHeight: 16, color: ds.onHero, fontFamily: F.r },
  contrib: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6 },
  contribValue: { fontSize: 20, lineHeight: 24, color: ds.ink, fontFamily: F.x, ...tnum },
  payBtn: { height: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
  payText: { color: ds.hero, fontSize: 15, lineHeight: 18, fontFamily: F.x },
  section: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  list: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 13, lineHeight: 16, fontFamily: F.x },
  name: { flex: 1, fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.s },
  state: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card },
  cover: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ds.goldWash, borderWidth: 1, borderColor: ds.goldLine, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  coverTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x },
  coverText: { fontSize: 12, lineHeight: 17, color: ds.goldInk2, fontFamily: F.r },
  shareText: { fontSize: 14, lineHeight: 17, color: ds.navy, fontFamily: F.b },
})

const L = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: 24, lineHeight: 29, color: ds.ink, fontFamily: F.x },
  create: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: ds.navy, flexDirection: 'row', alignItems: 'center', gap: 6 },
  createText: { fontSize: 14, lineHeight: 17, color: '#ffffff', fontFamily: F.b },
  seg: { flexDirection: 'row', backgroundColor: ds.divider, borderRadius: 14, padding: 4, gap: 4 },
  segItem: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: ds.card, shadowColor: '#14244a', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.s },
  segTextOn: { color: ds.hero, fontFamily: F.x },
  search: { height: 44, borderRadius: 14, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: ds.ink, fontFamily: F.s, paddingVertical: 0 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ds.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c7d0de', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  tile: { width: 38, height: 38, borderRadius: 12, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x },
  cover: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ds.goldWash, borderWidth: 1, borderColor: ds.goldLine, borderRadius: 14, padding: 12 },
  coverText: { flex: 1, fontSize: 13, lineHeight: 18, color: ds.goldInk2, fontFamily: F.m },
  card: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, padding: 14, gap: 12 },
  name: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  meta: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r, ...tnum },
  pill: { fontSize: 12, lineHeight: 15, fontFamily: F.b, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  track: { height: 6, borderRadius: 3, backgroundColor: ds.divider, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: ds.navy },
  status: { flex: 1, marginRight: 10, fontSize: 13, lineHeight: 16, color: ds.inkSoft, fontFamily: F.r },
  goldBtn: { height: 40, paddingHorizontal: 18, borderRadius: 12, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
  goldBtnText: { fontSize: 14, lineHeight: 17, color: ds.hero, fontFamily: F.x },
  navyBtn: { height: 40, paddingHorizontal: 18, borderRadius: 12, backgroundColor: ds.navy, alignItems: 'center', justifyContent: 'center' },
  navyBtnText: { fontSize: 14, lineHeight: 17, color: '#ffffff', fontFamily: F.x },
  manage: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: ds.divider, paddingTop: 12 },
  manageText: { flex: 1, fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b },
  empty: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
})

const C = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,20,45,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 20, gap: 14 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#d3dbe8' },
  title: { fontSize: 20, lineHeight: 24, color: ds.ink, fontFamily: F.x },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  key: { fontSize: 14, lineHeight: 17, color: ds.muted, fontFamily: F.r },
  val: { flexShrink: 1, fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b, textAlign: 'right', ...tnum },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalKey: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  total: { fontSize: 26, lineHeight: 32, color: ds.ink, fontFamily: F.x, ...tnum },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ds.goldWash, borderWidth: 1, borderColor: ds.goldLine, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, color: ds.goldInk2, fontFamily: F.r },
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { flex: 1, borderWidth: 1, borderColor: ds.border, backgroundColor: '#ffffff' },
  btnOutlineText: { fontSize: 16, lineHeight: 20, color: ds.navy, fontFamily: F.b },
  btnGold: { flex: 2, backgroundColor: ds.gold },
  btnGoldText: { fontSize: 16, lineHeight: 20, color: ds.hero, fontFamily: F.x },
})

const J = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, color: ds.inkSoft, fontFamily: F.r },
  code: { height: 64, borderRadius: 16, borderWidth: 1.5, borderColor: ds.navy, textAlign: 'center', fontSize: 28, color: ds.ink, fontFamily: F.x, letterSpacing: 10 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 2 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: ds.muted, fontFamily: F.r },
  card: { borderWidth: 1, borderColor: ds.border, borderRadius: 18, padding: 16, gap: 14 },
  name: { flex: 1, fontSize: 16, lineHeight: 20, color: ds.ink, fontFamily: F.x },
  pill: { alignSelf: 'flex-start', fontSize: 12, lineHeight: 15, color: ds.navy, fontFamily: F.b, backgroundColor: ds.blueSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  stat: { flex: 1, backgroundColor: ds.bg, borderRadius: 12, padding: 10, gap: 3 },
  statKey: { fontSize: 11, lineHeight: 14, color: ds.muted, fontFamily: F.b, letterSpacing: 0.4 },
  statVal: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x, ...tnum },
  seats: { fontSize: 13, lineHeight: 16, color: ds.inkSoft, fontFamily: F.r },
  track: { height: 6, borderRadius: 3, backgroundColor: ds.divider, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: ds.navy },
  members: { fontSize: 12, lineHeight: 17, color: ds.muted, fontFamily: F.r },
})
