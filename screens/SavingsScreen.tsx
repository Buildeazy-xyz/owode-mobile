import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl,
  TextInput, ActivityIndicator, Dimensions
, KeyboardAvoidingView, Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { savingsAPI } from '../utils/api'
import { LineChart, ProgressChart } from 'react-native-chart-kit'

const { width } = Dimensions.get('window')

const GOAL_CATEGORIES = [
  { icon: '', label: 'Gadget' },
  { icon: '🏠', label: 'House' },
  { icon: '🚗', label: 'Car' },
  { icon: '✈️', label: 'Travel' },
  { icon: '📚', label: 'Education' },
  { icon: '💒', label: 'Wedding' },
  { icon: '🏥', label: 'Medical' },
  { icon: '💼', label: 'Business' },
  { icon: '', label: 'Gift' },
  { icon: '🐷', label: 'General' },
]

export default function SavingsScreen({ navigation }: any) {
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
  const [autoDebitAmount, setAutoDebitAmount] = useState('')
  const [autoDebitFreq, setAutoDebitFreq] = useState('WEEKLY')
  const [selectedCategory, setSelectedCategory] = useState(GOAL_CATEGORIES[9])
  const [depositAmount, setDepositAmount] = useState('')

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

  const handleCreate = async () => {
    if (!title || !goalAmount || !targetDate) {
      Alert.alert('Error', 'Title, goal amount and target date are required')
      return
    }
    try {
      setSaving(true)
      await savingsAPI.createGoal({
        title: `${selectedCategory.icon} ${title}`,
        description,
        goalAmount: Number(goalAmount),
        initialDeposit: initialDeposit ? Number(initialDeposit) : undefined,
        autoDebitAmount: autoDebitAmount ? Number(autoDebitAmount) : undefined,
        autoDebitFreq: autoDebitAmount ? autoDebitFreq : undefined,
        targetDate
      })
      Alert.alert('Goal Created!', 'Your savings goal has been created!')
      setScreen('list')
      setTitle(''); setDescription(''); setGoalAmount('')
      setInitialDeposit(''); setTargetDate(''); setAutoDebitAmount('')
      setSelectedCategory(GOAL_CATEGORIES[9])
      await loadGoals()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount')
      return
    }
    try {
      setSaving(true)
      const response = await savingsAPI.deposit(selectedGoal.id, Number(depositAmount))
      Alert.alert('✅ Deposited!', response.data.message)
      setScreen('list')
      setDepositAmount('')
      await loadGoals()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleWithdraw = async (goal: any) => {
    const isEarly = new Date() < new Date(goal.targetDate)
    Alert.alert(
      isEarly ? '⚠️ Early Withdrawal' : 'Withdraw Savings',
      isEarly
        ? `Withdrawing early will deduct a ${goal.penaltyPercent}% penalty.\n\nYou will receive: ₦${(goal.currentAmount * (1 - goal.penaltyPercent / 100)).toLocaleString()}`
        : `Withdraw ₦${goal.currentAmount?.toLocaleString()} to your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw', style: isEarly ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const response = await savingsAPI.withdraw(goal.id)
              Alert.alert('✅ Withdrawn!', response.data.message)
              await loadGoals()
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
            }
          }
        }
      ]
    )
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#22c55e'
    if (progress >= 50) return '#f5a623'
    return '#0d47a1'
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

  // Savings over time (use contributions if available)
  const savingsLineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [0, totalSaved * 0.1, totalSaved * 0.3, totalSaved * 0.5, totalSaved * 0.8, totalSaved],
      color: () => '#0d47a1',
      strokeWidth: 3
    }]
  }

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(13, 71, 161, ${opacity})`,
    labelColor: () => '#888',
    style: { borderRadius: 16 },
    propsForDots: { r: '5', strokeWidth: '2', stroke: '#0d47a1' }
  }

  // CREATE SCREEN
  if (screen === 'create') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.createHeader}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Text style={styles.back}>← Back</Text>
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
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, selectedCategory.label === cat.label && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Goal Name *</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>{selectedCategory.icon}</Text>
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
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g. 2026-12-31)"
              placeholderTextColor="#aaa"
              value={targetDate}
              onChangeText={setTargetDate}
            />

            <View style={styles.autoDebitSection}>
              <Text style={styles.fieldLabel}>🔄 Auto-Debit Setup</Text>
              <Text style={styles.autoDebitHint}>Automatically save from wallet</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>₦</Text>
                <TextInput
                  style={styles.inputWithPrefix}
                  placeholder="Amount to auto-save"
                  placeholderTextColor="#aaa"
                  value={autoDebitAmount}
                  onChangeText={setAutoDebitAmount}
                  keyboardType="numeric"
                />
              </View>
              {autoDebitAmount ? (
                <View style={styles.freqRow}>
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.freqBtn, autoDebitFreq === f && styles.freqBtnActive]}
                      onPress={() => setAutoDebitFreq(f)}
                    >
                      <Text style={[styles.freqBtnText, autoDebitFreq === f && styles.freqBtnTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {goalAmount && targetDate ? (
              <View style={styles.summaryPreview}>
                <Text style={styles.summaryPreviewTitle}>📋 Goal Summary</Text>
                {[
                  { label: 'Goal', value: `${selectedCategory.icon} ${title || 'Untitled'}` },
                  { label: 'Target Amount', value: `₦${Number(goalAmount).toLocaleString()}` },
                  initialDeposit ? { label: 'Starting with', value: `₦${Number(initialDeposit).toLocaleString()}` } : null,
                  { label: 'Target Date', value: targetDate },
                  autoDebitAmount ? { label: 'Auto-save', value: `₦${Number(autoDebitAmount).toLocaleString()} ${autoDebitFreq.toLowerCase()}` } : null,
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
              <LinearGradient colors={['#0d47a1', '#1565c0']} style={styles.createGoalBtnGradient}>
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
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.createHeader}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Text style={styles.back}>← Back</Text>
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
                      <Text style={[styles.summaryPreviewValue, item.color && { color: item.color }, item.bold && { color: '#0d47a1' }]}>{item.value}</Text>
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
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🐷 My Savings</Text>
        <TouchableOpacity onPress={() => setScreen('create')}>
          <Text style={styles.newBtn}>+ New</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Summary Card */}
      <LinearGradient colors={['#0d47a1', '#1565c0']} style={styles.summaryCard}>
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

      {loading ? (
        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <View>
              {goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}></Text>
                  <Text style={styles.emptyText}>No data yet</Text>
                  <Text style={styles.emptySubText}>Create savings goals to see analytics!</Text>
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
                          { label: 'Goals', value: `${activeGoals.length} active`, color: '#0d47a1' },
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
                        backgroundColor: overallProgress >= 100 ? '#22c55e' : overallProgress >= 50 ? '#f5a623' : '#0d47a1'
                      }]} />
                    </View>
                  </View>

                  {/* Savings Growth Chart */}
                  {totalSaved > 0 && (
                    <View style={styles.analyticsCard}>
                      <Text style={styles.analyticsTitle}>Savings Growth</Text>
                      <Text style={styles.analyticsSubtitle}>Estimated growth trajectory</Text>
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
                    <Text style={styles.analyticsTitle}>📋 Goals Breakdown</Text>
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
                    <Text style={styles.analyticsTitle}>💡 Savings Insights</Text>
                    {[
                      goals.find(g => g.progress >= 75) && {
                        icon: '',
                        text: `${goals.find(g => g.progress >= 75)?.title} is almost complete! Keep going!`,
                        color: '#e8f5e9'
                      },
                      activeGoals.filter(g => g.autoDebitAmount > 0).length > 0 && {
                        icon: '🔄',
                        text: `${activeGoals.filter(g => g.autoDebitAmount > 0).length} goal(s) are on auto-debit — great habit!`,
                        color: '#e3f2fd'
                      },
                      totalSaved > 0 && {
                        icon: '🏆',
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
                        <Text style={styles.insightIcon}>{insight.icon}</Text>
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
              {goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🐷</Text>
                  <Text style={styles.emptyText}>No savings goals yet</Text>
                  <Text style={styles.emptySubText}>Create your first goal and start building your future!</Text>
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
                          color: goal.status === 'COMPLETED' ? '#22c55e' : goal.status === 'WITHDRAWN' ? '#888' : '#0d47a1'
                        }]}>
                          {goal.status === 'COMPLETED' ? '✅ Done' : goal.status === 'WITHDRAWN' ? 'Withdrawn' : '🔵 Active'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.amountsRow}>
                      {[
                        { label: 'Saved', value: `₦${goal.currentAmount?.toLocaleString()}` },
                        { label: 'Target', value: `₦${goal.goalAmount?.toLocaleString()}` },
                        { label: 'Days Left', value: goal.daysLeft === 0 ? '' : `${goal.daysLeft}d`, color: goal.daysLeft < 30 ? '#f5a623' : '#0d47a1' },
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
                          🔄 Auto-saving ₦{goal.autoDebitAmount?.toLocaleString()} {goal.autoDebitFreq?.toLowerCase()}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.targetDate}>
                      Target: {new Date(goal.targetDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>

                    {!goal.canWithdrawFree && goal.status === 'ACTIVE' && (
                      <View style={styles.penaltyWarning}>
                        <Text style={styles.penaltyWarningText}>⚠️ Early withdrawal: {goal.penaltyPercent}% penalty applies</Text>
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
                            {goal.canWithdrawFree ? 'Withdraw' : '⚠️ Early'}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  createHeader: { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  newBtn: { color: '#f5a623', fontSize: 16, fontWeight: 'bold' },
  summaryCard: { margin: 16, borderRadius: 20, padding: 20 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  summaryAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryItemValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summaryItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#f0f0f0', borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#0d47a1' },
  // Analytics
  analyticsCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  analyticsTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  analyticsSubtitle: { fontSize: 12, color: '#888', marginBottom: 12 },
  chart: { borderRadius: 16, marginTop: 8 },
  overallProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  overallProgressCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#0d47a1' },
  overallProgressPercent: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  overallProgressLabel: { fontSize: 10, color: '#888' },
  overallProgressStats: { flex: 1, gap: 8 },
  overallStat: {},
  overallStatValue: { fontSize: 14, fontWeight: 'bold' },
  overallStatLabel: { fontSize: 11, color: '#888' },
  overallBar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  overallBarFill: { height: 8, borderRadius: 4 },
  goalAnalyticsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  goalAnalyticsLeft: { flex: 1 },
  goalAnalyticsTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  goalAnalyticsSub: { fontSize: 11, color: '#888', marginTop: 2 },
  goalAnalyticsRight: { alignItems: 'flex-end', gap: 4, width: 80 },
  goalAnalyticsPercent: { fontSize: 13, fontWeight: 'bold' },
  goalMiniBar: { width: 70, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' },
  goalMiniBarFill: { height: 4, borderRadius: 2 },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 8 },
  insightIcon: { fontSize: 20 },
  insightText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  // Goals
  emptyState: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  createFirstBtn: { backgroundColor: '#0d47a1', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16 },
  createFirstBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  goalCard: { backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalTitle: { fontSize: 17, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  goalDesc: { fontSize: 12, color: '#888' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  amountsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  amountBox: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, alignItems: 'center' },
  amountBoxLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  amountBoxValue: { fontSize: 14, fontWeight: 'bold', color: '#0d47a1' },
  progressSection: { marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#888' },
  progressPercent: { fontSize: 12, fontWeight: 'bold' },
  progressBar: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: 10, borderRadius: 5 },
  autoDebitBadge: { backgroundColor: '#e3f2fd', borderRadius: 10, padding: 8, marginBottom: 8 },
  autoDebitBadgeText: { fontSize: 12, color: '#0d47a1' },
  targetDate: { fontSize: 12, color: '#888', marginBottom: 8 },
  penaltyWarning: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 8, marginBottom: 12 },
  penaltyWarningText: { fontSize: 12, color: '#f5a623' },
  actions: { flexDirection: 'row', gap: 8 },
  depositBtn: { flex: 2, backgroundColor: '#0d47a1', borderRadius: 12, padding: 14, alignItems: 'center' },
  depositBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  withdrawBtn: { flex: 1, backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, alignItems: 'center' },
  withdrawBtnEarly: { backgroundColor: '#fff3e0' },
  withdrawBtnText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },
  withdrawCompletedBtn: { backgroundColor: '#22c55e', borderRadius: 12, padding: 14, alignItems: 'center' },
  withdrawCompletedBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  // Create/Deposit
  createContent: { padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#0d47a1', marginBottom: 8, marginTop: 16 },
  categoryRow: { marginBottom: 8 },
  categoryChip: { alignItems: 'center', marginRight: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 2, borderColor: '#e0e0e0', width: 80 },
  categoryChipActive: { borderColor: '#0d47a1', backgroundColor: '#e3f2fd' },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  categoryLabelActive: { color: '#0d47a1' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', paddingHorizontal: 16, marginBottom: 4 },
  inputPrefix: { fontSize: 18, color: '#0d47a1', fontWeight: 'bold', marginRight: 8 },
  inputWithPrefix: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 16 },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#333' },
  textArea: { height: 80, textAlignVertical: 'top' },
  autoDebitSection: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 16, marginTop: 8 },
  autoDebitHint: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 8 },
  freqRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  freqBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  freqBtnActive: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  freqBtnText: { color: '#888', fontWeight: '600', fontSize: 12 },
  freqBtnTextActive: { color: '#fff' },
  summaryPreview: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 16, marginTop: 16 },
  summaryPreviewTitle: { fontSize: 14, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12 },
  summaryPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  summaryPreviewLabel: { fontSize: 13, color: '#888' },
  summaryPreviewValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  createGoalBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  createGoalBtnGradient: { padding: 18, alignItems: 'center' },
  createGoalBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  depositGoalInfo: { backgroundColor: '#e3f2fd', borderRadius: 16, padding: 16, marginBottom: 24 },
  depositGoalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8 },
  depositGoalProgress: { fontSize: 13, color: '#555', marginBottom: 8 },
  depositProgressBar: { height: 8, backgroundColor: '#c5d8f0', borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  depositProgressFill: { height: 8, backgroundColor: '#0d47a1', borderRadius: 4 },
  depositProgressPercent: { fontSize: 12, color: '#0d47a1', fontWeight: '600' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  quickAmountBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  quickAmountBtnActive: { backgroundColor: '#e3f2fd', borderColor: '#0d47a1' },
  quickAmountText: { fontSize: 12, color: '#888', fontWeight: '600' },
  quickAmountTextActive: { color: '#0d47a1' },
})
