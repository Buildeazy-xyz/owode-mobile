import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { walletAPI } from '../utils/api'
import { announcePayment } from '../utils/speech'
import { showPaymentNotification } from '../utils/notifications'


export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null)
  
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const announcedRef = useRef(false)
  const lastTxRef = useRef<string | null>(null)

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      setWallet(response.data.data)
      const latestTx = response.data.data?.transactions?.[0]
      if (latestTx && !announcedRef.current) {
        announcePayment({
          type: latestTx.type,
          amount: latestTx.amount,
          sender: latestTx.description?.includes('from') ?
            latestTx.description.split('from')[1]?.split('—')[0]?.trim() : undefined
        })
        announcedRef.current = true
      }
      // In loadWallet, after detecting new transaction:
      if (latestTx && latestTx.id !== lastTxRef.current) {
        lastTxRef.current = latestTx.id
        await showPaymentNotification({
          type: latestTx.type,
          amount: latestTx.amount,
          balance: latestTx.balance,
          sender: latestTx.description?.includes('from')
            ? latestTx.description.split('from')[1]?.split('—')[0]?.trim()
            : undefined
        })
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load wallet')
    }
  }
  

  useEffect(() => { loadWallet() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadWallet()
    setRefreshing(false)
  }


  const filteredTransactions = wallet?.transactions?.filter((tx: any) => {
    if (filter === 'ALL') return true
    return tx.type === filter
  })

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₦{wallet?.balance?.toLocaleString() || '0'}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Total Saved</Text>
              <Text style={styles.balanceStatValue}>₦{wallet?.totalSaved?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Total Sent</Text>
              <Text style={styles.balanceStatValue}>₦{wallet?.totalPayout?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* How to fund wallet info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>How to fund your wallet</Text>
          <Text style={styles.infoDesc}>Transfer money to your OWODE virtual account number. It will reflect here instantly once Providus integration is live.</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Transfer')}>
          <Text style={styles.actionBtnIcon}>💸</Text>
          <Text style={styles.actionBtnText}>Send Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Coming Soon', 'Bank withdrawal will be available after Providus integration!')}>
          <Text style={styles.actionBtnIcon}>🏦</Text>
          <Text style={styles.actionBtnText}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Ajo')}>
          <Text style={styles.actionBtnIcon}>🤝</Text>
          <Text style={styles.actionBtnText}>Ajo Groups</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction History */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Transaction History</Text>
        <View style={styles.filterRow}>
          {(['ALL', 'CREDIT', 'DEBIT'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredTransactions?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubText}>Your transaction history will appear here</Text>
        </View>
      ) : (
        filteredTransactions?.map((tx: any) => (
          <TouchableOpacity
            key={tx.id}
            style={styles.txCard}
            onPress={() => navigation.navigate('Receipt', { transaction: tx })}
          >
            <View style={[styles.txIconCircle, { backgroundColor: tx.type === 'CREDIT' ? '#e8f5e9' : '#ffebee' }]}>
              <Text style={styles.txIcon}>{tx.type === 'CREDIT' ? '⬆️' : '⬇️'}</Text>
            </View>
            <View style={styles.txMiddle}>
              <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
              <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
              <Text style={[styles.txStatus, { color: tx.status === 'SUCCESS' ? '#22c55e' : '#f5a623' }]}>
                {tx.status}
              </Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }]}>
                {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
              </Text>
              <Text style={styles.txBalance}>Bal: ₦{tx.balance.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30 },
  back: { color: '#f5a623', fontSize: 16, marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  balanceCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginVertical: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  balanceStat: { alignItems: 'center' },
  balanceStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  balanceStatValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  infoCard: { backgroundColor: '#e3f2fd', margin: 16, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  infoDesc: { fontSize: 12, color: '#555', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 8 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionBtnIcon: { fontSize: 28, marginBottom: 8 },
  actionBtnText: { fontSize: 12, color: '#0d47a1', fontWeight: '600', textAlign: 'center' },
  historyHeader: { marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff' },
  filterBtnActive: { backgroundColor: '#0d47a1' },
  filterBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 4, textAlign: 'center' },
  txCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  txIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIcon: { fontSize: 20 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 14, color: '#333', fontWeight: '600' },
  txDate: { fontSize: 11, color: '#888', marginTop: 2 },
  txStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  txBalance: { fontSize: 11, color: '#888', marginTop: 2 }
})