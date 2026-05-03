import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl, Modal,
  TextInput, ActivityIndicator, Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { savingsAPI } from '../utils/api'

const GOAL_CATEGORIES = [
  { icon: '📱', label: 'Gadget' },
  { icon: '🏠', label: 'House' },
  { icon: '🚗', label: 'Car' },
  { icon: '✈️', label: 'Travel' },
  { icon: '📚', label: 'Education' },
  { icon: '💒', label: 'Wedding' },
  { icon: '🏥', label: 'Medical' },
  { icon: '💼', label: 'Business' },
  { icon: '🎁', label: 'Gift' },
  { icon: '🐷', label: 'General' },
]

export default function SavingsScreen({ navigation }: any) {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [screen, setScreen] = useState<'list' | 'create' | 'deposit'>('list')
  const [selectedGoal, setSelectedGoal] = useState<any>(null)
  const [saving, setSaving] = useState(false)

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
    } catch (error) {
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
      Alert.alert('🎯 Goal Created!', `Your savings goal has been created!`)
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
      isEarly ? '⚠️ Early Withdrawal' : '💰 Withdraw Savings',
      isEarly
        ? `Withdrawing early will deduct a ${goal.penaltyPercent}% penalty fee.\n\nPenalty: ₦${(goal.currentAmount * goal.penaltyPercent / 100).toLocaleString()}\nYou will receive: ₦${(goal.currentAmount * (1 - goal.penaltyPercent / 100)).toLocaleString()}`
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

  // CREATE SCREEN
  if (screen === 'create') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.createHeader}>
          <TouchableOpacity onPress={() => setScreen('list')}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🎯 Create Goal</Text>
          <View style={{ width: 50 }} />
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.createContent}>

            {/* Category Selector */}
            <Text style={styles.fieldLabel}>What are you saving for?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
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

            {/* Goal Title */}
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

            {/* Description */}
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

            {/* Goal Amount */}
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

            {/* Initial Deposit */}
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

            {/* Target Date */}
            <Text style={styles.fieldLabel}>Target Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g. 2026-12-31)"
              placeholderTextColor="#aaa"
              value={targetDate}
              onChangeText={setTargetDate}
            />

            {/* Auto Debit */}
            <View style={styles.autoDebitSection}>
              <View style={styles.autoDebitHeader}>
                <Text style={styles.fieldLabel}>🔄 Auto-Debit Setup</Text>
                <Text style={styles.autoDebitHint}>Automatically save from wallet</Text>
              </View>
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

            {/* Summary Card */}
            {goalAmount && targetDate ? (
              <View style={styles.summaryPreview}>
                <Text style={styles.summaryPreviewTitle}>📋 Goal Summary</Text>
                <View style={styles.summaryPreviewRow}>
                  <Text style={styles.summaryPreviewLabel}>Goal</Text>
                  <Text style={styles.summaryPreviewValue}>{selectedCategory.icon} {title || 'Untitled'}</Text>
                </View>
                <View style={styles.summaryPreviewRow}>
                  <Text style={styles.summaryPreviewLabel}>Target Amount</Text>
                  <Text style={styles.summaryPreviewValue}>₦{Number(goalAmount).toLocaleString()}</Text>
                </View>
                {initialDeposit ? (
                  <View style={styles.summaryPreviewRow}>
                    <Text style={styles.summaryPreviewLabel}>Starting with</Text>
                    <Text style={styles.summaryPreviewValue}>₦{Number(initialDeposit).toLocaleString()}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryPreviewRow}>
                  <Text style={styles.summaryPreviewLabel}>Target Date</Text>
                  <Text style={styles.summaryPreviewValue}>{targetDate}</Text>
                </View>
                {autoDebitAmount ? (
                  <View style={styles.summaryPreviewRow}>
                    <Text style={styles.summaryPreviewLabel}>Auto-save</Text>
                    <Text style={styles.summaryPreviewValue}>₦{Number(autoDebitAmount).toLocaleString()} {autoDebitFreq.toLowerCase()}</Text>
                  </View>
                ) : null}
                <View style={[styles.summaryPreviewRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryPreviewLabel}>Early withdrawal penalty</Text>
                  <Text style={[styles.summaryPreviewValue, { color: '#f5a623' }]}>5%</Text>
                </View>
              </View>
            ) : null}

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createGoalBtn, saving && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              <LinearGradient colors={['#0d47a1', '#1565c0']} style={styles.createGoalBtnGradient}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createGoalBtnText}>🎯 Create Savings Goal</Text>
                )}
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
          <Text style={styles.headerTitle}>💰 Add Money</Text>
          <View style={{ width: 50 }} />
        </LinearGradient>

        <View style={styles.depositContent}>
          {selectedGoal && (
            <>
              <View style={styles.depositGoalInfo}>
                <Text style={styles.depositGoalTitle}>{selectedGoal.title}</Text>
                <Text style={styles.depositGoalProgress}>
                  ₦{selectedGoal.currentAmount?.toLocaleString()} of ₦{selectedGoal.goalAmount?.toLocaleString()}
                </Text>
                <View style={styles.depositProgressBar}>
                  <View style={[
                    styles.depositProgressFill,
                    { width: `${Math.min(selectedGoal.progress, 100)}%` }
                  ]} />
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

              {depositAmount && Number(depositAmount) > 0 && (
                <View style={styles.summaryPreview}>
                  <View style={styles.summaryPreviewRow}>
                    <Text style={styles.summaryPreviewLabel}>Current savings</Text>
                    <Text style={styles.summaryPreviewValue}>₦{selectedGoal.currentAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryPreviewRow}>
                    <Text style={styles.summaryPreviewLabel}>Adding</Text>
                    <Text style={[styles.summaryPreviewValue, { color: '#22c55e' }]}>+₦{Number(depositAmount).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.summaryPreviewRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.summaryPreviewLabel, { fontWeight: 'bold' }]}>New total</Text>
                    <Text style={[styles.summaryPreviewValue, { fontWeight: 'bold', color: '#0d47a1' }]}>
                      ₦{(selectedGoal.currentAmount + Number(depositAmount)).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.createGoalBtn, saving && { opacity: 0.7 }]}
                onPress={handleDeposit}
                disabled={saving}
              >
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.createGoalBtnGradient}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createGoalBtnText}>💰 Deposit to Savings</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
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
        <Text style={styles.summaryAmount}>
          ₦{goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0).toLocaleString()}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{goals.filter(g => g.status === 'ACTIVE').length}</Text>
            <Text style={styles.summaryItemLabel}>Active Goals</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{goals.filter(g => g.status === 'COMPLETED').length}</Text>
            <Text style={styles.summaryItemLabel}>Completed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>
              ₦{goals.reduce((sum, g) => sum + (g.goalAmount || 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryItemLabel}>Total Target</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🐷</Text>
              <Text style={styles.emptyText}>No savings goals yet</Text>
              <Text style={styles.emptySubText}>Create your first goal and start building your future!</Text>
              <TouchableOpacity style={styles.createFirstBtn} onPress={() => setScreen('create')}>
                <Text style={styles.createFirstBtnText}>🎯 Create First Goal</Text>
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
                    backgroundColor: goal.status === 'COMPLETED' ? '#e8f5e9' :
                      goal.status === 'WITHDRAWN' ? '#f5f5f5' : '#e3f2fd'
                  }]}>
                    <Text style={[styles.statusBadgeText, {
                      color: goal.status === 'COMPLETED' ? '#22c55e' :
                        goal.status === 'WITHDRAWN' ? '#888' : '#0d47a1'
                    }]}>
                      {goal.status === 'COMPLETED' ? '✅ Done' :
                        goal.status === 'WITHDRAWN' ? '🏦 Withdrawn' : '🔵 Active'}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountsRow}>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Saved</Text>
                    <Text style={styles.amountBoxValue}>₦{goal.currentAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Target</Text>
                    <Text style={styles.amountBoxValue}>₦{goal.goalAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountBoxLabel}>Days Left</Text>
                    <Text style={[styles.amountBoxValue, {
                      color: goal.daysLeft === 0 ? '#22c55e' : goal.daysLeft < 30 ? '#f5a623' : '#0d47a1'
                    }]}>
                      {goal.daysLeft === 0 ? '🎉' : `${goal.daysLeft}d`}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={[styles.progressPercent, { color: getProgressColor(goal.progress) }]}>
                      {goal.progress}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressBarFill,
                      { width: `${Math.min(goal.progress, 100)}%`, backgroundColor: getProgressColor(goal.progress) }
                    ]} />
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
                  🎯 Target: {new Date(goal.targetDate).toLocaleDateString('en-NG', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </Text>

                {!goal.canWithdrawFree && goal.status === 'ACTIVE' && (
                  <View style={styles.penaltyWarning}>
                    <Text style={styles.penaltyWarningText}>⚠️ Early withdrawal: {goal.penaltyPercent}% penalty applies</Text>
                  </View>
                )}

                {goal.status === 'ACTIVE' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.depositBtn}
                      onPress={() => { setSelectedGoal(goal); setScreen('deposit') }}
                    >
                      <Text style={styles.depositBtnText}>💰 Add Money</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.withdrawBtn, !goal.canWithdrawFree && styles.withdrawBtnEarly]}
                      onPress={() => handleWithdraw(goal)}
                    >
                      <Text style={[styles.withdrawBtnText, !goal.canWithdrawFree && { color: '#f5a623' }]}>
                        {goal.canWithdrawFree ? '🏦 Withdraw' : '⚠️ Early'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {goal.status === 'COMPLETED' && (
                  <TouchableOpacity style={styles.withdrawCompletedBtn} onPress={() => handleWithdraw(goal)}>
                    <Text style={styles.withdrawCompletedBtnText}>🎉 Goal Reached! Withdraw Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
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
  progressBar: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5 },
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
  createContent: { padding: 20 },
  depositContent: { padding: 20, flex: 1 },
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
  autoDebitHeader: { marginBottom: 12 },
  autoDebitHint: { fontSize: 12, color: '#888', marginTop: 2 },
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
  depositProgressBar: { height: 8, backgroundColor: '#c5d8f0', borderRadius: 4, marginBottom: 4 },
  depositProgressFill: { height: 8, backgroundColor: '#0d47a1', borderRadius: 4 },
  depositProgressPercent: { fontSize: 12, color: '#0d47a1', fontWeight: '600' }
})