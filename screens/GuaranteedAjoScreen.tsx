import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl, Modal,
  TextInput, ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { guaranteedAjoAPI } from '../utils/api'
import PinKeypad from '../components/PinKeypad'

export default function GuaranteedAjoScreen({ navigation }: any) {
  const [groups, setGroups] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [contributeModal, setContributeModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pinStep, setPinStep] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('WEEKLY')
  const [totalMembers, setTotalMembers] = useState('')

  const loadGroups = async () => {
    try {
      const response = await guaranteedAjoAPI.getAllGroups()
      setGroups(response.data.data)
    } catch (error) {
      Alert.alert('Error', 'Could not load Guaranteed Ajo groups')
    }
  }

  useEffect(() => { loadGroups() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadGroups()
    setRefreshing(false)
  }

  const handleCreateGroup = async () => {
    if (!name || !amount || !totalMembers) {
      Alert.alert('Error', 'All fields are required')
      return
    }
    try {
      setLoading(true)
      await guaranteedAjoAPI.createGroup({
        name, amount: Number(amount), frequency, totalMembers: Number(totalMembers)
      })
      Alert.alert('🛡️ Group Created!', 'Your Guaranteed Ajo group is live!')
      setModalVisible(false)
      setName(''); setAmount(''); setTotalMembers('')
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (groupId: string) => {
    try {
      await guaranteedAjoAPI.joinGroup(groupId)
      Alert.alert('✅ Joined!', 'You joined the Guaranteed Ajo group!')
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  const handleContribute = (group: any) => {
    setSelectedGroup(group)
    setContributeModal(true)
  }

  const executeContribution = async (pin: string) => {
    try {
      setLoading(true)
      const response = await guaranteedAjoAPI.contribute(selectedGroup.id, pin)
      const data = response.data.data
      setContributeModal(false)
      setPinStep(false)

      if (data.payoutSent) {
        Alert.alert('🎉 Payout Sent!', `₦${data.payoutAmount?.toLocaleString()} has been paid out this cycle!`)
      } else {
        Alert.alert('✅ Contributed!', `${data.paidCount} of ${data.paidCount + data.remainingCount} members have paid.\n\nGuarantee fee: ₦${selectedGroup.guaranteeFee?.toLocaleString()} collected to pool.`)
      }
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
      setPinStep(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛡️ Guaranteed Ajo</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtn}>+ New</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>🤖</Text>
        <View style={styles.infoBannerText}>
          <Text style={styles.infoBannerTitle}>Owode Avatar Protection</Text>
          <Text style={styles.infoBannerDesc}>Your payout is guaranteed. If anyone defaults, the Owode Avatar instantly covers their share.</Text>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyText}>No Guaranteed Ajo groups yet</Text>
            <Text style={styles.emptySubText}>Create one to start saving with zero risk!</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.createFirstBtnText}>Create First Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <View style={styles.guaranteedBadge}>
                    <Text style={styles.guaranteedBadgeText}>🛡️ Guaranteed</Text>
                  </View>
                </View>
                <Text style={styles.groupFrequency}>{group.frequency}</Text>
              </View>

              <Text style={styles.groupAmount}>₦{group.amount?.toLocaleString()} per cycle</Text>
              <Text style={styles.groupFee}>+ ₦{group.guaranteeFee?.toLocaleString()} guarantee fee</Text>

              {/* Avatar coverage indicator */}
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

              {/* Members list */}
              <Text style={styles.membersTitle}>Members ({group.members?.length}/{group.totalMembers})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersRow}>
                {group.members?.map((m: any) => (
                  <View key={m.id} style={styles.memberChip}>
                    <View style={[styles.memberAvatar, { backgroundColor: m.isAvatar ? '#f5a623' : '#0d47a1' }]}>
                      <Text style={styles.memberAvatarText}>
                        {m.isAvatar ? '🤖' : m.user?.fullName?.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.isAvatar ? 'Avatar' : m.user?.fullName?.split(' ')[0]}
                    </Text>
                    <Text style={[styles.memberPaid, { color: m.hasPaid ? '#22c55e' : '#888' }]}>
                      {m.isAvatar ? '✅' : m.hasPaid ? '✅' : '⏳'}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.groupActions}>
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(group.id)}>
                  <Text style={styles.joinBtnText}>Join Group</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contributeBtn} onPress={() => handleContribute(group)}>
                  <Text style={styles.contributeBtnText}>💸 Contribute</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>🛡️ Create Guaranteed Ajo</Text>
            <Text style={styles.modalSubtitle}>Requires BVN/NIN verification</Text>

            <TextInput style={styles.input} placeholder="Group Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Amount per cycle (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Number of Members (excluding Avatar)" value={totalMembers} onChangeText={setTotalMembers} keyboardType="numeric" />

            <View style={styles.freqRow}>
              {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.freqBtnText, frequency === f && styles.freqBtnTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {amount ? (
              <View style={styles.feeInfo}>
                <Text style={styles.feeInfoText}>
                  💡 Guarantee fee: ₦{(Number(amount) * 0.005).toLocaleString()} per contribution
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createGroupBtnText}>Create Guaranteed Group</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={contributeModal} animationType="slide" transparent>
        {pinStep ? (
          <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.pinContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#f5a623" />
            ) : (
              <>
                <PinKeypad
                  title="Transaction PIN"
                  subtitle="Enter your 4-digit PIN to confirm"
                  pinLength={4}
                  onComplete={executeContribution}
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
                  <View style={[styles.confirmRow, styles.confirmTotal]}>
                    <Text style={[styles.confirmLabel, { fontWeight: 'bold', color: '#0d47a1' }]}>Total Deducted</Text>
                    <Text style={[styles.confirmValue, { fontWeight: 'bold', color: '#0d47a1' }]}>
                      ₦{(selectedGroup.amount + selectedGroup.guaranteeFee)?.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.avatarNote}>
                    <Text style={styles.avatarNoteText}>
                      🤖 Your payout is protected by the Owode Avatar
                    </Text>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.createGroupBtn} onPress={() => setPinStep(true)}>
                <Text style={styles.createGroupBtnText}>Continue to PIN →</Text>
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
  createBtn: { color: '#f5a623', fontSize: 16, fontWeight: 'bold' },
  infoBanner: { backgroundColor: '#e3f2fd', margin: 16, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
  infoBannerIcon: { fontSize: 28, marginRight: 12 },
  infoBannerText: { flex: 1 },
  infoBannerTitle: { fontSize: 14, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  infoBannerDesc: { fontSize: 12, color: '#555', lineHeight: 18 },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  createFirstBtn: { backgroundColor: '#0d47a1', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16 },
  createFirstBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  groupCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  guaranteedBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  guaranteedBadgeText: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  groupFrequency: { backgroundColor: '#0d47a1', color: '#fff', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  groupAmount: { fontSize: 22, fontWeight: 'bold', color: '#0d47a1', marginBottom: 2 },
  groupFee: { fontSize: 12, color: '#888', marginBottom: 12 },
  avatarCoverage: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, marginBottom: 12 },
  avatarCoverageText: { fontSize: 12, color: '#333', marginBottom: 6 },
  coverageBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3 },
  coverageBarFill: { height: 6, borderRadius: 3 },
  membersTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  membersRow: { marginBottom: 16 },
  memberChip: { alignItems: 'center', marginRight: 12, width: 56 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  memberAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  memberName: { fontSize: 10, color: '#333', textAlign: 'center', width: 56 },
  memberPaid: { fontSize: 12, marginTop: 2 },
  groupActions: { flexDirection: 'row', gap: 8 },
  joinBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, alignItems: 'center' },
  joinBtnText: { color: '#0d47a1', fontWeight: '600', fontSize: 13 },
  contributeBtn: { flex: 1, backgroundColor: '#0d47a1', borderRadius: 12, padding: 12, alignItems: 'center' },
  contributeBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, color: '#333' },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, alignItems: 'center' },
  freqBtnActive: { backgroundColor: '#0d47a1' },
  freqBtnText: { color: '#888', fontWeight: '600', fontSize: 12 },
  freqBtnTextActive: { color: '#fff' },
  feeInfo: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 12, marginBottom: 16 },
  feeInfoText: { fontSize: 12, color: '#0d47a1' },
  createGroupBtn: { backgroundColor: '#0d47a1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  createGroupBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelText: { textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 8 },
  pinContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cancelPinText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 20 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  confirmTotal: { borderBottomWidth: 0, marginTop: 4 },
  confirmLabel: { fontSize: 14, color: '#888' },
  confirmValue: { fontSize: 14, color: '#333' },
  avatarNote: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 12, marginVertical: 16 },
  avatarNoteText: { fontSize: 12, color: '#0d47a1', textAlign: 'center' }
})