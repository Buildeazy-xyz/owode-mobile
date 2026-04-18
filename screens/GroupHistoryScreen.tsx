import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { guaranteedAjoAPI } from '../utils/api'

export default function GroupHistoryScreen({ route, navigation }: any) {
  const { groupId } = route.params
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await guaranteedAjoAPI.getGroup(groupId)
        setGroup(response.data.data)
      } catch (error) {
        console.error('Could not load group')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group History</Text>
        <View />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 40 }} />
      ) : group ? (
        <>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupCycle}>Cycle {group.currentCycle} of {group.totalMembers - 1}</Text>
          </View>

          <Text style={styles.sectionTitle}>Members & Positions</Text>
          {group.members?.map((m: any) => (
            <View key={m.id} style={styles.memberCard}>
              <View style={[styles.positionBadge, { backgroundColor: m.isAvatar ? '#f5a623' : '#0d47a1' }]}>
                <Text style={styles.positionText}>{m.isAvatar ? '🤖' : `#${m.position}`}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.isAvatar ? 'Owode Avatar' : m.user?.fullName}</Text>
                <Text style={styles.memberPhone}>{m.isAvatar ? 'Safety Net' : m.user?.phone}</Text>
              </View>
              <View style={styles.memberStatus}>
                {m.payoutReceived && <Text style={styles.payoutReceived}>✅ Paid Out</Text>}
                {m.hasPaid && !m.payoutReceived && <Text style={styles.hasPaid}>✅ Contributed</Text>}
                {!m.hasPaid && !m.isAvatar && <Text style={styles.pending}>⏳ Pending</Text>}
                {m.isAvatar && <Text style={styles.avatarReady}>🛡️ Ready</Text>}
              </View>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Cycle History</Text>
          {group.cycles?.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No completed cycles yet</Text>
            </View>
          ) : (
            group.cycles?.map((cycle: any) => (
              <View key={cycle.id} style={styles.cycleCard}>
                <View style={styles.cycleLeft}>
                  <Text style={styles.cycleNumber}>Cycle {cycle.cycleNumber}</Text>
                  <Text style={styles.cycleDate}>{new Date(cycle.completedAt || cycle.startedAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.cycleRight}>
                  <Text style={styles.cycleAmount}>₦{cycle.totalAmount?.toLocaleString()}</Text>
                  {cycle.avatarCovered && (
                    <Text style={styles.avatarCovered}>🤖 Avatar covered</Text>
                  )}
                </View>
              </View>
            ))
          )}

          {/* Defaults in this group */}
          {group.defaultRecords?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>⚠️ Default Records</Text>
              {group.defaultRecords.map((record: any) => (
                <View key={record.id} style={styles.defaultCard}>
                  <Text style={styles.defaultUser}>{record.user?.fullName}</Text>
                  <Text style={styles.defaultAmount}>Owed: ₦{record.amountOwed?.toLocaleString()}</Text>
                  <Text style={[styles.defaultStatus, {
                    color: record.recoveryStatus === 'RECOVERED' ? '#22c55e' :
                      record.recoveryStatus === 'HARD_RECOVERY' ? '#ef4444' : '#f5a623'
                  }]}>{record.recoveryStatus}</Text>
                </View>
              ))}
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  groupInfo: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, alignItems: 'center' },
  groupName: { fontSize: 20, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  groupCycle: { fontSize: 14, color: '#888' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  memberCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  positionBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  positionText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#333' },
  memberPhone: { fontSize: 12, color: '#888', marginTop: 2 },
  memberStatus: { alignItems: 'flex-end' },
  payoutReceived: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  hasPaid: { fontSize: 12, color: '#0d47a1', fontWeight: '600' },
  pending: { fontSize: 12, color: '#888' },
  avatarReady: { fontSize: 12, color: '#f5a623', fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 20 },
  emptyText: { color: '#888', fontSize: 14 },
  cycleCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cycleLeft: {},
  cycleNumber: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cycleDate: { fontSize: 12, color: '#888', marginTop: 2 },
  cycleRight: { alignItems: 'flex-end' },
  cycleAmount: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' },
  avatarCovered: { fontSize: 11, color: '#f5a623', marginTop: 2 },
  defaultCard: { backgroundColor: '#ffebee', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16 },
  defaultUser: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  defaultAmount: { fontSize: 13, color: '#ef4444', marginTop: 2 },
  defaultStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 }
})