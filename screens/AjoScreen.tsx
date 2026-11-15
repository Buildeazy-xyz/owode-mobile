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
              <Text style={g.contribValue}>
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

          <Text style={g.section}>Payout order</Text>

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
          <LinearGradient colors={['#1a2e55', '#25427a', '#385c9e']} style={styles.pinContainer}>
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
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Confirm Contribution</Text>
              {selectedGroup && (
                <>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Group</Text>
                    <Text style={styles.confirmValue}>{selectedGroup.name}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Contribution</Text>
                    <Text style={styles.confirmValue}>₦{selectedGroup.amount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Guarantee Fee</Text>
                    <Text style={styles.confirmValue}>₦{selectedGroup.guaranteeFee?.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.confirmLabel, { fontWeight: 'bold', color: '#25427a' }]}>Total</Text>
                    <Text style={[styles.confirmValue, { fontWeight: 'bold', color: '#25427a' }]}>
                      ₦{(selectedGroup.amount + selectedGroup.guaranteeFee)?.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.avatarNote}>
                    <Text style={styles.avatarNoteText}>Your payout is protected by the Owode Avatar</Text>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setPinStep(true)}>
                <Text style={styles.confirmBtnText}>Continue to PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setContributeModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
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
        <View style={styles.jcBackdrop}>
          <View style={[styles.jcSheet, { maxHeight: SCREEN_H - kbHeight - 40 }]}>
            <View style={styles.jcHeader}>
              <Text style={styles.jcTitle} numberOfLines={1}>Join with invite code</Text>
              <TouchableOpacity onPress={() => { setShowJoinCode(false); setJoinCode(''); setPreview(null) }}>
                <Ionicons name="close" size={20} color="#7c8aa5" />
              </TouchableOpacity>
            </View>

            {!preview ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.jcLabel}>Enter the 6 character code</Text>
                <TextInput
                  style={styles.jcInput}
                  placeholder="ABC123"
                  placeholderTextColor="#9aa5b8"
                  value={joinCode}
                  onChangeText={t => setJoinCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <View style={styles.jcWarn}>
                  <Ionicons name="information-circle" size={17} color="#d97706" />
                  <Text style={styles.jcWarnText}>
                    This is a standard Ajo. If a member fails to contribute, OWODE does not cover it.
                    Only join groups with people you trust.
                  </Text>
                </View>
                <TouchableOpacity style={styles.jcBtn} onPress={lookupCode} disabled={joining}>
                  {joining ? <OwodeLoader color="#fff" /> : <Text style={styles.jcBtnText}>Find group</Text>}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={{ padding: 20 }}>
                <Text style={styles.jcGroupName} numberOfLines={2}>{preview.name}</Text>
                <View style={styles.jcRows}>
                  {[
                    ['Contribution', '\u20a6' + Number(preview.amount).toLocaleString() + ' ' + String(preview.frequency).toLowerCase()],
                    ['You collect', '\u20a6' + (Number(preview.amount) * preview.totalMembers).toLocaleString()],
                    ['Members', preview.joined + ' of ' + preview.totalMembers],
                    ['Status', preview.alreadyIn ? 'Request already sent' : 'Creator must approve']
                  ].map(([k, v]) => (
                    <View key={k} style={styles.jcRow}>
                      <Text style={styles.jcRowKey} numberOfLines={1}>{k}</Text>
                      <Text style={styles.jcRowVal} numberOfLines={1}>{v}</Text>
                    </View>
                  ))}
                </View>

                {preview.memberNames?.length ? (
                  <Text style={styles.jcMembers} numberOfLines={3}>
                    Already in: {preview.memberNames.join(', ')}
                  </Text>
                ) : null}

                <View style={styles.jcWarn}>
                  <Ionicons name="information-circle" size={17} color="#d97706" />
                  <Text style={styles.jcWarnText}>
                    If a member fails to contribute, OWODE does not cover it.
                  </Text>
                </View>

                {preview.alreadyIn ? (
                  <View style={[styles.jcBtn, { backgroundColor: '#e6eaf2' }]}>
                    <Text style={[styles.jcBtnText, { color: '#7c8aa5' }]}>Request already sent</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.jcBtn} onPress={confirmJoin} disabled={joining}>
                    {joining ? <OwodeLoader color="#fff" /> : <Text style={styles.jcBtnText}>Request to join</Text>}
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setPreview(null)} style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ color: '#7c8aa5', fontSize: 13 }}>Use a different code</Text>
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a2e55', '#25427a', '#385c9e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajo Groups</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateAjo')}>
          <Ionicons name="add-circle-outline" size={24} color="#f5a623" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9aa5b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9aa5b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <TouchableOpacity style={styles.joinCodeBar} onPress={() => setShowJoinCode(true)}>
        <Ionicons name="key-outline" size={17} color="#25427a" />
        <Text style={styles.joinCodeText}>Have an invite code? Join a group</Text>
        <Ionicons name="chevron-forward" size={16} color="#7c8aa5" />
      </TouchableOpacity>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'all', label: `All (${allGroups.length})` },
          { key: 'standard', label: `Standard (${standardGroups.length})` },
          { key: 'guaranteed', label: `Guaranteed (${guaranteedGroups.length})` }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Guaranteed Info Bar */}
      {activeTab === 'guaranteed' && (
        <View style={styles.guaranteedInfoBar}>
          <Text style={styles.guaranteedInfoText}>
            Owode Avatar guarantees your payout even if members default!
          </Text>
        </View>
      )}

      {loading ? (
        <OwodeLoader size="large" fullscreen color="#25427a"  />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredGroups.length === 0 ? (
            <View style={styles.emptyState}>
              {search ? <Ionicons name="search-outline" size={56} color="#9aa5b8" style={{ marginBottom: 16 }} /> : null}
              <Text style={styles.emptyText}>
                {search ? `No groups found for "${search}"` : 'No Ajo groups available'}
              </Text>
              <Text style={styles.emptySubText}>
                {search ? 'Try a different search term' : 'Check back soon — OWODE admins are creating groups!'}
              </Text>
            </View>
          ) : (
            filteredGroups.map(group => {
              const isMember = isMyGroup(group)
              const member = myMember(group)

              if (group.type === 'guaranteed') {
                return (
                  <TouchableOpacity
                    key={`guaranteed-${group.id}`}
                    style={[styles.groupCard, styles.guaranteedCard]}
                    activeOpacity={isMember ? 0.9 : 1}
                    onPress={() => isMember && setFocus({ id: group.id, kind: 'guaranteed', fromParam: false })}
                  >
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupFrequencyText}>{group.frequency}</Text>
                      </View>
                      <View style={styles.guaranteedBadge}>
                        <Text style={styles.guaranteedBadgeText}>Guaranteed</Text>
                      </View>
                    </View>

                    <Text style={styles.groupAmount}>₦{group.amount?.toLocaleString()}</Text>
                    <Text style={styles.groupAmountLabel}>
                      per cycle + ₦{group.guaranteeFee?.toLocaleString()} guarantee fee
                    </Text>

                    <View style={styles.avatarCoverage}>
                      <Text style={styles.avatarCoverageText}>
                        Avatar Coverage: {group.avatarCoveredCount}/{group.maxAvatarCoverage} used
                      </Text>
                      <View style={styles.coverageBar}>
                        <View style={[
                          styles.coverageBarFill,
                          {
                            width: `${(group.avatarCoveredCount / group.maxAvatarCoverage) * 100}%`,
                            backgroundColor: group.avatarCoveredCount === group.maxAvatarCoverage ? '#ef4444' : '#22c55e'
                          }
                        ]} />
                      </View>
                    </View>

                    <Text style={styles.membersTitle}>
                      Members ({group.members?.length}/{group.totalMembers})
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersRow}>
                      {group.members?.map((m: any) => (
                        <View key={`gm-${m.id}`} style={styles.memberChip}>
                          <View style={[styles.memberAvatar, { backgroundColor: m.isAvatar ? '#f5a623' : '#25427a' }]}>
                            <Text style={styles.memberAvatarText}>
                              {m.isAvatar ? '' : m.user?.fullName?.charAt(0)}
                            </Text>
                          </View>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {m.isAvatar ? 'Avatar' : m.userId === user?.id ? 'You' : m.user?.fullName?.split(' ')[0]}
                          </Text>
                          <Text style={{ fontSize: 10, color: m.hasPaid ? '#22c55e' : '#ccc' }}>
                            {m.hasPaid ? '' : 'Due'}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>

                    <View style={styles.groupActions}>
                      {!isMember ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.joinBtn]}
                          onPress={() => handleJoinGuaranteed(group.id)}
                        >
                          <Text style={styles.joinBtnText}>+ Join Group</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>Member — Position #{member?.position}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.contributeBtn]}
                            onPress={() => { setContributeMode('guaranteed'); handleContributeGuaranteed(group) }}
                          >
                            <Text style={styles.contributeBtnText}>Contribute</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(group)}>
                        <Text style={styles.shareBtnText}>Share Group</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cycleInfo}>Cycle {group.currentCycle} • Guaranteed Ajo</Text>
                  </TouchableOpacity>
                )
              }

              // Standard Group
              const isFull = group.members?.filter((m: any) => !m.isAvatar).length >= group.totalMembers
              const spotsLeft = group.totalMembers - (group.members?.filter((m: any) => !m.isAvatar).length || 0)

              return (
                <TouchableOpacity
                  key={`standard-${group.id}`}
                  style={styles.groupCard}
                  activeOpacity={isMember ? 0.9 : 1}
                  onPress={() => isMember && setFocus({ id: group.id, kind: 'standard', fromParam: false })}
                >
                  <View style={styles.groupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupFrequencyText}>{group.frequency}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={styles.standardBadge}>
                        <Text style={styles.standardBadgeText}>Standard</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isFull ? '#e8f5e9' : '#fff3e0' }]}>
                        <Text style={[styles.statusBadgeText, { color: isFull ? '#22c55e' : '#f5a623' }]}>
                          {isFull ? 'Full' : `${spotsLeft} left`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.groupAmount}>₦{group.amount?.toLocaleString()}</Text>
                  <Text style={styles.groupAmountLabel}>per contribution cycle</Text>

                  <View style={styles.progressSection}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Members</Text>
                      <Text style={styles.progressValue}>
                        {group.members?.filter((m: any) => !m.isAvatar).length}/{group.totalMembers}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressBarFill,
                        {
                          width: `${((group.members?.filter((m: any) => !m.isAvatar).length || 0) / group.totalMembers) * 100}%`,
                          backgroundColor: isFull ? '#22c55e' : '#25427a'
                        }
                      ]} />
                    </View>
                  </View>

                  {!isFull && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>
                        ⏳ {spotsLeft} more member{spotsLeft > 1 ? 's' : ''} needed before contributions start
                      </Text>
                    </View>
                  )}

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersRow}>
                    {group.members?.filter((m: any) => !m.isAvatar).map((m: any) => (
                      <View key={`sm-${m.id}`} style={styles.memberChip}>
                        <View style={[styles.memberAvatar, { backgroundColor: m.userId === user?.id ? '#f5a623' : '#25427a' }]}>
                          <Text style={styles.memberAvatarText}>{m.user?.fullName?.charAt(0)}</Text>
                        </View>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.userId === user?.id ? 'You' : m.user?.fullName?.split(' ')[0]}
                        </Text>
                        <Text style={{ fontSize: 10, color: m.hasPaid ? '#22c55e' : '#ccc' }}>
                          {m.hasPaid ? '' : 'Due'}
                        </Text>
                      </View>
                    ))}
                    {Array.from({ length: spotsLeft }).map((_, i) => (
                      <View key={`empty-${group.id}-${i}`} style={styles.memberChip}>
                        <View style={[styles.memberAvatar, { backgroundColor: '#f0f2f7' }]}>
                          <Text style={[styles.memberAvatarText, { color: '#9aa5b8' }]}>?</Text>
                        </View>
                        <Text style={[styles.memberName, { color: '#9aa5b8' }]}>Open</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {group.createdBy === user?.id && group.approvalStatus !== 'APPROVED' ? (
                    <TouchableOpacity
                      style={styles.manageBtn}
                      onPress={() => navigation.navigate('ManageAjo', {
                        groupId: group.id,
                        groupName: group.name,
                        inviteCode: group.inviteCode,
                        amount: group.amount,
                        frequency: group.frequency
                      })}
                    >
                      <Ionicons name="settings-outline" size={15} color="#25427a" />
                      <Text style={styles.manageBtnText} numberOfLines={1}>
                        {group.members?.filter((m: any) => m.status === 'PENDING').length
                          ? 'Manage group \u00b7 ' + group.members.filter((m: any) => m.status === 'PENDING').length + ' waiting'
                          : 'Manage group'}
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color="#7c8aa5" />
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.groupActions}>
                    {!isMember ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.joinBtn, isFull && styles.actionBtnDisabled]}
                        onPress={() => !isFull && handleJoinStandard(group.id)}
                        disabled={isFull}
                      >
                        <Text style={styles.joinBtnText}>{isFull ? 'Group Full' : '+ Join Group'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <View style={styles.memberBadge}>
                          <Text style={styles.memberBadgeText}>Member — Position #{member?.position}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.contributeBtn, (!isFull || member?.hasPaid) && styles.actionBtnDisabled]}
                          onPress={() => isFull && !member?.hasPaid && handleContributeStandard(group.id, group.name, group.amount)}
                          disabled={!isFull || member?.hasPaid}
                        >
                          <Text style={styles.contributeBtnText}>
                            {!isFull ? '⏳ Waiting for members' : member?.hasPaid ? 'Paid this cycle' : 'Contribute Now'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(group)}>
                      <Text style={styles.shareBtnText}>Share Group</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cycleInfo}>Cycle {group.currentCycle} • Standard Ajo</Text>
                </TouchableOpacity>
              )
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

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
  shareText: { fontSize: 14, lineHeight: 17, color: ds.navy, fontFamily: F.b },
})
