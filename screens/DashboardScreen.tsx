import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { walletAPI } from '../utils/api'

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth()
  const [wallet, setWallet] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      setWallet(response.data.data)
    } catch (error: any) {
      Alert.alert('Error', 'Could not load wallet')
    }
  }

  useEffect(() => { loadWallet() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadWallet()
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Total Balance</Text>
        <Text style={styles.walletBalance}>
          ₦{wallet?.balance?.toLocaleString() || '0'}
        </Text>
        <View style={styles.walletRow}>
          <View>
            <Text style={styles.walletSubLabel}>Total Saved</Text>
            <Text style={styles.walletSubValue}>₦{wallet?.totalSaved?.toLocaleString() || '0'}</Text>
          </View>
          <View>
            <Text style={styles.walletSubLabel}>Total Payout</Text>
            <Text style={styles.walletSubValue}>₦{wallet?.totalPayout?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionLabel}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Ajo')}>
          <Text style={styles.actionIcon}>🤝</Text>
          <Text style={styles.actionLabel}>Ajo Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {wallet?.transactions?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubText}>Start saving today! 💪</Text>
        </View>
      ) : (
        wallet?.transactions?.map((tx: any) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={styles.txLeft}>
              <Text style={styles.txIcon}>{tx.type === 'CREDIT' ? '⬆️' : '⬇️'}</Text>
              <View>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }]}>
              {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#888', fontSize: 14 },
  name: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  walletCard: { backgroundColor: '#f5a623', margin: 16, borderRadius: 20, padding: 24 },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  walletBalance: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  walletSubLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  walletSubValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
  actionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center' },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 12, color: '#333', fontWeight: '600' },
  emptyState: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 4 },
  txCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txIcon: { fontSize: 24, marginRight: 12 },
  txDesc: { fontSize: 14, color: '#333', fontWeight: '600', maxWidth: 180 },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' }
})