import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert, TextInput,
  Modal, Dimensions, Image
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { walletAPI, savingsAPI } from '../utils/api'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from '../components/BottomNav'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { announceNewCredit } from '../utils/speech'
import { showPaymentNotification } from '../utils/notifications'

const { width } = Dimensions.get('window')

const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (same(d, now)) return 'Today'
  if (same(d, y)) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'past' | 'upcoming'>('past')
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('MONTH')
  const [showFilter, setShowFilter] = useState(false)
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null)
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
      const lastNotified = await AsyncStorage.getItem('owode_last_notified_tx')
      if (latestTx && latestTx.id !== lastNotified) {
        await AsyncStorage.setItem('owode_last_notified_tx', latestTx.id)
        if (lastNotified !== null) await showPaymentNotification({
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

  const loadGoals = async () => {
    try {
      const res = await savingsAPI.getGoals()
      setGoals(res.data?.data || [])
    } catch {}
  }

  useEffect(() => { loadWallet(); loadGoals() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadWallet()
    setRefreshing(false)
  }

  const inPeriod = (tx: any) => {
    if (period === 'ALL') return true
    const d = new Date(tx.createdAt)
    const now = new Date()
    if (period === 'CUSTOM') {
      const dd = new Date(d); dd.setHours(0, 0, 0, 0)
      if (customStart) { const st = new Date(customStart); st.setHours(0, 0, 0, 0); if (dd < st) return false }
      if (customEnd) { const en = new Date(customEnd); en.setHours(0, 0, 0, 0); if (dd > en) return false }
      return true
    }
    if (period === 'WEEK') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
    if (period === 'MONTH') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (period === 'YEAR') return d.getFullYear() === now.getFullYear()
    return true
  }

  const UP_FREQ_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 }
  const upcoming = (goals || [])
    .filter((g: any) => g.status === 'ACTIVE' && g.autoDebitAmount > 0 && g.autoDebitFreq)
    .map((g: any) => {
      const days = UP_FREQ_DAYS[g.autoDebitFreq] || 7
      const next = g.lastAutoDebitAt
        ? new Date(g.lastAutoDebitAt).getTime() + days * 86400000
        : Date.now()
      const remaining = (g.goalAmount || 0) - (g.currentAmount || 0)
      if (remaining <= 0) return null
      if (next > new Date(g.targetDate).getTime()) return null
      return {
        id: g.id,
        title: g.title,
        amount: Math.min(g.autoDebitAmount, remaining),
        freq: String(g.autoDebitFreq).toLowerCase(),
        next,
        when: new Date(next).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.next - b.next)

  const activeFilterCount =
    (period === 'CUSTOM' && (customStart || customEnd) ? 1 : 0) + (filter !== 'ALL' ? 1 : 0)

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
        <LinearGradient colors={['#25427a', '#1c3a6d']} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color="#f5a623" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Wallet</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
                <Ionicons name="search" size={16} color="#9aa5b8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFilter(true)} style={styles.headerFilterBtn}>
                <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#f5a623' : '#9aa5b8'} />
                {activeFilterCount > 0 ? <View style={styles.filterDot} /> : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                <Ionicons name={balanceVisible ? "eye-outline" : "eye-off-outline"} size={19} color="rgba(255,255,255,0.8)" />
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

            {period === 'CUSTOM' && (customStart || customEnd) ? (
              <TouchableOpacity style={styles.rangePill} onPress={() => setShowFilter(true)} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={styles.rangePillText} numberOfLines={1}>
                  {customStart ? customStart.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Start'} - {customEnd ? customEnd.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'End'}
                </Text>
                <TouchableOpacity
                  onPress={() => { setPeriod('MONTH'); setCustomStart(null); setCustomEnd(null) }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={13} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ) : null}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel} numberOfLines={1}>Money In</Text>
                <Text style={[styles.statValue, { color: '#7CFFB2' }]}>{balanceVisible ? `₦${totalCredit.toLocaleString()}` : '••••'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel} numberOfLines={1}>Money Out</Text>
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
              <View style={styles.actionIconBg}>
                <Ionicons name='paper-plane' size={23} color='#385c9e' />
              </View>
              <Text style={styles.actionText} numberOfLines={1}>Send Money</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Savings')}
            >
              <View style={styles.actionIconBg}>
                <Ionicons name='wallet' size={23} color='#2e7d32' />
              </View>
              <Text style={styles.actionText} numberOfLines={1}>Savings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Coming Soon', 'Bank withdrawal will be available after Providus Bank integration!')}
            >
              <View style={styles.actionIconBg}>
                <Ionicons name='cash' size={23} color='#ef6c00' />
              </View>
              <Text style={styles.actionText} numberOfLines={1}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Ajo')}
            >
              <View style={styles.actionIconBg}>
                <Ionicons name='people' size={23} color='#7b1fa2' />
              </View>
              <Text style={styles.actionText} numberOfLines={1}>Ajo Groups</Text>
            </TouchableOpacity>
          </View>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="bulb-outline" size={16} color="#f5a623" />
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
                <Ionicons name="close-circle" size={16} color="#9aa5b8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Transaction History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Transaction History</Text>
            <Text style={styles.historyCount}>
              {activeTab === 'past'
                ? `${filteredTransactions?.length || 0} transactions`
                : `${upcoming.length} scheduled`}
            </Text>
          </View>

          <View style={styles.puTabRow}>
            {([['past', 'Past'], ['upcoming', 'Upcoming']] as const).map(([k, label]) => (
              <TouchableOpacity
                key={k}
                style={[styles.puTab, activeTab === k && styles.puTabActive]}
                onPress={() => setActiveTab(k)}
              >
                <Text style={[styles.puTabText, activeTab === k && styles.puTabTextActive]} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'past' ? (
          <>
          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {[
              { key: 'ALL', label: 'All', count: wallet?.transactions?.length || 0 },
              { key: 'CREDIT', label: 'In', count: wallet?.transactions?.filter((t: any) => t.type === 'CREDIT').length || 0 },
              { key: 'DEBIT', label: 'Out', count: wallet?.transactions?.filter((t: any) => t.type === 'DEBIT').length || 0 },
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
              <Ionicons name="receipt-outline" size={44} color="#9aa5b8" />
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
                const txDate = dayLabel(tx.createdAt)
                const prevDate = prevTx ? dayLabel(prevTx.createdAt) : null
                const showDate = isFirst || txDate !== prevDate

                return (
                  <View key={tx.id}>
                    {showDate && (
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{txDate}</Text>
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
                        <Ionicons name={getTxIcon(tx.description) as any} size={20} color={tx.type === 'CREDIT' ? '#22c55e' : '#ef4444'} />
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
                            {tx.status === 'SUCCESS' ? 'Success' : 'Pending'}
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
                        <Text style={styles.txBalance} numberOfLines={1}>
                          Bal: ₦{(tx.balance ?? 0).toLocaleString()}
                        </Text>
                        <Text style={styles.txArrow}>›</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}
          </>
          ) : upcoming.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={44} color="#9aa5b8" />
              <Text style={styles.emptyText}>No upcoming transactions</Text>
              <Text style={styles.emptySubText}>Scheduled auto-saves will appear here</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {upcoming.map((u: any) => (
                <View key={u.id} style={styles.upCard}>
                  <View style={styles.upIconCircle}>
                    <Ionicons name="time-outline" size={20} color="#7c8aa5" />
                  </View>
                  <View style={styles.txMiddle}>
                    <Text style={styles.upDesc} numberOfLines={1}>Auto-save \u2014 {u.title}</Text>
                    <Text style={styles.txTime}>{u.when} \u00b7 {u.freq}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.upAmount} numberOfLines={1}>\u20a6{u.amount.toLocaleString()}</Text>
                    <Text style={styles.upLabel} numberOfLines={1}>Scheduled</Text>
                  </View>
                </View>
              ))}
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
                <Ionicons name="close" size={22} color="#7c8aa5" />
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
                      {selectedTx.status === 'SUCCESS' ? 'Successful' : '⏳ Pending'}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Details */}
                <View style={styles.modalDetails}>
                  {[
                    { label: 'Type', value: selectedTx.type === 'CREDIT' ? 'Money In' : 'Money Out' },
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
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <View style={styles.fsBackdrop}>
          <View style={styles.fsSheet}>
            <View style={styles.fsHeader}>
              <Text style={styles.fsTitle} numberOfLines={1}>Filter transactions</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color="#7c8aa5" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
              <Text style={styles.fsLabel}>Date range</Text>
              <View style={styles.fsChipWrap}>
                {([['WEEK', 'This week'], ['MONTH', 'This month'], ['YEAR', 'This year'], ['ALL', 'All time'], ['CUSTOM', 'Custom']] as const).map(([k, label]) => (
                  <TouchableOpacity key={k} style={[styles.fsChip, period === k && styles.fsChipActive]} onPress={() => setPeriod(k)}>
                    <Text style={[styles.fsChipText, period === k && styles.fsChipTextActive]} numberOfLines={1}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {period === 'CUSTOM' ? (
                <View style={styles.fsDateRow}>
                  <TouchableOpacity style={styles.fsDateBox} onPress={() => setPickerFor('start')}>
                    <Text style={styles.fsDateLabel}>From</Text>
                    <Text style={styles.fsDateValue} numberOfLines={1}>
                      {customStart ? customStart.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fsDateBox} onPress={() => setPickerFor('end')}>
                    <Text style={styles.fsDateLabel}>To</Text>
                    <Text style={styles.fsDateValue} numberOfLines={1}>
                      {customEnd ? customEnd.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.fsLabel}>Transaction type</Text>
              <View style={styles.fsChipWrap}>
                {([['ALL', 'All'], ['CREDIT', 'Money in'], ['DEBIT', 'Money out']] as const).map(([k, label]) => (
                  <TouchableOpacity key={k} style={[styles.fsChip, filter === k && styles.fsChipActive]} onPress={() => setFilter(k)}>
                    <Text style={[styles.fsChipText, filter === k && styles.fsChipTextActive]} numberOfLines={1}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.fsFooter}>
              <TouchableOpacity
                style={styles.fsClear}
                onPress={() => { setPeriod('MONTH'); setFilter('ALL'); setCustomStart(null); setCustomEnd(null) }}
              >
                <Text style={styles.fsClearText} numberOfLines={1}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fsApply} onPress={() => setShowFilter(false)}>
                <Text style={styles.fsApplyText} numberOfLines={1}>
                  Apply filter{activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {pickerFor ? (
        <DateTimePicker
          value={(pickerFor === 'start' ? customStart : customEnd) || new Date()}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onChange={(event: any, d?: Date) => {
            const which = pickerFor
            setPickerFor(null)
            if (event?.type === 'set' && d) {
              if (which === 'start') setCustomStart(d)
              else setCustomEnd(d)
            }
          }}
        />
      ) : null}

      <BottomNav navigation={navigation} active="wallet" />
    </View>
  )
}

const styles = StyleSheet.create({
  actionText: { fontSize: 11, color: '#1a2b4a', fontWeight: '500', textAlign: 'center' },
  actionBtn: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  actionsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, paddingHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  dayHeader: { paddingTop: 18, paddingBottom: 8, paddingHorizontal: 2 },
  dayHeaderText: { fontSize: 12.5, fontWeight: '700', color: '#7c8aa5' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerFilterBtn: { marginLeft: 14 },
  filterDot: { position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: 4, backgroundColor: '#f5a623' },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8, minHeight: 28 },
  rangePillText: { flexShrink: 1, color: '#fff', fontSize: 11.5, fontWeight: '600' },
  fsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  fsSheet: { backgroundColor: '#fff', maxHeight: '80%' },
  fsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, minHeight: 56 },
  fsTitle: { flex: 1, flexShrink: 1, fontSize: 16, fontWeight: '700', color: '#1a2b4a' },
  fsLabel: { fontSize: 12, fontWeight: '600', color: '#7c8aa5', marginTop: 12, marginBottom: 10 },
  fsChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fsChip: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6ebf4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, minHeight: 38, justifyContent: 'center' },
  fsChipActive: { backgroundColor: '#25427a', borderColor: '#25427a' },
  fsChipText: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: '#25427a' },
  fsChipTextActive: { color: '#fff' },
  fsDateRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  fsDateBox: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6ebf4', borderRadius: 12, padding: 12, minHeight: 60 },
  fsDateLabel: { fontSize: 11, color: '#7c8aa5', marginBottom: 3 },
  fsDateValue: { flexShrink: 1, fontSize: 13.5, fontWeight: '600', color: '#1a2b4a' },
  fsFooter: { flexDirection: 'row', gap: 10, padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e6ebf4' },
  fsClear: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6ebf4', borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  fsClearText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#7c8aa5' },
  fsApply: { flex: 2, backgroundColor: '#25427a', borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  fsApplyText: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#fff' },
  periodRow: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 6 },
  periodPill: { flex: 1, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  periodPillActive: { backgroundColor: '#f5a623' },
  periodPillText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  periodPillTextActive: { color: '#fff', fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
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
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, textAlign: 'center' },
  statValue: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRowOld: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  actionBtnOld: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIconBg: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#eaf2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionIcon: { fontSize: 22 },
  actionTextOld: { fontSize: 11, color: '#25427a', fontWeight: '600' },
  infoCard: { backgroundColor: '#eaf2ff', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 20 },
  infoTitle: { fontSize: 13, fontWeight: 'bold', color: '#25427a', marginBottom: 2 },
  infoDesc: { fontSize: 11, color: '#7c8aa5', lineHeight: 16 },
  searchContainer: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a2b4a' },
  clearSearch: { padding: 8 },
  clearSearchText: { color: '#7c8aa5', fontSize: 16 },
  historySection: { marginTop: 16, paddingHorizontal: 16 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  puTabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  puTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', minHeight: 40 },
  puTabActive: { backgroundColor: '#25427a' },
  puTabText: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: '#7c8aa5' },
  puTabTextActive: { color: '#fff' },
  upCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderRadius: 14, padding: 11, marginBottom: 8, borderWidth: 1, borderColor: '#eef1f6', minHeight: 64 },
  upIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f4f6fb', alignItems: 'center', justifyContent: 'center' },
  upDesc: { flexShrink: 1, fontSize: 13.5, fontWeight: '600', color: '#7c8aa5' },
  upAmount: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#7c8aa5' },
  upLabel: { flexShrink: 1, fontSize: 10, color: '#9aa5b8' },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#1a2b4a' },
  historyCount: { fontSize: 12, color: '#7c8aa5' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterBtnActive: { backgroundColor: '#25427a' },
  filterBtnText: { fontSize: 13, color: '#7c8aa5', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  filterCount: { backgroundColor: '#f0f2f7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterCountText: { fontSize: 10, color: '#7c8aa5', fontWeight: 'bold' },
  filterCountTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#1a2b4a', marginBottom: 4 },
  emptySubText: { fontSize: 13, color: '#7c8aa5', textAlign: 'center' },
  txList: { gap: 8 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#e6eaf2' },
  dateText: { fontSize: 11, color: '#7c8aa5', fontWeight: '600' },
  txCard: { backgroundColor: '#fff', borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  txIconCircle: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txIcon: { fontSize: 22 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 14, color: '#1a2b4a', fontWeight: '600', marginBottom: 2 },
  txTime: { fontSize: 11, color: '#9aa5b8', marginBottom: 4 },
  txStatusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  txStatusText: { fontSize: 10, fontWeight: '600' },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  txBalance: { fontSize: 10, color: '#9aa5b8', textAlign: 'right' },
  txArrow: { fontSize: 18, color: '#9aa5b8', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#25427a' },
  modalClose: { fontSize: 20, color: '#7c8aa5', padding: 4 },
  modalAmountCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  modalAmountIcon: { fontSize: 40, marginBottom: 8 },
  modalAmount: { fontSize: 36, fontWeight: 'bold', marginBottom: 10 },
  modalStatusBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  modalStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  modalDetails: { backgroundColor: '#f4f6fb', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  modalDetailLabel: { fontSize: 13, color: '#7c8aa5' },
  modalDetailValue: { fontSize: 13, fontWeight: '600', color: '#1a2b4a', maxWidth: '60%', textAlign: 'right' },
  modalDivider: { height: 1, backgroundColor: '#f0f2f7' },
  modalCloseBtn: { backgroundColor: '#25427a', borderRadius: 14, padding: 16, alignItems: 'center' },
  modalCloseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
