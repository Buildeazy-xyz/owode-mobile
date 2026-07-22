import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert, TextInput,
  Modal, Dimensions, Image
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { walletAPI } from '../utils/api'
import { Ionicons } from '@expo/vector-icons'
import { announceNewCredit } from '../utils/speech'
import { showPaymentNotification } from '../utils/notifications'

const { width } = Dimensions.get('window')

export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('MONTH')
  const announcedRef = useRef(false)
  const lastTxRef = useRef<string | null>(null)

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      setWallet(response.data.data)
      const latestTx = response.data.data?.transactions?.[0]
      if (latestTx && latestTx.type === 'CREDIT') {
        announceNewCredit(latestTx.id)
      }
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
    } catch {
      Alert.alert('Error', 'Could not load wallet')
    }
  }

  useEffect(() => { loadWallet() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadWallet()
    setRefreshing(false)
  }

  const inPeriod = (tx: any) => {
    if (period === 'ALL') return true
    const d = new Date(tx.createdAt)
    const now = new Date()
    if (period === 'WEEK') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
    if (period === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (period === 'YEAR') return d.getFullYear() === now.getFullYear()
    return true
  }

  const periodTx = wallet?.transactions?.filter(inPeriod) || []

  const filteredTransactions = periodTx.filter((tx: any) => {
    const matchFilter = filter === 'ALL' || tx.type === filter
    const matchSearch = !search ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalCredit = periodTx
    .filter((tx: any) => tx.type === 'CREDIT')
    .reduce((sum: number, tx: any) => sum + tx.amount, 0)

  const totalDebit = periodTx
    .filter((tx: any) => tx.type === 'DEBIT')
    .reduce((sum: number, tx: any) => sum + tx.amount, 0)

  const getTxIcon = (description: string) => {
    const d = description?.toLowerCase() || ''
    if (d.includes('ajo')) return 'people'
    if (d.includes('transfer')) return 'swap-horizontal'
    if (d.includes('savings')) return 'wallet'
    if (d.includes('welcome')) return 'gift'
    if (d.includes('withdrawal')) return 'arrow-down-circle'
    return 'cash'
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Wallet</Text>
            <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                <Text style={styles.eyeIcon}>{balanceVisible ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {balanceVisible ? `₦${(wallet?.balance || 0).toLocaleString()}` : '₦ ••••••'}
            </Text>

            {/* Period Selector */}
            <View style={styles.periodRow}>
              {(['WEEK','MONTH','YEAR','ALL'] as const).map((k) => (
                <TouchableOpacity key={k} onPress={() => setPeriod(k)} style={[styles.periodPill, period === k && styles.periodPillActive]}>
                  <Text style={[styles.periodPillText, period === k && styles.periodPillTextActive]}>
                    {k === 'WEEK' ? 'Week' : k === 'MONTH' ? 'Month' : k === 'YEAR' ? 'Year' : 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Money In</Text>
                <Text style={[styles.statValue, { color: '#7CFFB2' }]}>{balanceVisible ? `₦${totalCredit.toLocaleString()}` : '••••'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Money Out</Text>
                <Text style={[styles.statValue, { color: '#FF9E9E' }]}>{balanceVisible ? `₦${totalDebit.toLocaleString()}` : '••••'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

       {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Transfer')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name='paper-plane' size={23} color='#1565c0' />
              </View>
              <Text style={styles.actionText}>Send Money</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Savings')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name='wallet' size={23} color='#2e7d32' />
              </View>
              <Text style={styles.actionText}>Savings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Coming Soon', 'Bank withdrawal will be available after Providus Bank integration!')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name='cash' size={23} color='#ef6c00' />
              </View>
              <Text style={styles.actionText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Ajo')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name='people' size={23} color='#7b1fa2' />
              </View>
              <Text style={styles.actionText}>Ajo Groups</Text>
            </TouchableOpacity>
          </View>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>How to fund your wallet</Text>
            <Text style={styles.infoDesc}>
              Bank deposit via Providus Bank coming soon! You'll be able to fund your wallet instantly.
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearch}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Transaction History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Transaction History</Text>
            <Text style={styles.historyCount}>
              {filteredTransactions?.length || 0} transactions
            </Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {[
              { key: 'ALL', label: 'All', count: wallet?.transactions?.length || 0 },
              { key: 'CREDIT', label: '⬆️ In', count: wallet?.transactions?.filter((t: any) => t.type === 'CREDIT').length || 0 },
              { key: 'DEBIT', label: '⬇️ Out', count: wallet?.transactions?.filter((t: any) => t.type === 'DEBIT').length || 0 },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                onPress={() => setFilter(f.key as any)}
              >
                <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>
                    {f.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction List */}
          {!filteredTransactions?.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubText}>
                {search ? 'Try a different search term' : 'Your transactions will appear here'}
              </Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {filteredTransactions.map((tx: any, index: number) => {
                const isFirst = index === 0
                const prevTx = filteredTransactions[index - 1]
                const txDate = new Date(tx.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })
                const prevDate = prevTx ? new Date(prevTx.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric'
                }) : null
                const showDate = isFirst || txDate !== prevDate

                return (
                  <View key={tx.id}>
                    {showDate && (
                      <View style={styles.dateHeader}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{txDate}</Text>
                        <View style={styles.dateLine} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.txCard}
                      onPress={() => setSelectedTx(tx)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.txIconCircle,
                        { backgroundColor: tx.type === 'CREDIT' ? '#e8f5e9' : '#ffebee' }
                      ]}>
                        <Ionicons name={getTxIcon(tx.description) as any} size={20} color={tx.type === 'CREDIT' ? '#2e7d32' : '#c62828'} />
                      </View>
                      <View style={styles.txMiddle}>
                        <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                        <Text style={styles.txTime}>
                          {new Date(tx.createdAt).toLocaleTimeString('en-NG', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </Text>
                        <View style={[
                          styles.txStatusBadge,
                          { backgroundColor: tx.status === 'SUCCESS' ? '#e8f5e9' : '#fff3e0' }
                        ]}>
                          <Text style={[
                            styles.txStatusText,
                            { color: tx.status === 'SUCCESS' ? '#22c55e' : '#f5a623' }
                          ]}>
                            {tx.status === 'SUCCESS' ? '✅ Success' : '⏳ Pending'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[
                          styles.txAmount,
                          { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }
                        ]}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </Text>
                        <Text style={styles.txBalance}>
                          Bal: ₦{tx.balance.toLocaleString()}
                        </Text>
                        <Text style={styles.txArrow}>›</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide" onRequestClose={() => setSelectedTx(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <>
                {/* Amount */}
                <LinearGradient
                  colors={selectedTx.type === 'CREDIT' ? ['#e8f5e9', '#c8e6c9'] : ['#ffebee', '#ffcdd2']}
                  style={styles.modalAmountCard}
                >
                  <Text style={styles.modalAmountIcon}>
                    {getTxIcon(selectedTx.description)}
                  </Text>
                  <Text style={[
                    styles.modalAmount,
                    { color: selectedTx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }
                  ]}>
                    {selectedTx.type === 'CREDIT' ? '+' : '-'}₦{selectedTx.amount.toLocaleString()}
                  </Text>
                  <View style={[
                    styles.modalStatusBadge,
                    { backgroundColor: selectedTx.status === 'SUCCESS' ? '#22c55e' : '#f5a623' }
                  ]}>
                    <Text style={styles.modalStatusText}>
                      {selectedTx.status === 'SUCCESS' ? '✅ Successful' : '⏳ Pending'}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Details */}
                <View style={styles.modalDetails}>
                  {[
                    { label: 'Type', value: selectedTx.type === 'CREDIT' ? '⬆️ Money In' : '⬇️ Money Out' },
                    { label: 'Description', value: selectedTx.description },
                    { label: 'Balance After', value: `₦${selectedTx.balance?.toLocaleString()}` },
                    { label: 'Reference', value: selectedTx.reference },
                    { label: 'Date', value: new Date(selectedTx.createdAt).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                    { label: 'Time', value: new Date(selectedTx.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
                  ].map((item, i) => (
                    <View key={item.label}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>{item.label}</Text>
                        <Text style={styles.modalDetailValue} numberOfLines={2}>{item.value}</Text>
                      </View>
                      {i < 5 && <View style={styles.modalDivider} />}
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedTx(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 6 },
  periodPill: { flex: 1, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  periodPillActive: { backgroundColor: '#f5a623' },
  periodPillText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  periodPillTextActive: { color: '#fff', fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 56, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  back: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchIcon: { fontSize: 20 },
  balanceCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 20 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  eyeIcon: { fontSize: 18 },
  balanceAmount: { color: '#fff', fontSize: 38, fontWeight: 'bold', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionIcon: { fontSize: 22 },
  actionText: { fontSize: 11, color: '#0d47a1', fontWeight: '600' },
  infoCard: { backgroundColor: '#e3f2fd', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 20 },
  infoTitle: { fontSize: 13, fontWeight: 'bold', color: '#0d47a1', marginBottom: 2 },
  infoDesc: { fontSize: 11, color: '#555', lineHeight: 16 },
  searchContainer: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#333' },
  clearSearch: { padding: 8 },
  clearSearchText: { color: '#888', fontSize: 16 },
  historySection: { marginTop: 16, paddingHorizontal: 16 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  historyCount: { fontSize: 12, color: '#888' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterBtnActive: { backgroundColor: '#0d47a1' },
  filterBtnText: { fontSize: 13, color: '#888', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  filterCount: { backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterCountText: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  filterCountTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  emptySubText: { fontSize: 13, color: '#888', textAlign: 'center' },
  txList: { gap: 8 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dateText: { fontSize: 11, color: '#888', fontWeight: '600' },
  txCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  txIconCircle: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txIcon: { fontSize: 22 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', marginBottom: 2 },
  txTime: { fontSize: 11, color: '#aaa', marginBottom: 4 },
  txStatusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  txStatusText: { fontSize: 10, fontWeight: '600' },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  txBalance: { fontSize: 10, color: '#aaa' },
  txArrow: { fontSize: 18, color: '#ccc', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  modalClose: { fontSize: 20, color: '#888', padding: 4 },
  modalAmountCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  modalAmountIcon: { fontSize: 40, marginBottom: 8 },
  modalAmount: { fontSize: 36, fontWeight: 'bold', marginBottom: 10 },
  modalStatusBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  modalStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  modalDetails: { backgroundColor: '#f9f9f9', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  modalDetailLabel: { fontSize: 13, color: '#888' },
  modalDetailValue: { fontSize: 13, fontWeight: '600', color: '#333', maxWidth: '60%', textAlign: 'right' },
  modalDivider: { height: 1, backgroundColor: '#f0f0f0' },
  modalCloseBtn: { backgroundColor: '#0d47a1', borderRadius: 14, padding: 16, alignItems: 'center' },
  modalCloseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
