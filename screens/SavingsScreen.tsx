import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl,
  TextInput, ActivityIndicator, Dimensions
, KeyboardAvoidingView, Platform, Modal, Switch} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from '../components/BottomNav'
import { savingsAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import PinKeypad from '../components/PinKeypad'
import { LineChart, ProgressChart } from 'react-native-chart-kit'

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
    .flatMap((g: any) => (g.contributions || []).map((c: any) => ({ amount: c.amount, date: new Date(c.createdAt) })))
    .filter((c: any) => c.amount > 0)
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
    return {
      labels: keys.slice(sliceFrom),
      datasets: [{ data: cumulative.slice(sliceFrom), color: () => '#25427a', strokeWidth: 3 }]
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
      <LinearGradient colors={['#1a2e55', '#25427a', '#385c9e']} style={{ flex: 1 }}>
        {saving ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#f5a623" />
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

  if (screen === 'create') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a2e55', '#25427a', '#385c9e']} style={styles.createHeader}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Ionicons name="chevron-back" size={22} color="#f5a623" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Goal</Text>
          <View style={{ width: 50 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.createContent}>
            <Text style={styles.fieldLabel}>What are you saving for?</Text>
            <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {GOAL_CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.categoryChip, selectedCategory.label === cat.label && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Ionicons name={cat.ion as any} size={22} color={selectedCategory.label === cat.label ? '#25427a' : '#7c8aa5'} style={{ marginBottom: 4 }} />
                  <Text style={[styles.categoryLabel, selectedCategory.label === cat.label && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Goal Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name={selectedCategory.ion as any} size={19} color='#25427a' style={{ marginRight: 6 }} />
              <TextInput
                style={styles.inputWithPrefix}
                placeholder="e.g. New iPhone 16"
                placeholderTextColor="#aaa"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Why are you saving for this?"
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Target Amount *</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>₦</Text>
              <TextInput
                style={styles.inputWithPrefix}
                placeholder="0.00"
                placeholderTextColor="#aaa"
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.fieldLabel}>Initial Deposit (optional)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>₦</Text>
              <TextInput
                style={styles.inputWithPrefix}
                placeholder="0.00"
                placeholderTextColor="#aaa"
                value={initialDeposit}
                onChangeText={setInitialDeposit}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.fieldLabel}>Target Date *</Text>
            <View style={styles.dateChipRow}>
              {[{ label: '3 months', months: 3 }, { label: '6 months', months: 6 }, { label: '1 year', months: 12 }].map(opt => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.dateChip, dateChip === opt.label && styles.dateChipActive]}
                  onPress={() => {
                    const d = new Date()
                    d.setMonth(d.getMonth() + opt.months)
                    setTargetDate(d.toISOString().split('T')[0])
                    setDateChip(opt.label)
                  }}
                >
                  <Text style={[styles.dateChipText, dateChip === opt.label && styles.dateChipTextActive]} numberOfLines={1}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.dateChip, styles.dateChipIcon, dateChip === 'Custom' && styles.dateChipActive]}
                onPress={() => { setDateChip('Custom'); setTempDate(targetDate ? new Date(targetDate) : new Date()); setShowDatePicker(true) }}
              >
                <Ionicons name="calendar-outline" size={15} color={dateChip === 'Custom' ? '#fff' : '#25427a'} />
              </TouchableOpacity>
            </View>

            {targetDate ? (
              <TouchableOpacity style={styles.datePreview} onPress={() => { setTempDate(targetDate ? new Date(targetDate) : new Date()); setShowDatePicker(true) }} activeOpacity={0.8}>
                <Ionicons name="calendar" size={16} color="#25427a" />
                <Text style={styles.datePreviewText} numberOfLines={1}>
                  {new Date(targetDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#7c8aa5" />
              </TouchableOpacity>
            ) : null}

            {goalAmount && targetDate && perDaySave > 0 ? (
              <Text style={styles.perDayHint}>Save ~₦{perDaySave.toLocaleString()}/day to reach this goal</Text>
            ) : null}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event: any, d?: Date) => {
                  setShowDatePicker(false)
                  if (event?.type === 'set' && d) {
                    setTargetDate(d.toISOString().split('T')[0])
                    setDateChip('Custom')
                  }
                }}
              />
            )}

            {Platform.OS === 'ios' && (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.dpBackdrop}>
                  <View style={styles.dpSheet}>
                    <View style={styles.dpHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={styles.dpCancel} numberOfLines={1}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.dpTitle} numberOfLines={1}>Select target date</Text>
                      <TouchableOpacity
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() => {
                          setTargetDate(tempDate.toISOString().split('T')[0])
                          setDateChip('Custom')
                          setShowDatePicker(false)
                        }}
                      >
                        <Text style={styles.dpDone} numberOfLines={1}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      themeVariant="light"
                      textColor="#1a2b4a"
                      onChange={(e: any, d?: Date) => { if (d) setTempDate(d) }}
                      style={styles.dpPicker}
                    />
                  </View>
                </View>
              </Modal>
            )}
            <View style={styles.autoDebitSection}>
              <View style={styles.autoDebitHead}>
                <View style={styles.autoDebitHeadText}>
                  <Text style={styles.autoDebitTitle} numberOfLines={1}>Auto-save</Text>
                  <Text style={styles.autoDebitHint}>We work out how much to move for you</Text>
                </View>
                <Switch
                  value={autoDebitOn}
                  onValueChange={v => { setAutoDebitOn(v); if (!v) setAutoDebitFreq('') }}
                  trackColor={{ false: '#dfe5ef', true: '#25427a' }}
                  thumbColor="#fff"
                />
              </View>

              {autoDebitOn ? (
                <>
                  <Text style={styles.autoDebitSub}>How often should we save?</Text>
                  <View style={styles.freqRow}>
                    {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.freqBtn, autoDebitFreq === f && styles.freqBtnActive]}
                        onPress={() => setAutoDebitFreq(f)}
                      >
                        <Text style={[styles.freqBtnText, autoDebitFreq === f && styles.freqBtnTextActive]} numberOfLines={1}>
                          {f.charAt(0) + f.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {!autoDebitFreq ? (
                    <Text style={styles.autoDebitWarn}>Pick a frequency to continue</Text>
                  ) : !goalAmount || !targetDate ? (
                    <Text style={styles.autoDebitWarn}>Set a target amount and date to see your plan</Text>
                  ) : (
                    <View style={styles.autoDebitCalcCard}>
                      <Ionicons name="repeat" size={18} color="#25427a" />
                      <Text style={styles.autoDebitCalcText}>
                        We'll move <Text style={styles.autoDebitCalcAmt}>₦{autoDebitCalc.toLocaleString()}</Text> {autoDebitFreq.toLowerCase()} from your wallet
                      </Text>
                    </View>
                  )}
                </>
              ) : null}
            </View>

            {goalAmount && targetDate ? (
              <View style={styles.summaryPreview}>
                <Text style={styles.summaryPreviewTitle}>Goal Summary</Text>
                {[
                  { label: 'Goal', value: title || 'Untitled' },
                  { label: 'Target Amount', value: `₦${Number(goalAmount).toLocaleString()}` },
                  initialDeposit ? { label: 'Starting with', value: `₦${Number(initialDeposit).toLocaleString()}` } : null,
                  { label: 'Target Date', value: targetDate },
                  autoDebitCalc > 0 ? { label: 'Auto-save', value: `₦${autoDebitCalc.toLocaleString()} ${autoDebitFreq.toLowerCase()}` } : null,
                  { label: 'Early withdrawal penalty', value: '5%' },
                ].filter(Boolean).map((item: any, i) => (
                  <View key={i} style={styles.summaryPreviewRow}>
                    <Text style={styles.summaryPreviewLabel}>{item.label}</Text>
                    <Text style={styles.summaryPreviewValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.createGoalBtn, saving && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              <LinearGradient colors={['#25427a', '#385c9e']} style={styles.createGoalBtnGradient}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createGoalBtnText}>Create Savings Goal</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </View>
    )
  }

  // DEPOSIT SCREEN
  if (screen === 'deposit') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a2e55', '#25427a', '#385c9e']} style={styles.createHeader}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Ionicons name="chevron-back" size={22} color="#f5a623" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Money</Text>
          <View style={{ width: 50 }} />
        </LinearGradient>

        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ flex: 1, padding: 20 }}>
          {selectedGoal && (
            <>
              <View style={styles.depositGoalInfo}>
                <Text style={styles.depositGoalTitle}>{selectedGoal.title}</Text>
                <Text style={styles.depositGoalProgress}>
                  ₦{selectedGoal.currentAmount?.toLocaleString()} of ₦{selectedGoal.goalAmount?.toLocaleString()}
                </Text>
                <View style={styles.depositProgressBar}>
                  <View style={[styles.depositProgressFill, { width: `${Math.min(selectedGoal.progress, 100)}%` }]} />
                </View>
                <Text style={styles.depositProgressPercent}>{selectedGoal.progress}% complete</Text>
              </View>

              <Text style={styles.fieldLabel}>Amount to deposit</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>₦</Text>
                <TextInput
                  style={styles.inputWithPrefix}
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              {/* Quick amounts */}
              <View style={styles.quickAmounts}>
                {[1000, 5000, 10000, 20000].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.quickAmountBtn, depositAmount === String(amt) && styles.quickAmountBtnActive]}
                    onPress={() => setDepositAmount(String(amt))}
                  >
                    <Text style={[styles.quickAmountText, depositAmount === String(amt) && styles.quickAmountTextActive]}>
                      ₦{amt.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {depositAmount && Number(depositAmount) > 0 && (
                <View style={styles.summaryPreview}>
                  {[
                    { label: 'Current savings', value: `₦${selectedGoal.currentAmount?.toLocaleString()}` },
                    { label: 'Adding', value: `+₦${Number(depositAmount).toLocaleString()}`, color: '#22c55e' },
                    { label: 'New total', value: `₦${(selectedGoal.currentAmount + Number(depositAmount)).toLocaleString()}`, bold: true },
                  ].map((item: any, i) => (
                    <View key={i} style={[styles.summaryPreviewRow, i === 2 && { borderBottomWidth: 0 }]}>
                      <Text style={[styles.summaryPreviewLabel, item.bold && { fontWeight: 'bold' }]}>{item.label}</Text>
                      <Text style={[styles.summaryPreviewValue, item.color && { color: item.color }, item.bold && { color: '#25427a' }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.createGoalBtn, saving && { opacity: 0.7 }]}
                onPress={handleDeposit}
                disabled={saving}
              >
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.createGoalBtnGradient}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createGoalBtnText}>Deposit to Savings</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    )
  }

  // MAIN LIST SCREEN
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a2e55', '#25427a', '#385c9e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Savings</Text>
        <TouchableOpacity onPress={() => setScreen('create')}>
          <Text style={styles.newBtn}>+ New</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#25427a" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
          <LinearGradient colors={['#25427a', '#385c9e']} style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Saved Across All Goals</Text>
            <Text style={styles.summaryAmount}>₦{totalSaved.toLocaleString()}</Text>
            <View style={styles.summaryRow}>
              {[
                { value: activeGoals.length, label: 'Active Goals' },
                { value: completedGoals.length, label: 'Completed' },
                { value: `₦${totalTarget.toLocaleString()}`, label: 'Total Target' },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <View style={styles.summaryDivider} />}
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryItemValue}>{item.value}</Text>
                    <Text style={styles.summaryItemLabel}>{item.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {[
              { key: 'goals', label: 'My Goals' },
              { key: 'analytics', label: 'Analytics' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <View>
              {goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={44} color="#9aa5b8" />
                  <Text style={styles.emptyText}>Nothing to chart yet</Text>
                  <Text style={styles.emptySubText}>Create a savings goal and your progress will show up here</Text>
                </View>
              ) : (
                <>
                  {/* Overall Progress Ring */}
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Overall Savings Progress</Text>
                    <View style={styles.overallProgressRow}>
                      <View style={styles.overallProgressCircle}>
                        <Text style={styles.overallProgressPercent}>{overallProgress}%</Text>
                        <Text style={styles.overallProgressLabel}>Complete</Text>
                      </View>
                      <View style={styles.overallProgressStats}>
                        {[
                          { label: 'Total Saved', value: `₦${totalSaved.toLocaleString()}`, color: '#22c55e' },
                          { label: 'Remaining', value: `₦${Math.max(0, totalTarget - totalSaved).toLocaleString()}`, color: '#ef4444' },
                          { label: 'Goals', value: `${activeGoals.length} active`, color: '#25427a' },
                        ].map(item => (
                          <View key={item.label} style={styles.overallStat}>
                            <Text style={[styles.overallStatValue, { color: item.color }]}>{item.value}</Text>
                            <Text style={styles.overallStatLabel}>{item.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {/* Overall progress bar */}
                    <View style={styles.overallBar}>
                      <View style={[styles.overallBarFill, {
                        width: `${Math.min(overallProgress, 100)}%`,
                        backgroundColor: overallProgress >= 100 ? '#22c55e' : overallProgress >= 50 ? '#f5a623' : '#25427a'
                      }]} />
                    </View>
                  </View>

                  {/* Savings Growth Chart */}
                  {totalSaved > 0 && (
                    <View style={styles.analyticsCard}>
                      <Text style={styles.analyticsTitle}>Savings Growth</Text>
                      <Text style={styles.analyticsSubtitle}>Your actual savings over time</Text>
                      <LineChart
                        data={savingsLineData}
                        width={width - 64}
                        height={180}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withInnerLines={false}
                        withOuterLines={false}
                        formatYLabel={(v) => `₦${(Number(v) / 1000).toFixed(0)}k`}
                      />
                    </View>
                  )}

                  {/* Goals Progress Chart */}
                  {activeGoals.length > 0 && (
                    <View style={styles.analyticsCard}>
                      <Text style={styles.analyticsTitle}>Goals Progress</Text>
                      <Text style={styles.analyticsSubtitle}>Progress per active goal</Text>
                      <ProgressChart
                        data={progressData}
                        width={width - 64}
                        height={180}
                        strokeWidth={12}
                        radius={32}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1, index = 0) => {
                            const colors = ['rgba(13,71,161', 'rgba(34,197,94', 'rgba(245,166,35', 'rgba(239,68,68']
                            return `${colors[index % colors.length]},${opacity})`
                          }
                        }}
                        hideLegend={false}
                        style={styles.chart}
                      />
                    </View>
                  )}

                  {/* Per Goal Analytics */}
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Goals Breakdown</Text>
                    {goals.map(goal => (
                      <View key={goal.id} style={styles.goalAnalyticsRow}>
                        <View style={styles.goalAnalyticsLeft}>
                          <Text style={styles.goalAnalyticsTitle} numberOfLines={1}>{goal.title}</Text>
                          <Text style={styles.goalAnalyticsSub}>
                            ₦{goal.currentAmount?.toLocaleString()} / ₦{goal.goalAmount?.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.goalAnalyticsRight}>
                          <Text style={[styles.goalAnalyticsPercent, { color: getProgressColor(goal.progress) }]}>
                            {goal.progress}%
                          </Text>
                          <View style={styles.goalMiniBar}>
                            <View style={[styles.goalMiniBarFill, {
                              width: `${Math.min(goal.progress, 100)}%`,
                              backgroundColor: getProgressColor(goal.progress)
                            }]} />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Insights */}
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsTitle}>Savings Insights</Text>
                    {[
                      goals.find(g => g.progress >= 75) && {
                        icon: '',
                        text: `${goals.find(g => g.progress >= 75)?.title} is almost complete! Keep going!`,
                        color: '#e8f5e9'
                      },
                      activeGoals.filter(g => g.autoDebitAmount > 0).length > 0 && {
                        icon: 'repeat',
                        text: `${activeGoals.filter(g => g.autoDebitAmount > 0).length} goal(s) are on auto-debit — great habit!`,
                        color: '#e3f2fd'
                      },
                      totalSaved > 0 && {
                        icon: 'trophy',
                        text: `You've saved ₦${totalSaved.toLocaleString()} total across all goals. Amazing!`,
                        color: '#fff3e0'
                      },
                      activeGoals.length === 0 && {
                        icon: '',
                        text: 'Create your first savings goal to start your savings journey!',
                        color: '#f3e5f5'
                      },
                    ].filter(Boolean).map((insight: any, i) => (
                      <View key={i} style={[styles.insightCard, { backgroundColor: insight.color }]}>
                        {insight.icon ? <Ionicons name={insight.icon} size={20} color="#25427a" /> : null}
                        <Text style={styles.insightText}>{insight.text}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* GOALS TAB */}
          {activeTab === 'goals' && (
            <View>
              <Text style={styles.tplHeading}>Get started with these plans</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tplRow}
              >
                {PLAN_TEMPLATES.map(t => (
                  <TouchableOpacity
                    key={t.title}
                    style={styles.tplCard}
                    onPress={() => applyTemplate(t)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.tplIcon}>
                      <Ionicons name={t.icon as any} size={18} color="#25427a" />
                    </View>
                    <Text style={styles.tplTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.tplRate} numberOfLines={1}>
                      ₦{t.perDay.toLocaleString()}/day
                    </Text>
                    <Text style={styles.tplSub} numberOfLines={1}>{t.sub}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="wallet-outline" size={48} color="#9aa5b8" />
                  <Text style={styles.emptyText}>Start your first plan</Text>
                  <Text style={styles.emptySubText}>Set a goal, save at your own pace, and watch your money grow</Text>
                  <TouchableOpacity style={styles.createFirstBtn} onPress={() => setScreen('create')}>
                    <Text style={styles.createFirstBtnText}>Create First Goal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.map(goal => (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        {goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
                      </View>
                      <View style={[styles.statusBadge, {
                        backgroundColor: goal.status === 'COMPLETED' ? '#e8f5e9' : goal.status === 'WITHDRAWN' ? '#f5f5f5' : '#e3f2fd'
                      }]}>
                        <Text style={[styles.statusBadgeText, {
                          color: goal.status === 'COMPLETED' ? '#22c55e' : goal.status === 'WITHDRAWN' ? '#888' : '#25427a'
                        }]}>
                          {goal.status === 'COMPLETED' ? 'Done' : goal.status === 'WITHDRAWN' ? 'Withdrawn' : 'Active'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.amountsRow}>
                      {[
                        { label: 'Saved', value: `₦${goal.currentAmount?.toLocaleString()}` },
                        { label: 'Target', value: `₦${goal.goalAmount?.toLocaleString()}` },
                        { label: 'Days Left', value: goal.daysLeft === 0 ? '' : `${goal.daysLeft}d`, color: goal.daysLeft < 30 ? '#f5a623' : '#25427a' },
                      ].map(item => (
                        <View key={item.label} style={styles.amountBox}>
                          <Text style={styles.amountBoxLabel}>{item.label}</Text>
                          <Text style={[styles.amountBoxValue, item.color && { color: item.color }]}>{item.value}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.progressSection}>
                      <View style={styles.progressRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={[styles.progressPercent, { color: getProgressColor(goal.progress) }]}>{goal.progress}%</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressBarFill, {
                          width: `${Math.min(goal.progress, 100)}%`,
                          backgroundColor: getProgressColor(goal.progress)
                        }]} />
                      </View>
                    </View>

                    {goal.autoDebitAmount > 0 && (
                      <View style={styles.autoDebitBadge}>
                        <Text style={styles.autoDebitBadgeText}>
                          Auto-saving ₦{goal.autoDebitAmount?.toLocaleString()} {goal.autoDebitFreq?.toLowerCase()}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.targetDate}>
                      Target: {new Date(goal.targetDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>

                    {!goal.canWithdrawFree && goal.status === 'ACTIVE' && (
                      <View style={styles.penaltyWarning}>
                        <Text style={styles.penaltyWarningText}>Early withdrawal: {goal.penaltyPercent}% penalty applies</Text>
                      </View>
                    )}

                    {goal.status === 'ACTIVE' && (
                      <View style={styles.actions}>
                        <TouchableOpacity style={styles.depositBtn} onPress={() => { setSelectedGoal(goal); setScreen('deposit') }}>
                          <Text style={styles.depositBtnText}>Add Money</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.withdrawBtn, !goal.canWithdrawFree && styles.withdrawBtnEarly]}
                          onPress={() => handleWithdraw(goal)}
                        >
                          <Text style={[styles.withdrawBtnText, !goal.canWithdrawFree && { color: '#f5a623' }]}>
                            {goal.canWithdrawFree ? 'Withdraw' : 'Early'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {goal.status === 'COMPLETED' && (
                      <TouchableOpacity style={styles.withdrawCompletedBtn} onPress={() => handleWithdraw(goal)}>
                        <Text style={styles.withdrawCompletedBtnText}>Goal Reached! Withdraw Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      <BottomNav navigation={navigation} active="savings" />
    </View>
  )
}

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
