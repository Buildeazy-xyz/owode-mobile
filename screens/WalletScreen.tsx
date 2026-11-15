import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert, TextInput,
  Modal, Dimensions, Image, Platform} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { walletAPI, savingsAPI } from '../utils/api'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Print from 'expo-print'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F, ds, tnum } from '../constants/theme'
import { naira, splitNaira } from '../utils/ajoDue'
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
  const insets = useSafeAreaInsets()
  const [wallet, setWallet] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'past' | 'upcoming'>('past')
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('ALL')
  const [showFilter, setShowFilter] = useState(false)
  const [customStart, setCustomStart] = useState<Date | null>(null)
  const [customEnd, setCustomEnd] = useState<Date | null>(null)
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null)
  const announcedRef = useRef(false)
  const lastTxRef = useRef<string | null>(null)

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getTransactions()
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
    } catch (e: any) {
      // A dropped connection is the customer's network, not our platform.
      const offline = !e?.response
      Alert.alert(
        offline ? 'No Internet Connection' : 'Could Not Load',
        offline
          ? 'No internet connection. Pull down to refresh.'
          : 'We could not load your wallet just now. Pull down to try again.'
      )
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

  const handleExport = () => {
    if (!filteredTransactions?.length) {
      Alert.alert('Nothing to export', 'No transactions match the current filter.')
      return
    }
    Alert.alert('Download statement', 'Choose a format', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CSV', onPress: () => doExport('csv') },
      { text: 'PDF', onPress: () => doExport('pdf') }
    ])
  }

  const doExport = async (kind: 'csv' | 'pdf') => {
    try {
      const stamp = new Date().toISOString().slice(0, 10)
      const name = 'owode-statement-' + stamp + '.' + kind
      const mime = kind === 'pdf' ? 'application/pdf' : 'text/csv'
      let target: string | null = null

      if (Platform.OS === 'android') {
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Choose a folder to save your statement.')
          return
        }
        target = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, name, mime)
      }

      if (kind === 'csv') {
        const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
        const csv = [
          ['Date', 'Description', 'Type', 'Amount', 'Balance', 'Reference', 'Status'].join(','),
          ...filteredTransactions.map((t: any) => [
            esc(new Date(t.createdAt).toLocaleString('en-NG')),
            esc(t.description), esc(t.type), esc(t.amount),
            esc(t.balance ?? ''), esc(t.reference), esc(t.status)
          ].join(','))
        ].join('\n')

        if (target) {
          await FileSystem.writeAsStringAsync(target, csv, { encoding: FileSystem.EncodingType.UTF8 })
          Alert.alert('Statement saved', name + ' is in the folder you chose.')
          return
        }
        const uri = FileSystem.documentDirectory + name
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 })
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: mime })
        return
      }

      const money = (v: any) => '₦' + Number(v || 0).toLocaleString()
      const rows = filteredTransactions.map((t: any) => (
        '<tr>' +
        '<td>' + new Date(t.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) + '</td>' +
        '<td>' + String(t.description || '').replace(/</g, '&lt;') + '</td>' +
        '<td class="' + (t.type === 'CREDIT' ? 'cr' : 'dr') + '">' + (t.type === 'CREDIT' ? '+' : '-') + money(t.amount) + '</td>' +
        '<td class="bal">' + money(t.balance) + '</td>' +
        '</tr>'
      )).join('')

      const html =
        '<html><head><meta charset="utf-8"><style>' +
        'body{font-family:Helvetica,Arial,sans-serif;color:#1a2b4a;padding:28px}' +
        '.hd{background:#25427a;color:#fff;padding:20px 22px;border-radius:12px}' +
        '.hd h1{margin:0;font-size:20px}.hd p{margin:4px 0 0;font-size:12px;opacity:.75}' +
        '.sum{display:flex;gap:12px;margin:18px 0}' +
        '.sum div{flex:1;background:#f4f6fb;border-radius:10px;padding:12px}' +
        '.sum span{display:block;font-size:11px;color:#7c8aa5}' +
        '.sum b{font-size:16px}' +
        'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}' +
        'th{text-align:left;color:#7c8aa5;font-size:11px;border-bottom:2px solid #e6ebf4;padding:8px 6px}' +
        'td{padding:9px 6px;border-bottom:1px solid #f0f2f7}' +
        '.cr{color:#22c55e;font-weight:bold}.dr{color:#ef4444;font-weight:bold}' +
        '.bal{color:#7c8aa5}' +
        '.ft{margin-top:22px;font-size:10px;color:#9aa5b8;text-align:center}' +
        '</style></head><body>' +
        '<div class="hd"><h1>OWODE Alajo — Account Statement</h1>' +
        '<p>Generated ' + new Date().toLocaleString('en-NG') + '</p></div>' +
        '<div class="sum">' +
        '<div><span>Money in</span><b>' + money(totalCredit) + '</b></div>' +
        '<div><span>Money out</span><b>' + money(totalDebit) + '</b></div>' +
        '<div><span>Transactions</span><b>' + filteredTransactions.length + '</b></div>' +
        '</div>' +
        '<table><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance</th></tr>' +
        rows + '</table>' +
        '<div class="ft">Owode Digital Services Limited · support@owodealajo.com</div>' +
        '</body></html>'

      const printed = await Print.printToFileAsync({ html })
      if (target) {
        const b64 = await FileSystem.readAsStringAsync(printed.uri, { encoding: FileSystem.EncodingType.Base64 })
        await FileSystem.writeAsStringAsync(target, b64, { encoding: FileSystem.EncodingType.Base64 })
        Alert.alert('Statement saved', name + ' is in the folder you chose.')
        return
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(printed.uri, { mimeType: mime })
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not create the statement')
    }
  }

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
    if (d.includes('transfer to')) return 'arrow-up'
    if (d.includes('transfer from')) return 'arrow-down'
    if (d.includes('transfer')) return 'swap-horizontal'
    if (d.includes('savings')) return 'wallet'
    if (d.includes('welcome')) return 'gift'
    if (d.includes('withdrawal')) return 'arrow-down-circle'
    return 'cash'
  }

  // ─── OWODE Alajo Redesign "Wallet" board ─────────────────────────────
  const periodWord =
    period === 'WEEK' ? 'this week'
    : period === 'MONTH' ? new Date().toLocaleDateString('en-NG', { month: 'short' })
    : period === 'YEAR' ? String(new Date().getFullYear())
    : period === 'ALL' ? 'all time'
    : 'custom'
  const bal = splitNaira(wallet?.balance || 0)
  const hhmm = (iso: string) => {
    const d = new Date(iso); const h = d.getHours()
    return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
  }
  const groups: { label: string; items: any[] }[] = []
  filteredTransactions.forEach((tx: any) => {
    const label = dayLabel(tx.createdAt)
    const g = groups.find(x => x.label === label)
    if (g) g.items.push(tx)
    else groups.push({ label, items: [tx] })
  })
  const chipKeys: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All' }, { key: 'CREDIT', label: 'Money in' },
    { key: 'DEBIT', label: 'Money out' }, { key: 'UP', label: 'Upcoming' },
  ]
  const chipOn = (k: string) => k === 'UP' ? activeTab === 'upcoming' : activeTab === 'past' && filter === k
  const txLook = (tx: any) => {
    const credit = tx.type === 'CREDIT'
    const d = (tx.description || '').toLowerCase()
    if (credit) return { icon: 'receive' as const, bg: ds.blueSoft, fg: ds.navy }
    if (d.includes('ajo')) return { icon: 'ajo' as const, bg: ds.goldSoft, fg: ds.goldInk }
    if (/sav|goal/.test(d)) return { icon: 'savings' as const, bg: ds.goldSoft, fg: ds.goldInk }
    return { icon: 'send' as const, bg: ds.divider, fg: ds.inkSoft }
  }

  return (
    <View style={w.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 110, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.navy} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={w.rowBetween}>
          <Text style={w.h1}>Wallet</Text>
          <TouchableOpacity style={w.roundBtn} onPress={handleExport} accessibilityLabel="Download statement">
            <Icon name="download" size={20} color={ds.ink} />
          </TouchableOpacity>
        </View>

        <View style={w.hero}>
          <View style={w.rowBetween}>
            <Text style={w.heroLabel}>Available balance</Text>
            <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)} style={{ padding: 4 }}
              accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}>
              <Icon name={balanceVisible ? 'eye' : 'eyeOff'} size={18} color={ds.onHero} />
            </TouchableOpacity>
          </View>
          <View style={w.balRow}>
            <Text style={w.balSym}>₦</Text>
            <Text style={w.balWhole}>{balanceVisible ? bal.whole : '••••••'}</Text>
            {balanceVisible ? <Text style={w.balSym}>{bal.kobo}</Text> : null}
          </View>
          <View style={w.heroLine} />
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={w.statLabel} numberOfLines={1}>Money in · {periodWord}</Text>
              <Text style={w.statValue}>{balanceVisible ? naira(totalCredit) : '••••'}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={w.statLabel} numberOfLines={1}>Money out · {periodWord}</Text>
              <Text style={w.statValue}>{balanceVisible ? naira(totalDebit) : '••••'}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[w.btn, { backgroundColor: ds.gold }]} activeOpacity={0.85}
            onPress={() => navigation.navigate('AddMoney', { accountName: '' })}>
            <Icon name="plus" size={18} color={ds.hero} width={2.2} />
            <Text style={[w.btnText, { color: ds.hero, fontFamily: F.x }]}>Add money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[w.btn, { backgroundColor: ds.navy }]} activeOpacity={0.85}
            onPress={() => navigation.navigate('Transfer')}>
            <Icon name="send" size={18} color="#ffffff" width={2} />
            <Text style={[w.btnText, { color: '#ffffff' }]}>Send</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={w.search}>
            <Icon name="search" size={18} color={ds.muted} />
            <TextInput
              style={w.searchInput}
              placeholder="Search transactions"
              placeholderTextColor="#9aa5b8"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={16} color={ds.muted} width={2} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={w.roundBtn} onPress={() => setShowFilter(true)} accessibilityLabel="Filter by date">
            <Icon name="filter" size={20} color={activeFilterCount > 0 ? ds.navy : ds.ink} width={activeFilterCount > 0 ? 2.4 : 1.8} />
            {activeFilterCount > 0 ? <View style={w.dot} /> : null}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {chipKeys.map(c => {
            const on = chipOn(c.key)
            return (
              <TouchableOpacity
                key={c.key}
                style={[w.chip, on && w.chipOn]}
                onPress={() => {
                  if (c.key === 'UP') setActiveTab('upcoming')
                  else { setActiveTab('past'); setFilter(c.key as any) }
                }}
              >
                <Text style={[w.chipText, on && w.chipTextOn]}>{c.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {period === 'CUSTOM' && (customStart || customEnd) ? (
          <TouchableOpacity style={w.range} onPress={() => setShowFilter(true)} activeOpacity={0.8}>
            <Icon name="calendar" size={14} color={ds.navy} width={2} />
            <Text style={w.rangeText} numberOfLines={1}>
              {customStart ? customStart.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'Start'} – {customEnd ? customEnd.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : 'End'}
            </Text>
            <TouchableOpacity onPress={() => { setPeriod('ALL'); setCustomStart(null); setCustomEnd(null) }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={14} color={ds.navy} width={2} />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : null}

        {activeTab === 'past' ? (
          groups.length === 0 ? (
            <View style={w.empty}>
              <Text style={w.emptyTitle}>No transactions found</Text>
              <Text style={w.emptySub}>{search ? 'Try a different search' : `Nothing ${periodWord === 'all time' ? 'yet' : 'for ' + periodWord}. Try another date range.`}</Text>
            </View>
          ) : groups.map(g => (
            <View key={g.label} style={{ gap: 10 }}>
              <Text style={w.day}>{g.label.toUpperCase()}</Text>
              <View style={w.list}>
                {g.items.map((tx: any, i: number) => {
                  const look = txLook(tx)
                  const credit = tx.type === 'CREDIT'
                  return (
                    <TouchableOpacity key={tx.id} style={[w.tx, i < g.items.length - 1 && w.txLine]}
                      onPress={() => setSelectedTx(tx)} activeOpacity={0.7}>
                      <View style={[w.tile, { backgroundColor: look.bg }]}>
                        <Icon name={look.icon} size={18} color={look.fg} width={2} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={w.txTitle} numberOfLines={1}>{tx.description}</Text>
                        <Text style={w.txSub} numberOfLines={1}>
                          {hhmm(tx.createdAt)}{tx.status !== 'SUCCESS' ? ' · Pending' : ''}
                        </Text>
                      </View>
                      <Text style={w.txAmt}>{balanceVisible ? `${credit ? '+' : '−'}${naira(tx.amount)}` : '••••'}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))
        ) : upcoming.length === 0 ? (
          <View style={w.empty}>
            <Text style={w.emptyTitle}>Nothing scheduled</Text>
            <Text style={w.emptySub}>Auto-saves you set up on a goal will show here</Text>
          </View>
        ) : (
          <View style={w.list}>
            {upcoming.map((u: any, i: number) => (
              <View key={u.id} style={[w.tx, i < upcoming.length - 1 && w.txLine]}>
                <View style={[w.tile, { backgroundColor: ds.goldSoft }]}>
                  <Icon name="calendar" size={18} color={ds.goldInk} width={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={w.txTitle} numberOfLines={1}>Auto-save · {u.title}</Text>
                  <Text style={w.txSub} numberOfLines={1}>{u.when} · {u.freq}</Text>
                </View>
                <Text style={w.txAmt}>{naira(u.amount)}</Text>
              </View>
            ))}
          </View>
        )}
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
                onPress={() => { setPeriod('ALL'); setFilter('ALL'); setCustomStart(null); setCustomEnd(null) }}
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

const w = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.bg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: 24, lineHeight: 29, color: ds.ink, fontFamily: F.x },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: ds.gold, borderWidth: 2, borderColor: '#ffffff' },
  hero: { backgroundColor: ds.hero, borderRadius: 22, padding: 20, gap: 16 },
  heroLabel: { fontSize: 13, lineHeight: 16, color: ds.onHero, fontFamily: F.r },
  balRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  balSym: { fontSize: 20, lineHeight: 24, color: ds.onHero, fontFamily: F.b, ...tnum },
  balWhole: { fontSize: 34, lineHeight: 41, color: '#ffffff', fontFamily: F.x, letterSpacing: -0.5, ...tnum },
  heroLine: { height: 1, backgroundColor: ds.heroLine },
  statLabel: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
  statValue: { fontSize: 16, lineHeight: 20, color: '#ffffff', fontFamily: F.x, ...tnum },
  btn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 15, lineHeight: 18, fontFamily: F.x },
  search: { flex: 1, height: 44, borderRadius: 14, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: ds.ink, fontFamily: F.s, paddingVertical: 0 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: ds.hero, borderColor: ds.hero },
  chipText: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.s },
  chipTextOn: { color: '#ffffff', fontFamily: F.x },
  range: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: ds.blueSoft, borderRadius: 12, paddingHorizontal: 12, height: 34 },
  rangeText: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b },
  day: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6, paddingHorizontal: 4 },
  list: { backgroundColor: ds.card, borderRadius: 18, borderWidth: 1, borderColor: ds.border, overflow: 'hidden' },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  txLine: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  txSub: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  txAmt: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x, ...tnum },
  empty: { backgroundColor: ds.card, borderRadius: 18, borderWidth: 1, borderColor: ds.border, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  emptySub: { fontSize: 13, lineHeight: 19, color: ds.muted, fontFamily: F.r, textAlign: 'center' },
})
