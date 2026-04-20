import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl, ActivityIndicator,
  TextInput
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ajoAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { announceAjoPayout, announceContribution } from '../utils/speech'

export default function AjoScreen({ navigation }: any) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadGroups = async () => {
    try {
      const response = await ajoAPI.getAllGroups()
      setGroups(response.data.data)
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

  const handleJoin = async (groupId: string) => {
    try {
      const response = await ajoAPI.joinGroup(groupId)
      Alert.alert('✅ Joined!', response.data.message)
      await loadGroups()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    }
  }

  const handleContribute = async (groupId: string, groupName: string, amount: number) => {
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

  const isMyGroup = (group: any) => group.members?.some((m: any) => m.userId === user?.id)
  const myMember = (group: any) => group.members?.find((m: any) => m.userId === user?.id)

  const filteredGroups = groups
    .filter(g => !g.isGuaranteed)
    .filter(g =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.frequency.toLowerCase().includes(search.toLowerCase())
    )

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

      <View style={styles.infoBar}>
        <Text style={styles.infoBarText}>
          💡 Groups are created by OWODE admins. Join any open group!
        </Text>
      </View>

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
              const isFull = group.members?.length >= group.totalMembers
              const spotsLeft = group.totalMembers - (group.members?.length || 0)
              const isMember = isMyGroup(group)
              const member = myMember(group)

              return (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupFrequencyText}>{group.frequency}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isFull ? '#e8f5e9' : '#fff3e0' }]}>
                      <Text style={[styles.statusBadgeText, { color: isFull ? '#22c55e' : '#f5a623' }]}>
                        {isFull ? '✅ Full' : `${spotsLeft} spots left`}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.groupAmount}>₦{group.amount?.toLocaleString()}</Text>
                  <Text style={styles.groupAmountLabel}>per contribution cycle</Text>

                  <View style={styles.progressSection}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Members</Text>
                      <Text style={styles.progressValue}>{group.members?.length}/{group.totalMembers}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressBarFill,
                        {
                          width: `${((group.members?.length || 0) / group.totalMembers) * 100}%`,
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
                    {group.members?.map((m: any) => (
                      <View key={m.id} style={styles.memberChip}>
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
                      <View key={`empty-${i}`} style={styles.memberChip}>
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
                        onPress={() => !isFull && handleJoin(group.id)}
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
                          onPress={() => isFull && !member?.hasPaid && handleContribute(group.id, group.name, group.amount)}
                          disabled={!isFull || member?.hasPaid}
                        >
                          <Text style={styles.contributeBtnText}>
                            {!isFull ? '⏳ Waiting for members' : member?.hasPaid ? '✅ Paid this cycle' : '💸 Contribute Now'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  <Text style={styles.cycleInfo}>Cycle {group.currentCycle} • Created by OWODE Admin</Text>
                </View>
              )
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  infoBar: { backgroundColor: '#e3f2fd', padding: 10, paddingHorizontal: 16 },
  infoBarText: { fontSize: 12, color: '#0d47a1', textAlign: 'center' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  groupCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { fontSize: 17, fontWeight: 'bold', color: '#0d47a1', marginBottom: 2 },
  groupFrequencyText: { fontSize: 12, color: '#888' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
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
  memberBadge: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 10, marginBottom: 8, alignItems: 'center' },
  memberBadgeText: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  cycleInfo: { fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 12 }
})