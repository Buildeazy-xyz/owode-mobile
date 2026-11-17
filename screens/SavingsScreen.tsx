import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl,
  TextInput, Dimensions
, KeyboardAvoidingView, Platform, Modal, Switch} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from '../components/BottomNav'
import { savingsAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import PinKeypad from '../components/PinKeypad'
import { LineChart, ProgressChart } from 'react-native-chart-kit'
import OwodeLoader from '../components/OwodeLoader'
import Icon from '../components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F, ds, tnum } from '../constants/theme'
import { naira, commas } from '../utils/ajoDue'
import { TopBar, Card, Field, Btn, Eyebrow, Note, ui } from '../components/ui'

const { width } = Dimensions.get('window')

const GOAL_CATEGORIES = [
  { ion: 'phone-portrait-outline', label: 'Gadget' },
  { ion: 'home-outline', label: 'House' },
  { ion: 'car-outline', label: 'Car' },
  { ion: 'airplane-outline', label: 'Travel' },
  { ion: 'school-outline', label: 'Education' },
  { ion: 'heart-outline', label: 'Wedding' },
  { ion: 'medkit-outline', label: 'Medical' },
  { ion: 'briefcase-outline', label: 'Business' },
  { ion: 'gift-outline', label: 'Gift' },
  { ion: 'wallet-outline', label: 'General' },
]

export default function SavingsScreen({ navigation }: any) {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [screen, setScreen] = useState<'list' | 'create' | 'deposit' | 'analytics'>('list')
  const [selectedGoal, setSelectedGoal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'goals' | 'analytics'>('goals')

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [initialDeposit, setInitialDeposit] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [autoDebitOn, setAutoDebitOn] = useState(false)
  const [autoDebitFreq, setAutoDebitFreq] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateChip, setDateChip] = useState('')
  const [tempDate, setTempDate] = useState(new Date())
  const [selectedCategory, setSelectedCategory] = useState(GOAL_CATEGORIES[9])
  const [depositAmount, setDepositAmount] = useState('')
  const [pinAction, setPinAction] = useState<null | { type: 'deposit' | 'withdraw'; goal?: any }>(null)
  const isProcessing = useRef(false)

  const daysToTarget = targetDate
    ? Math.max(1, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000))
    : 0
  const perDaySave = goalAmount && daysToTarget ? Math.ceil(Number(goalAmount) / daysToTarget) : 0

  const autoDebitPeriods = (() => {
    if (!targetDate || !autoDebitFreq) return 0
    const days = Math.max(1, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000))
    if (autoDebitFreq === 'DAILY') return days
    if (autoDebitFreq === 'WEEKLY') return Math.max(1, Math.ceil(days / 7))
    return Math.max(1, Math.ceil(days / 30))
  })()
  const autoDebitRemaining = Math.max(0, Number(goalAmount || 0) - Number(initialDeposit || 0))
  const autoDebitCalc = autoDebitOn && autoDebitPeriods ? Math.ceil(autoDebitRemaining / autoDebitPeriods) : 0

  const loadGoals = async () => {
    try {
      const response = await savingsAPI.getGoals()
      setGoals(response.data.data)
    } catch {
      console.log('Could not load savings goals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGoals() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadGoals()
    setRefreshing(false)
  }

  const PLAN_TEMPLATES = [
    { title: 'Daily Starter', icon: 'leaf-outline', perDay: 300, days: 30, target: 9000, sub: '₦9,000 in 30 days' },
    { title: 'Steady Saver', icon: 'trending-up-outline', perDay: 500, days: 30, target: 15000, sub: '₦15,000 in 30 days' },
    { title: 'House rent Target', icon: 'home-outline', perDay: 1000, days: 365, target: 365000, sub: '₦365,000 in a year' },
    { title: 'Big Goal', icon: 'rocket-outline', perDay: 2000, days: 365, target: 730000, sub: '₦730,000 in a year' },
  ]

  const applyTemplate = (t: any) => {
    const d = new Date()
    d.setDate(d.getDate() + t.days)
    setTitle(t.title)
    setGoalAmount(String(t.target))
    setTargetDate(d.toISOString().split('T')[0])
    setDateChip('Custom')
    setInitialDeposit('')
    setAutoDebitOn(true)
    setAutoDebitFreq('DAILY')
    setScreen('create')
  }

  const handleCreate = async () => {
    if (autoDebitOn && !autoDebitFreq) {
      Alert.alert('Choose a frequency', 'Select daily, weekly or monthly for auto-save')
      return
    }
    if (!title || !goalAmount || !targetDate) {
      Alert.alert('Error', 'Title, goal amount and target date are required')
      return
    }
    try {
      setSaving(true)
      await savingsAPI.createGoal({
        title: title.trim(),
        description,
        goalAmount: Number(goalAmount),
        initialDeposit: initialDeposit ? Number(initialDeposit) : undefined,
        autoDebitAmount: autoDebitOn && autoDebitCalc > 0 ? autoDebitCalc : undefined,
        autoDebitFreq: autoDebitOn && autoDebitFreq ? autoDebitFreq : undefined,
        targetDate
      })
      Alert.alert('Goal Created!', 'Your savings goal has been created!')
      setScreen('list')
      setTitle(''); setDescription(''); setGoalAmount('')
      setInitialDeposit(''); setTargetDate(''); setAutoDebitOn(false); setAutoDebitFreq('')
      setSelectedCategory(GOAL_CATEGORIES[9])
      await loadGoals()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDeposit = async () => {
    if (!user?.hasTransactionPin) {
      Alert.alert(
        'Set your PIN first',
        'You need a 4-digit transaction PIN before you can do this.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => navigation.navigate('SetTransactionPin') }
        ]
      )
      return
    }
    if (!depositAmount || Number(depositAmount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount')
      return
    }
    setPinAction({ type: 'deposit' })
  }

  const executeDeposit = async (transactionPin: string) => {
    if (isProcessing.current) return
    isProcessing.current = true
    try {
      setSaving(true)
      const response = await savingsAPI.deposit(selectedGoal.id, Number(depositAmount), transactionPin)
      setPinAction(null)
      Alert.alert('Deposited!', response.data.message)
      setScreen('list')
      setDepositAmount('')
      await loadGoals()
    } catch (error: any) {
      setPinAction(null)
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
      isProcessing.current = false
    }
  }

  const executeWithdraw = async (transactionPin: string) => {
    const goal = pinAction?.goal
    if (!goal) { setPinAction(null); return }
    if (isProcessing.current) return
    isProcessing.current = true
    try {
      setSaving(true)
      const response = await savingsAPI.withdraw(goal.id, transactionPin)
      setPinAction(null)
      Alert.alert('Withdrawn!', response.data.message)
      await loadGoals()
    } catch (error: any) {
      setPinAction(null)
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
      isProcessing.current = false
    }
  }

  const handleWithdraw = async (goal: any) => {
    if (!user?.hasTransactionPin) {
      Alert.alert(
        'Set your PIN first',
        'You need a 4-digit transaction PIN before you can do this.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set PIN', onPress: () => navigation.navigate('SetTransactionPin') }
        ]
      )
      return
    }
    const isEarly = new Date() < new Date(goal.targetDate)
    Alert.alert(
      isEarly ? 'Early Withdrawal' : 'Withdraw Savings',
      isEarly
        ? `Withdrawing early will deduct a ${goal.penaltyPercent}% penalty.\n\nYou will receive: ₦${(goal.currentAmount * (1 - goal.penaltyPercent / 100)).toLocaleString()}`
        : `Withdraw ₦${goal.currentAmount?.toLocaleString()} to your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw', style: isEarly ? 'destructive' : 'default',
          onPress: () => setPinAction({ type: 'withdraw', goal })

        }
      ]
    )
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#22c55e'
    if (progress >= 50) return '#f5a623'
    return '#25427a'
  }

  // Analytics data
  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0)
  const totalTarget = goals.reduce((sum, g) => sum + (g.goalAmount || 0), 0)
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0
  const activeGoals = goals.filter(g => g.status === 'ACTIVE')
  const completedGoals = goals.filter(g => g.status === 'COMPLETED')

  // Progress chart data
  const progressData = {
    labels: activeGoals.slice(0, 4).map(g => g.title?.substring(0, 6) || ''),
    data: activeGoals.slice(0, 4).map(g => Math.min((g.progress || 0) / 100, 1))
  }

  // Savings over time — built from REAL contributions across all goals
  const allContributions = goals
    .flatMap((g: any) => (g.contributions || []).map((c: any) => ({
      // Withdrawals and penalties take money out, so they count against the line
      amount: c.type === 'WITHDRAWAL' || c.type === 'PENALTY' ? -c.amount : c.amount,
      date: new Date(c.createdAt)
    })))
    .filter((c: any) => c.amount !== 0)
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())

  const buildLineData = () => {
    if (allContributions.length === 0) {
      return { labels: ['Start'], datasets: [{ data: [0], color: () => '#25427a', strokeWidth: 3 }] }
    }
    // group by month, cumulative
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const byMonth: Record<string, number> = {}
    allContributions.forEach((c: any) => {
      const key = `${monthNames[c.date.getMonth()]} ${String(c.date.getFullYear()).slice(2)}`
      byMonth[key] = (byMonth[key] || 0) + c.amount
    })
    const keys = Object.keys(byMonth)
    // cumulative running total
    let running = 0
    const cumulative = keys.map(k => { running += byMonth[k]; return running })
    // cap to last 6 points so the chart stays readable
    const sliceFrom = Math.max(0, keys.length - 6)
    let labels = keys.slice(sliceFrom)
    let points = cumulative.slice(sliceFrom).map(v => Math.max(0, v))
    // The chart library draws nothing with a single point, which is why the
    // card looked blank for anyone who started saving this month.
    if (points.length === 1) {
      labels = ['Start', ...labels]
      points = [0, ...points]
    }
    return {
      labels,
      datasets: [{ data: points, color: () => '#25427a', strokeWidth: 3 }]
    }
  }
  const savingsLineData = buildLineData()

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(13, 71, 161, ${opacity})`,
    labelColor: () => '#888',
    style: { borderRadius: 16 },
    propsForDots: { r: '5', strokeWidth: '2', stroke: '#25427a' }
  }

  // CREATE SCREEN
  if (pinAction) {
    return (
      <LinearGradient colors={['#14244a', '#14244a']} style={{ flex: 1 }}>
        {saving ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <OwodeLoader size="large" fullscreen color="#f5a623" />
            <Text style={{ color: '#fff', marginTop: 14, fontSize: 14 }}>
              {pinAction.type === 'deposit' ? 'Processing deposit...' : 'Processing withdrawal...'}
            </Text>
          </View>
        ) : (
          <PinKeypad
            title="Transaction PIN"
            subtitle={pinAction.type === 'deposit' ? 'Confirm your savings deposit' : 'Confirm your withdrawal'}
            pinLength={4}
            requireConfirm={false}
            onComplete={(pin: string) => pinAction.type === 'deposit' ? executeDeposit(pin) : executeWithdraw(pin)}
          />
        )}
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', opacity: saving ? 0 : 1 }}>
          <TouchableOpacity onPress={() => setPinAction(null)} disabled={saving}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  // OWODE Alajo Redesign "New savings goal" board
  if (screen === 'create') {
    const freqs = ['DAILY', 'WEEKLY', 'MONTHLY']
    return (
      <View style={ui.screen}>
        <TopBar title="New savings goal" onBack={() => setScreen('list')} />
        <ScrollView contentContainerStyle={[ui.body, { gap: 16, paddingBottom: 30 }]} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            <Eyebrow>WHAT ARE YOU SAVING FOR?</Eyebrow>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {GOAL_CATEGORIES.map((cat, i) => {
                const on = selectedCategory.label === cat.label
                return (
                  <TouchableOpacity key={i} style={[sv.cat, on && sv.catOn]} onPress={() => setSelectedCategory(cat)}>
                    <Ionicons name={cat.ion as any} size={18} color={on ? '#ffffff' : ds.navy} />
                    <Text style={[sv.catText, on && { color: '#ffffff', fontFamily: F.x }]}>{cat.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
          <Field label="Goal name" placeholder="e.g. House rent target" value={title} onChangeText={setTitle} />
          <Field label="Target amount" prefix="₦" placeholder="150,000" value={goalAmount}
            onChangeText={t => setGoalAmount(t.replace(/[^\d]/g, ''))} keyboardType="numeric" />
          <Field label="Start with (optional)" prefix="₦" placeholder="0" value={initialDeposit}
            onChangeText={t => setInitialDeposit(t.replace(/[^\d]/g, ''))} keyboardType="numeric" />

          <View style={{ gap: 8 }}>
            <Eyebrow>TARGET DATE</Eyebrow>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[{ label: '3 months', months: 3 }, { label: '6 months', months: 6 }, { label: '1 year', months: 12 }].map(opt => {
                const on = dateChip === opt.label
                return (
                  <TouchableOpacity key={opt.label} style={[sv.chip, on && sv.chipOn]}
                    onPress={() => {
                      const d = new Date(); d.setMonth(d.getMonth() + opt.months)
                      setTargetDate(d.toISOString().split('T')[0]); setDateChip(opt.label)
                    }}>
                    <Text style={[sv.chipText, on && sv.chipTextOn]} numberOfLines={1}>{opt.label}</Text>
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity style={[sv.chip, { flex: 0, width: 46 }, dateChip === 'Custom' && sv.chipOn]} accessibilityLabel="Pick a date"
                onPress={() => { setDateChip('Custom'); setTempDate(targetDate ? new Date(targetDate) : new Date()); setShowDatePicker(true) }}>
                <Icon name="calendar" size={18} color={dateChip === 'Custom' ? '#ffffff' : ds.navy} width={2} />
              </TouchableOpacity>
            </View>
            {targetDate ? (
              <Text style={ui.muted}>
                Reach it by {new Date(targetDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                {perDaySave > 0 ? ` · about ${naira(perDaySave)} a day` : ''}
              </Text>
            ) : null}
          </View>

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker value={tempDate} mode="date" display="spinner" minimumDate={new Date()}
              onChange={(event: any, d?: Date) => {
                setShowDatePicker(false)
                if (event?.type === 'set' && d) { setTargetDate(d.toISOString().split('T')[0]); setDateChip('Custom') }
              }} />
          )}
          {Platform.OS === 'ios' && (
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.dpBackdrop}>
                <View style={styles.dpSheet}>
                  <View style={styles.dpHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.dpCancel} numberOfLines={1}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.dpTitle} numberOfLines={1}>Select target date</Text>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => { setTargetDate(tempDate.toISOString().split('T')[0]); setDateChip('Custom'); setShowDatePicker(false) }}>
                      <Text style={styles.dpDone} numberOfLines={1}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={tempDate} mode="date" display="spinner" minimumDate={new Date()}
                    themeVariant="light" textColor="#1a2b4a" onChange={(e: any, d?: Date) => { if (d) setTempDate(d) }} style={styles.dpPicker} />
                </View>
              </View>
            </Modal>
          )}

          <View style={{ gap: 8 }}>
            <View style={ui.rowBetween}>
              <Eyebrow>AUTO-SAVE</Eyebrow>
              <Switch value={autoDebitOn} onValueChange={v => { setAutoDebitOn(v); if (!v) setAutoDebitFreq('') }}
                trackColor={{ false: '#cfd6e3', true: ds.navy }} thumbColor="#ffffff" />
            </View>
            {autoDebitOn ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {freqs.map(f => {
                  const on = autoDebitFreq === f
                  return (
                    <TouchableOpacity key={f} style={[sv.chip, on && sv.chipOn]} onPress={() => setAutoDebitFreq(f)}>
                      <Text style={[sv.chipText, on && sv.chipTextOn]}>{f.charAt(0) + f.slice(1).toLowerCase()}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : null}
          </View>

          {autoDebitOn && autoDebitFreq && goalAmount && targetDate && autoDebitCalc > 0 ? (
            <Card tone="gold" style={{ gap: 8 }}>
              <Eyebrow color={ds.goldInk}>YOUR PLAN</Eyebrow>
              <Text style={sv.plan}>{naira(autoDebitCalc)} every {autoDebitFreq === 'DAILY' ? 'day' : autoDebitFreq === 'WEEKLY' ? 'week' : 'month'}</Text>
              <Text style={sv.planSub}>
                We move it from your wallet automatically to reach {naira(Number(goalAmount))} by {new Date(targetDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}.
              </Text>
            </Card>
          ) : autoDebitOn && !autoDebitFreq ? (
            <Text style={sv.warn}>Pick how often to save</Text>
          ) : null}

          {goalAmount && targetDate ? (
            <Note icon="info">Withdrawing before the target date has a 5% fee. Reaching your target makes it free.</Note>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 28) }}>
          <Btn title="Create goal" onPress={handleCreate} loading={saving} />
        </View>
      </View>
    )
  }

  // OWODE Alajo Redesign "Add to goal" board
  if (screen === 'deposit') {
    const add = Number(depositAmount) || 0
    const pct = Math.max(0, Math.min(100, Math.round(selectedGoal?.progress || 0)))
    const press = (k: string) => {
      if (k === 'del') { setDepositAmount(p => p.slice(0, -1)); return }
      setDepositAmount(p => {
        if (!p && (k === '0' || k === '00')) return p
        const next = p + k
        return next.length > 9 ? p : next
      })
    }
    return (
      <View style={ui.white}>
        <TopBar title="Add to goal" onBack={() => setScreen('list')} onWhite />
        {selectedGoal && (
          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 16 }}>
            <Card style={{ gap: 12 }}>
              <View style={ui.rowBetween}>
                <Text style={sv.goalTitle} numberOfLines={1}>{selectedGoal.title}</Text>
                <Text style={sv.goalPct}>{pct}%</Text>
              </View>
              <View style={sv.track}><View style={[sv.fill, { width: `${pct}%` }]} /></View>
              <View style={ui.rowBetween}>
                <Text style={sv.goalSaved}>{naira(selectedGoal.currentAmount || 0)}</Text>
                <Text style={ui.muted}>of {naira(selectedGoal.goalAmount || 0)}</Text>
              </View>
            </Card>
            <View style={{ alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <Eyebrow>AMOUNT TO ADD</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={sv.sym}>₦</Text>
                <Text style={[sv.amount, !add && { color: '#9aa5b8' }]}>{add ? commas(add) : '0'}</Text>
              </View>
              <Text style={ui.muted}>
                {add > 0 ? `New total ${naira((selectedGoal.currentAmount || 0) + add)}` : 'Moved from your wallet'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1000, 5000, 10000, 20000].map(q => (
                <TouchableOpacity key={q} style={[sv.quick, add === q && { backgroundColor: ds.navy }]} onPress={() => setDepositAmount(String(q))}>
                  <Text style={[sv.quickText, add === q && { color: '#ffffff' }]}>{naira(q)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <View style={sv.pad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map(k => (
            <TouchableOpacity key={k} style={sv.key} onPress={() => press(k)} onLongPress={k === 'del' ? () => setDepositAmount('') : undefined}
              accessibilityLabel={k === 'del' ? 'Delete' : k}>
              {k === 'del' ? <Icon name="backspace" size={24} color={ds.ink} /> : <Text style={sv.keyText}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: Math.max(insets.bottom + 12, 28) }}>
          <Btn title="Continue — enter PIN" kind="navy" onPress={handleDeposit} loading={saving} disabled={!add} />
        </View>
      </View>
    )
  }

  // MAIN LIST SCREEN — OWODE Alajo Redesign "Savings" board
  const monthBars = (() => {
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return { y: d.getFullYear(), m: d.getMonth(), label: names[d.getMonth()], net: 0 }
    })
    allContributions.forEach((c: any) => {
      const slot = months.find(x => x.y === c.date.getFullYear() && x.m === c.date.getMonth())
      if (slot) slot.net += c.amount
    })
    const max = Math.max(0, ...months.map(x => x.net))
    return months.map((x, i) => ({
      ...x,
      current: i === months.length - 1,
      h: max > 0 && x.net > 0 ? Math.max(8, Math.round((x.net / max) * 52)) : 4,
    }))
  })()

  const timeLeft = (days: number) => {
    if (!days || days <= 0) return 'target date reached'
    if (days > 60) return `${Math.round(days / 30)} months left`
    return `${days} day${days === 1 ? '' : 's'} left`
  }

  const openGoal = (goal: any) => {
    Alert.alert(goal.title, `${naira(goal.currentAmount || 0)} of ${naira(goal.goalAmount || 0)}`, [
      { text: 'Add money', onPress: () => { setSelectedGoal(goal); setScreen('deposit') } },
      { text: goal.canWithdrawFree ? 'Withdraw' : 'Withdraw early', onPress: () => handleWithdraw(goal) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const renderGoal = (goal: any) => {
    const pct = Math.max(0, Math.min(100, Math.round(goal.progress || 0)))
    if (goal.status === 'COMPLETED') {
      return (
        <View key={goal.id} style={[s.goal, s.goalReached]}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={s.goalTitle} numberOfLines={1}>{goal.title}</Text>
              <Text style={[s.goalSub, { color: ds.goldInk2 }]} numberOfLines={1}>
                Target reached · {goal.canWithdrawFree ? 'withdraw free of charge' : `${goal.penaltyPercent}% fee before target date`}
              </Text>
            </View>
            <Icon name="checkCircle" size={22} color={ds.goldInk} width={2} />
          </View>
          <View style={s.rowBetween}>
            <Text style={[s.goalSaved, { fontSize: 15 }]}>{naira(goal.currentAmount || 0)}</Text>
            <TouchableOpacity style={s.withdrawBtn} onPress={() => handleWithdraw(goal)} activeOpacity={0.85}>
              <Text style={s.withdrawText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }
    const withdrawn = goal.status === 'WITHDRAWN'
    const sub = withdrawn
      ? 'Withdrawn'
      : `${goal.autoDebitAmount > 0
          ? `Auto-save ${naira(goal.autoDebitAmount)} ${String(goal.autoDebitFreq || '').toLowerCase()}`
          : 'Manual'} · ${timeLeft(goal.daysLeft)}`
    return (
      <TouchableOpacity
        key={goal.id}
        style={[s.goal, withdrawn && { opacity: 0.6 }]}
        onPress={() => !withdrawn && openGoal(goal)}
        disabled={withdrawn}
        activeOpacity={0.8}
      >
        <View style={[s.rowBetween, { gap: 10 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={s.goalTitle} numberOfLines={1}>{goal.title}</Text>
            <Text style={s.goalSub} numberOfLines={1}>{sub}</Text>
          </View>
          <Text style={s.goalPct}>{pct}%</Text>
        </View>
        <View style={s.track}><View style={[s.fill, { width: `${pct}%` }]} /></View>
        <View style={s.rowBetween}>
          <Text style={s.goalSaved}>{naira(goal.currentAmount || 0)}</Text>
          <Text style={s.goalOf}>of {naira(goal.goalAmount || 0)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={s.container}>
      {loading ? (
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 110, gap: 18 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.navy} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.rowBetween}>
            <Text style={s.h1}>Savings</Text>
            <TouchableOpacity style={s.newGoal} onPress={() => setScreen('create')} activeOpacity={0.85}>
              <Icon name="plus" size={16} color="#ffffff" width={2.4} />
              <Text style={s.newGoalText}>New goal</Text>
            </TouchableOpacity>
          </View>

          <View style={s.summary}>
            <View style={[s.rowBetween, { alignItems: 'flex-start' }]}>
              <View style={{ gap: 4 }}>
                <Text style={s.eyebrow}>SAVED ACROSS GOALS</Text>
                <Text style={s.total}>{naira(totalSaved)}</Text>
              </View>
              <Text style={s.bluePill}>{goals.filter(x => x.status !== 'WITHDRAWN').length} active</Text>
            </View>
            <View style={s.bars} accessibilityLabel="Saved per month, last six months">
              {monthBars.map(b => (
                <View key={`${b.y}-${b.m}`} style={s.barCol}>
                  <View style={[s.bar, { height: b.h, backgroundColor: b.current ? ds.navy : ds.barSoft }]} />
                  <Text style={[s.barLabel, b.current && { color: ds.ink, fontFamily: F.b }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {goals.length === 0 ? (
            <>
              <Text style={s.section}>Start with a plan</Text>
              <View style={{ gap: 12 }}>
                {PLAN_TEMPLATES.map(t => (
                  <TouchableOpacity key={t.title} style={s.goal} onPress={() => applyTemplate(t)} activeOpacity={0.8}>
                    <View style={[s.rowBetween, { gap: 10 }]}>
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Text style={s.goalTitle} numberOfLines={1}>{t.title}</Text>
                        <Text style={s.goalSub} numberOfLines={1}>Auto-save {naira(t.perDay)} daily · {t.sub}</Text>
                      </View>
                      <Icon name="plus" size={18} color={ds.navy} width={2.2} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={s.section}>Your goals</Text>
              <View style={{ gap: 12 }}>
                {[...goals]
                  .sort((a, b) => (a.status === 'WITHDRAWN' ? 1 : 0) - (b.status === 'WITHDRAWN' ? 1 : 0))
                  .map(renderGoal)}
              </View>
            </>
          )}
        </ScrollView>
      )}
      <BottomNav navigation={navigation} active="savings" />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: ds.bg },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: 24, lineHeight: 29, color: ds.ink, fontFamily: F.x },
  newGoal: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: ds.navy, flexDirection: 'row', alignItems: 'center', gap: 6 },
  newGoalText: { color: '#ffffff', fontSize: 14, lineHeight: 17, fontFamily: F.b },
  summary: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 20, padding: 18, gap: 14 },
  eyebrow: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6 },
  total: { fontSize: 30, lineHeight: 37, color: ds.ink, fontFamily: F.x, letterSpacing: -0.4, ...tnum },
  bluePill: { fontSize: 12, lineHeight: 15, color: ds.navy, fontFamily: F.b, backgroundColor: ds.blueSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 72 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10, lineHeight: 12, color: ds.muted, fontFamily: F.r },
  section: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  goal: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, padding: 16, gap: 12 },
  goalReached: { backgroundColor: ds.goldWash, borderColor: ds.goldLine },
  goalTitle: { fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.b },
  goalSub: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  goalPct: { fontSize: 12, lineHeight: 15, color: ds.hero, fontFamily: F.x, ...tnum },
  track: { height: 8, borderRadius: 4, backgroundColor: ds.divider, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: ds.navy },
  goalSaved: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.x, ...tnum },
  goalOf: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.r, ...tnum },
  withdrawBtn: { height: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
  withdrawText: { color: ds.hero, fontSize: 13, lineHeight: 16, fontFamily: F.x },
})

const styles = StyleSheet.create({
  tplHeading: { fontSize: 13, fontWeight: '700', color: '#1a2b4a', marginHorizontal: 14, marginTop: 4, marginBottom: 10 },
  tplRow: { paddingHorizontal: 14, gap: 10, paddingBottom: 4 },
  tplCard: { width: 140, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#eef1f6', minHeight: 108 },
  tplIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tplTitle: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: '#1a2b4a' },
  tplRate: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#25427a', marginTop: 3 },
  tplSub: { flexShrink: 1, fontSize: 10.5, color: '#7c8aa5', marginTop: 2 },
  autoDebitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  autoDebitHeadText: { flex: 1, flexShrink: 1, paddingRight: 12 },
  autoDebitTitle: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#1a2b4a' },
  autoDebitSub: { fontSize: 12, color: '#7c8aa5', marginTop: 14, marginBottom: 8 },
  autoDebitWarn: { fontSize: 12, color: '#7c8aa5', marginTop: 10, fontStyle: 'italic' },
  autoDebitCalcCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eaf2ff', borderRadius: 12, padding: 12, marginTop: 12, minHeight: 48 },
  autoDebitCalcText: { flex: 1, flexShrink: 1, fontSize: 13, lineHeight: 19, color: '#1a2b4a' },
  autoDebitCalcAmt: { fontWeight: '700', color: '#25427a' },
  dpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  dpSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 },
  dpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f2f7', minHeight: 56 },
  dpTitle: { flex: 1, flexShrink: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#1a2b4a' },
  dpCancel: { flexShrink: 1, fontSize: 14, color: '#7c8aa5' },
  dpDone: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#25427a' },
  dpPicker: { alignSelf: 'center', width: '100%' },
  dateChipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dateChip: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e6ebf4', borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  dateChipIcon: { flex: 0, width: 46 },
  dateChipActive: { backgroundColor: '#25427a', borderColor: '#25427a' },
  dateChipText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: '#25427a' },
  dateChipTextActive: { color: '#fff' },
  datePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eaf2ff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10, minHeight: 44 },
  datePreviewText: { flex: 1, flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#25427a' },
  perDayHint: { fontSize: 12, color: '#7c8aa5', marginTop: 8 },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  createHeader: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  newBtn: { color: '#f5a623', fontSize: 14, fontWeight: '700' },
  summaryCard: { marginHorizontal: 14, marginTop: 14, marginBottom: 10, borderRadius: 16, padding: 16 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 },
  summaryAmount: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryItemValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summaryItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabRow: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 8, backgroundColor: '#f0f2f7', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#7c8aa5' },
  tabTextActive: { color: '#25427a' },
  // Analytics
  analyticsCard: { backgroundColor: '#fff', marginHorizontal: 14, marginTop: 14, marginBottom: 8, borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  analyticsTitle: { fontSize: 14, fontWeight: '700', color: '#25427a', marginBottom: 4 },
  analyticsSubtitle: { fontSize: 12, color: '#7c8aa5', marginBottom: 12 },
  chart: { borderRadius: 16, marginTop: 8 },
  overallProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  overallProgressCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eaf2ff', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#25427a' },
  overallProgressPercent: { fontSize: 16, fontWeight: '700', color: '#25427a' },
  overallProgressLabel: { fontSize: 10, color: '#7c8aa5' },
  overallProgressStats: { flex: 1, gap: 8 },
  overallStat: {},
  overallStatValue: { fontSize: 14, fontWeight: 'bold' },
  overallStatLabel: { fontSize: 11, color: '#7c8aa5' },
  overallBar: { height: 8, backgroundColor: '#f0f2f7', borderRadius: 4, overflow: 'hidden' },
  overallBarFill: { height: 8, borderRadius: 4 },
  goalAnalyticsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  goalAnalyticsLeft: { flex: 1 },
  goalAnalyticsTitle: { fontSize: 13, fontWeight: '600', color: '#1a2b4a' },
  goalAnalyticsSub: { fontSize: 11, color: '#7c8aa5', marginTop: 2 },
  goalAnalyticsRight: { alignItems: 'flex-end', gap: 4, width: 80 },
  goalAnalyticsPercent: { fontSize: 13, fontWeight: 'bold' },
  goalMiniBar: { width: 70, height: 4, backgroundColor: '#f0f2f7', borderRadius: 2, overflow: 'hidden' },
  goalMiniBarFill: { height: 4, borderRadius: 2 },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 8 },
  insightIcon: { fontSize: 20 },
  insightText: { flex: 1, fontSize: 13, color: '#1a2b4a', lineHeight: 18 },
  // Goals
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#1a2b4a', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#7c8aa5', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  createFirstBtn: { backgroundColor: '#25427a', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16 },
  createFirstBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  goalCard: { backgroundColor: '#fff', marginHorizontal: 14, marginTop: 14, marginBottom: 8, borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: '#25427a', marginBottom: 3 },
  goalDesc: { fontSize: 12, color: '#7c8aa5' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  amountsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  amountBox: { flex: 1, backgroundColor: '#f4f6fb', borderRadius: 12, padding: 12, alignItems: 'center' },
  amountBoxLabel: { fontSize: 11, color: '#7c8aa5', marginBottom: 4 },
  amountBoxValue: { fontSize: 14, fontWeight: 'bold', color: '#25427a' },
  progressSection: { marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#7c8aa5' },
  progressPercent: { fontSize: 12, fontWeight: 'bold' },
  progressBar: { height: 10, backgroundColor: '#f0f2f7', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: 10, borderRadius: 5 },
  autoDebitBadge: { backgroundColor: '#eaf2ff', borderRadius: 10, padding: 8, marginBottom: 8 },
  autoDebitBadgeText: { fontSize: 12, color: '#25427a' },
  targetDate: { fontSize: 12, color: '#7c8aa5', marginBottom: 8 },
  penaltyWarning: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 8, marginBottom: 12 },
  penaltyWarningText: { fontSize: 12, color: '#f5a623' },
  actions: { flexDirection: 'row', gap: 8 },
  depositBtn: { flex: 2, backgroundColor: '#25427a', borderRadius: 12, padding: 14, alignItems: 'center' },
  depositBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  withdrawBtn: { flex: 1, backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, alignItems: 'center' },
  withdrawBtnEarly: { backgroundColor: '#fff3e0' },
  withdrawBtnText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },
  withdrawCompletedBtn: { backgroundColor: '#22c55e', borderRadius: 12, padding: 14, alignItems: 'center' },
  withdrawCompletedBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  // Create/Deposit
  createContent: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#25427a', marginBottom: 8, marginTop: 14 },
  categoryRow: { marginBottom: 8 },
  categoryChip: { alignItems: 'center', marginRight: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 2, borderColor: '#e6eaf2', width: 80 },
  categoryChipActive: { borderColor: '#25427a', backgroundColor: '#eaf2ff' },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 11, color: '#7c8aa5', fontWeight: '600' },
  categoryLabelActive: { color: '#25427a' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e6eaf2', paddingHorizontal: 16, marginBottom: 4 },
  inputPrefix: { fontSize: 16, color: '#25427a', fontWeight: '700', marginRight: 8 },
  inputWithPrefix: { flex: 1, fontSize: 15, color: '#1a2b4a', paddingVertical: 13 },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e6eaf2', paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#1a2b4a' },
  textArea: { height: 80, textAlignVertical: 'top' },
  autoDebitSection: { backgroundColor: '#f4f6fb', borderRadius: 16, padding: 16, marginTop: 8 },
  autoDebitHint: { fontSize: 12, color: '#7c8aa5', marginTop: 2, marginBottom: 8 },
  freqRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  freqBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e6eaf2' },
  freqBtnActive: { backgroundColor: '#25427a', borderColor: '#25427a' },
  freqBtnText: { color: '#7c8aa5', fontWeight: '600', fontSize: 12 },
  freqBtnTextActive: { color: '#fff' },
  summaryPreview: { backgroundColor: '#f4f6fb', borderRadius: 16, padding: 16, marginTop: 16 },
  summaryPreviewTitle: { fontSize: 14, fontWeight: 'bold', color: '#25427a', marginBottom: 12 },
  summaryPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  summaryPreviewLabel: { fontSize: 13, color: '#7c8aa5' },
  summaryPreviewValue: { fontSize: 13, color: '#1a2b4a', fontWeight: '600' },
  createGoalBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  createGoalBtnGradient: { padding: 18, alignItems: 'center' },
  createGoalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  depositGoalInfo: { backgroundColor: '#eaf2ff', borderRadius: 16, padding: 16, marginBottom: 24 },
  depositGoalTitle: { fontSize: 14, fontWeight: '700', color: '#25427a', marginBottom: 8 },
  depositGoalProgress: { fontSize: 13, color: '#7c8aa5', marginBottom: 8 },
  depositProgressBar: { height: 8, backgroundColor: '#c5d8f0', borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  depositProgressFill: { height: 8, backgroundColor: '#25427a', borderRadius: 4 },
  depositProgressPercent: { fontSize: 12, color: '#25427a', fontWeight: '600' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  quickAmountBtn: { flex: 1, backgroundColor: '#f4f6fb', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e6eaf2' },
  quickAmountBtnActive: { backgroundColor: '#eaf2ff', borderColor: '#25427a' },
  quickAmountText: { fontSize: 12, color: '#7c8aa5', fontWeight: '600' },
  quickAmountTextActive: { color: '#25427a' },
})

const sv = StyleSheet.create({
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card },
  catOn: { backgroundColor: ds.hero, borderColor: ds.hero },
  catText: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.s },
  chip: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: ds.hero, borderColor: ds.hero },
  chipText: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.s },
  chipTextOn: { color: '#ffffff', fontFamily: F.x },
  plan: { fontSize: 20, lineHeight: 24, color: ds.ink, fontFamily: F.x, ...tnum },
  planSub: { fontSize: 13, lineHeight: 19, color: ds.goldInk2, fontFamily: F.r },
  warn: { fontSize: 12, lineHeight: 15, color: ds.goldInk, fontFamily: F.b },
  goalTitle: { flex: 1, fontSize: 15, lineHeight: 18, color: ds.ink, fontFamily: F.x },
  goalPct: { fontSize: 12, lineHeight: 15, color: ds.hero, fontFamily: F.x },
  track: { height: 8, borderRadius: 4, backgroundColor: ds.divider, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: ds.navy },
  goalSaved: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.x, ...tnum },
  sym: { fontSize: 28, lineHeight: 34, color: ds.muted, fontFamily: F.b },
  amount: { fontSize: 48, lineHeight: 58, color: ds.ink, fontFamily: F.x, letterSpacing: -1, ...tnum },
  quick: { flex: 1, height: 40, borderRadius: 12, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.x },
  pad: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  key: { width: '32%', height: 52, borderRadius: 14, backgroundColor: ds.bg, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 22, lineHeight: 27, color: ds.ink, fontFamily: F.b },
})
