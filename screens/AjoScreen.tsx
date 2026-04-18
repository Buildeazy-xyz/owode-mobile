import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl, Modal, TextInput, ActivityIndicator
} from 'react-native'
import { ajoAPI } from '../utils/api'

export default function AjoScreen({ navigation }: any) {
  const [groups, setGroups] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('DAILY')
  const [totalMembers, setTotalMembers] = useState('')

  const loadGroups = async () => {
    try {
      const response = await ajoAPI.getAllGroups()
      setGroups(response.data.data)
    } catch (error) {
      Alert.alert('Error', 'Could not load groups')
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
      await ajoAPI.createGroup({ name, amount: Number(amount), frequency, totalMembers: Number(totalMembers) })
      Alert.alert('Success', 'Ajo group created!')
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
      await ajoAPI.joinGroup(groupId)
      Alert.alert('Success', 'You joined the group!')
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  const handleContribute = async (groupId: string) => {
    try {
      const response = await ajoAPI.contribute(groupId)
      const data = response.data.data
      if (data.payoutSent) {
        Alert.alert('🎉 Payout Sent!', `₦${data.payoutAmount.toLocaleString()} has been paid out!`)
      } else {
        Alert.alert('✅ Contributed!', `${data.paidCount} of ${data.paidCount + data.remainingCount} members have paid`)
      }
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajo Groups</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtn}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤝</Text>
            <Text style={styles.emptyText}>No active groups yet</Text>
            <Text style={styles.emptySubText}>Create or join an Ajo group to start saving!</Text>
          </View>
        ) : (
          groups.map((group: any) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupFrequency}>{group.frequency}</Text>
              </View>
              <Text style={styles.groupAmount}>₦{group.amount.toLocaleString()} per cycle</Text>
              <Text style={styles.groupMembers}>{group.members.length}/{group.totalMembers} members • Cycle {group.currentCycle}</Text>
              <View style={styles.groupActions}>
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(group.id)}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contributeBtn} onPress={() => handleContribute(group.id)}>
                  <Text style={styles.contributeBtnText}>Contribute</Text>
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
            <Text style={styles.modalTitle}>Create Ajo Group</Text>
            <TextInput style={styles.input} placeholder="Group Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Amount per cycle (₦)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Total Members" value={totalMembers} onChangeText={setTotalMembers} keyboardType="numeric" />
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
            
            <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createGroupBtnText}>Create Group</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  createBtn: { color: '#f5a623', fontSize: 16, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8 },
  groupCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 16, padding: 20 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  groupName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  groupFrequency: { backgroundColor: '#f5a623', color: '#fff', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  groupAmount: { fontSize: 20, fontWeight: 'bold', color: '#f5a623', marginBottom: 4 },
  groupMembers: { fontSize: 12, color: '#888', marginBottom: 16 },
  groupActions: { flexDirection: 'row', gap: 8 },
  joinBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, alignItems: 'center' },
  joinBtnText: { color: '#1a1a2e', fontWeight: '600' },
  contributeBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, alignItems: 'center' },
  contributeBtnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 20 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, color: '#333' },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, alignItems: 'center' },
  freqBtnActive: { backgroundColor: '#1a1a2e' },
  freqBtnText: { color: '#888', fontWeight: '600', fontSize: 12 },
  freqBtnTextActive: { color: '#fff' },
  createGroupBtn: { backgroundColor: '#f5a623', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  createGroupBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelText: { textAlign: 'center', color: '#888', fontSize: 14 }
})