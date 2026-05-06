import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl, ActivityIndicator,
  TextInput, Share, Modal
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ajoAPI, guaranteedAjoAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { announceAjoPayout, announceContribution } from '../utils/speech'
import PinKeypad from '../components/PinKeypad'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'

export default function AjoScreen({ navigation }: any) {
  const { user } = useAuth()
  const [standardGroups, setStandardGroups] = useState<any[]>([])
  const [guaranteedGroups, setGuaranteedGroups] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'standard' | 'guaranteed'>('all')
  const [contributeModal, setContributeModal] = useState(false)
  const [pinStep, setPinStep] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [contributing, setContributing] = useState(false)

  const loadGroups = async () => {
    try {
      const [standardRes, guaranteedRes] = await Promise.all([
        ajoAPI.getAllGroups(),
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
      Alert.alert('✅ Joined!', response.data.message)
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  const handleJoinGuaranteed = async (groupId: string) => {
    try {
      await guaranteedAjoAPI.joinGroup(groupId)
      Alert.alert('✅ Joined!', 'You joined the Guaranteed Ajo group!')
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  const handleContributeStandard = async (groupId: string, groupName: string, amount: number) => {
    Alert.alert(
      'Confirm Contribution',
      `Contribute ₦${amount.toLocaleString()} to "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contribute', onPress: async () => {
            try {
              const response = await ajoAPI.contribute(groupId)
              const data = response.data.data
              if (data.payoutSent) {
                announceAjoPayout(data.payoutAmount, groupName)
                Alert.alert('🎉 Payout!', `₦${data.payoutAmount?.toLocaleString()} paid out this cycle!`)
              } else {
                announceContribution(amount, groupName)
                Alert.alert('✅ Contributed!', `${data.paidCount} of ${data.paidCount + data.remainingCount} members paid`)
              }
              await loadGroups()
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
            }
          }
        }
      ]
    )
  }

  const handleContributeGuaranteed = async (group: any) => {
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
          { text: '🔢 Use PIN', onPress: () => setContributeModal(true) },
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
        Alert.alert('🎉 Payout Sent!', `₦${data.payoutAmount?.toLocaleString()} paid out!`)
      } else {
        Alert.alert('✅ Contributed!', `${data.paidCount} of ${data.paidCount + data.remainingCount} members paid.`)
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
          `${isGuaranteed ? '🛡️' : '🤝'} Join my ${isGuaranteed ? 'Guaranteed ' : ''}Ajo group on OWODE!\n\n` +
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🤝 Ajo Groups</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'all', label: `All (${allGroups.length})` },
          { key: 'standard', label: `🤝 Standard (${standardGroups.length})` },
          { key: 'guaranteed', label: `🛡️ Guaranteed (${guaranteedGroups.length})` }
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
            🤖 Owode Avatar guarantees your payout even if members default!
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{search ? '🔍' : '🤝'}</Text>
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
                  <View key={`guaranteed-${group.id}`} style={[styles.groupCard, styles.guaranteedCard]}>
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupFrequencyText}>{group.frequency}</Text>
                      </View>
                      <View style={styles.guaranteedBadge}>
                        <Text style={styles.guaranteedBadgeText}>🛡️ Guaranteed</Text>
                      </View>
                    </View>

                    <Text style={styles.groupAmount}>₦{group.amount?.toLocaleString()}</Text>
                    <Text style={styles.groupAmountLabel}>
                      per cycle + ₦{group.guaranteeFee?.toLocaleString()} guarantee fee
                    </Text>

                    <View style={styles.avatarCoverage}>
                      <Text style={styles.avatarCoverageText}>
                        🤖 Avatar Coverage: {group.avatarCoveredCount}/{group.maxAvatarCoverage} used
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
                          <View style={[styles.memberAvatar, { backgroundColor: m.isAvatar ? '#f5a623' : '#0d47a1' }]}>
                            <Text style={styles.memberAvatarText}>
                              {m.isAvatar ? '🤖' : m.user?.fullName?.charAt(0)}
                            </Text>
                          </View>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {m.isAvatar ? 'Avatar' : m.userId === user?.id ? 'You' : m.user?.fullName?.split(' ')[0]}
                          </Text>
                          <Text style={{ fontSize: 10, color: m.hasPaid ? '#22c55e' : '#ccc' }}>
                            {m.hasPaid ? '✅' : '⏳'}
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
                            <Text style={styles.memberBadgeText}>✅ Member — Position #{member?.position}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.contributeBtn]}
                            onPress={() => handleContributeGuaranteed(group)}
                          >
                            <Text style={styles.contributeBtnText}>💸 Contribute</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(group)}>
                        <Text style={styles.shareBtnText}>📤 Share Group</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cycleInfo}>Cycle {group.currentCycle} • Guaranteed Ajo 🛡️</Text>
                  </View>
                )
              }

              // Standard Group
              const isFull = group.members?.filter((m: any) => !m.isAvatar).length >= group.totalMembers
              const spotsLeft = group.totalMembers - (group.members?.filter((m: any) => !m.isAvatar).length || 0)

              return (
                <View key={`standard-${group.id}`} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupFrequencyText}>{group.frequency}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={styles.standardBadge}>
                        <Text style={styles.standardBadgeText}>🤝 Standard</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isFull ? '#e8f5e9' : '#fff3e0' }]}>
                        <Text style={[styles.statusBadgeText, { color: isFull ? '#22c55e' : '#f5a623' }]}>
                          {isFull ? '✅ Full' : `${spotsLeft} left`}
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
                          backgroundColor: isFull ? '#22c55e' : '#0d47a1'
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
                        <View style={[styles.memberAvatar, { backgroundColor: m.userId === user?.id ? '#f5a623' : '#0d47a1' }]}>
                          <Text style={styles.memberAvatarText}>{m.user?.fullName?.charAt(0)}</Text>
                        </View>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.userId === user?.id ? 'You' : m.user?.fullName?.split(' ')[0]}
                        </Text>
                        <Text style={{ fontSize: 10, color: m.hasPaid ? '#22c55e' : '#ccc' }}>
                          {m.hasPaid ? '✅' : '⏳'}
                        </Text>
                      </View>
                    ))}
                    {Array.from({ length: spotsLeft }).map((_, i) => (
                      <View key={`empty-${group.id}-${i}`} style={styles.memberChip}>
                        <View style={[styles.memberAvatar, { backgroundColor: '#f0f0f0' }]}>
                          <Text style={[styles.memberAvatarText, { color: '#ccc' }]}>?</Text>
                        </View>
                        <Text style={[styles.memberName, { color: '#ccc' }]}>Open</Text>
                      </View>
                    ))}
                  </ScrollView>

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
                          <Text style={styles.memberBadgeText}>✅ Member — Position #{member?.position}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.contributeBtn, (!isFull || member?.hasPaid) && styles.actionBtnDisabled]}
                          onPress={() => isFull && !member?.hasPaid && handleContributeStandard(group.id, group.name, group.amount)}
                          disabled={!isFull || member?.hasPaid}
                        >
                          <Text style={styles.contributeBtnText}>
                            {!isFull ? '⏳ Waiting for members' : member?.hasPaid ? '✅ Paid this cycle' : '💸 Contribute Now'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(group)}>
                      <Text style={styles.shareBtnText}>📤 Share Group</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cycleInfo}>Cycle {group.currentCycle} • Standard Ajo</Text>
                </View>
              )
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Guaranteed Contribute Modal */}
      <Modal visible={contributeModal} animationType="slide" transparent>
        {pinStep ? (
          <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.pinContainer}>
            {contributing ? (
              <ActivityIndicator size="large" color="#f5a623" />
            ) : (
              <>
                <PinKeypad
                  title="Transaction PIN"
                  subtitle="Enter your 4-digit PIN to confirm"
                  pinLength={4}
                  onComplete={executeGuaranteedContribution}
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
              <Text style={styles.modalTitle}>💸 Confirm Contribution</Text>
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
                    <Text style={[styles.confirmLabel, { fontWeight: 'bold', color: '#0d47a1' }]}>Total</Text>
                    <Text style={[styles.confirmValue, { fontWeight: 'bold', color: '#0d47a1' }]}>
                      ₦{(selectedGroup.amount + selectedGroup.guaranteeFee)?.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.avatarNote}>
                    <Text style={styles.avatarNoteText}>🤖 Your payout is protected by the Owode Avatar</Text>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setPinStep(true)}>
                <Text style={styles.confirmBtnText}>Continue to PIN →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setContributeModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  clearSearch: { fontSize: 14, color: '#888', padding: 4 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
  tabActive: { backgroundColor: '#0d47a1' },
  tabText: { fontSize: 11, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  guaranteedInfoBar: { backgroundColor: '#e8f5e9', padding: 10, paddingHorizontal: 16 },
  guaranteedInfoText: { fontSize: 12, color: '#22c55e', textAlign: 'center', fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  groupCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  guaranteedCard: { borderWidth: 1.5, borderColor: '#bbf7d0' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { fontSize: 17, fontWeight: 'bold', color: '#0d47a1', marginBottom: 2 },
  groupFrequencyText: { fontSize: 12, color: '#888' },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  standardBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  standardBadgeText: { fontSize: 10, color: '#0d47a1', fontWeight: 'bold' },
  guaranteedBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  guaranteedBadgeText: { fontSize: 10, color: '#d97706', fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  groupAmount: { fontSize: 28, fontWeight: 'bold', color: '#0d47a1' },
  groupAmountLabel: { fontSize: 12, color: '#888', marginBottom: 16 },
  progressSection: { marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#888' },
  progressValue: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  progressBar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4 },
  progressBarFill: { height: 8, borderRadius: 4 },
  warningBox: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 10, marginBottom: 12 },
  warningText: { fontSize: 12, color: '#f5a623', textAlign: 'center' },
  avatarCoverage: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, marginBottom: 12 },
  avatarCoverageText: { fontSize: 12, color: '#333', marginBottom: 6 },
  coverageBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3 },
  coverageBarFill: { height: 6, borderRadius: 3 },
  membersTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  membersRow: { marginBottom: 16 },
  memberChip: { alignItems: 'center', marginRight: 12, width: 52 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  memberAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  memberName: { fontSize: 10, color: '#333', textAlign: 'center' },
  groupActions: { gap: 8 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.5 },
  joinBtn: { backgroundColor: '#0d47a1' },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  contributeBtn: { backgroundColor: '#22c55e' },
  contributeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  memberBadge: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 10, marginBottom: 4, alignItems: 'center' },
  memberBadgeText: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  cycleInfo: { fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 12 },
  shareBtn: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#0d47a1', marginTop: 4 },
  shareBtnText: { color: '#0d47a1', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d47a1', marginBottom: 16 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  confirmLabel: { fontSize: 14, color: '#888' },
  confirmValue: { fontSize: 14, color: '#333' },
  avatarNote: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 12, marginVertical: 16 },
  avatarNoteText: { fontSize: 12, color: '#0d47a1', textAlign: 'center' },
  confirmBtn: { backgroundColor: '#0d47a1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#888', fontSize: 14 },
  pinContainer: { flex: 1 },
  cancelPinText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 20, textAlign: 'center' }
})