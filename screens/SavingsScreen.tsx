import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, RefreshControl, Modal,
  TextInput, ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { savingsAPI } from '../utils/api'

export default function SavingsScreen({ navigation }: any) {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [depositModal, setDepositModal] = useState(false)
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
        title,
        description,
        goalAmount: Number(goalAmount),
        initialDeposit: initialDeposit ? Number(initialDeposit) : undefined,
        autoDebitAmount: autoDebitAmount ? Number(autoDebitAmount) : undefined,
        autoDebitFreq: autoDebitAmount ? autoDebitFreq : undefined,
        targetDate
      })
      Alert.alert('🎯 Goal Created!', `Your savings goal "${title}" has been created!`)
      setCreateModal(false)
      setTitle(''); setDescription(''); setGoalAmount('')
      setInitialDeposit(''); setTargetDate(''); setAutoDebitAmount('')
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
      setDepositModal(false)
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
              setSaving(true)
              const response = await savingsAPI.withdraw(goal.id)
              Alert.alert('✅ Withdrawn!', response.data.message)
              await loadGoals()
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
            } finally {
              setSaving(false)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#22c55e'
      case 'WITHDRAWN': return '#888'
      case 'CANCELLED': return '#ef4444'
      default: return '#0d47a1'
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🐷 My Savings</Text>
        <TouchableOpacity onPress={() => setCreateModal(true)}>
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
              <Text style={styles.emptySubText}>Create your first savings goal and start building your future!</Text>
              <TouchableOpacity style={styles.createFirstBtn} onPress={() => setCreateModal(true)}>
                <Text style={styles.createFirstBtnText}>🎯 Create First Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            goals.map(goal => (
              <View key={goal.id} style={styles.goalCard}>
                {/* Header */}
                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    {goal.description ? (
                      <Text style={styles.goalDesc}>{goal.description}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(goal.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(goal.status) }]}>
                      {goal.status}
                    </Text>
                  </View>
                </View>

                {/* Amounts */}
                <View style={styles.amountsRow}>
                  <View>
                    <Text style={styles.currentAmountLabel}>Saved</Text>
                    <Text style={styles.currentAmount}>₦{goal.currentAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountsDivider} />
                  <View>
                    <Text style={styles.goalAmountLabel}>Target</Text>
                    <Text style={styles.goalAmountText}>₦{goal.goalAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountsDivider} />
                  <View>
                    <Text style={styles.daysLeftLabel}>Days Left</Text>
                    <Text style={[styles.daysLeftText, { color: goal.daysLeft === 0 ? '#22c55e' : goal.daysLeft < 30 ? '#f5a623' : '#0d47a1' }]}>
                      {goal.daysLeft === 0 ? '🎉 Ready!' : `${goal.daysLeft}d`}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
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
                      {
                        width: `${Math.min(goal.progress, 100)}%`,
                        backgroundColor: getProgressColor(goal.progress)
                      }
                    ]} />
                  </View>
                </View>

                {/* Auto debit info */}
                {goal.autoDebitAmount > 0 && (
                  <View style={styles.autoDebitInfo}>
                    <Text style={styles.autoDebitText}>
                      🔄 Auto-debit: ₦{goal.autoDebitAmount?.toLocaleString()} {goal.autoDebitFreq?.toLowerCase()}
                    </Text>
                  </View>
                )}

                {/* Target date */}
                <Text style={styles.targetDate}>
                  🎯 Target: {new Date(goal.targetDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>

                {/* Early withdrawal warning */}
                {!goal.canWithdrawFree && goal.status === 'ACTIVE' && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ Early withdrawal penalty: {goal.penaltyPercent}%
                    </Text>
                  </View>
                )}

                {/* Actions */}
                {goal.status === 'ACTIVE' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.depositBtn}
                      onPress={() => { setSelectedGoal(goal); setDepositModal(true) }}
                    >
                      <Text style={styles.depositBtnText}>💰 Add Money</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.withdrawBtn, !goal.canWithdrawFree && styles.withdrawBtnEarly]}
                      onPress={() => handleWithdraw(goal)}
                    >
                      <Text style={styles.withdrawBtnText}>
                        {goal.canWithdrawFree ? '🏦 Withdraw' : '⚠️ Early Withdraw'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {goal.status === 'COMPLETED' && (
                  <View style={styles.completedBanner}>
                    <Text style={styles.completedBannerText}>🎉 Goal Reached! Withdraw your savings!</Text>
                    <TouchableOpacity style={styles.withdrawCompletedBtn} onPress={() => handleWithdraw(goal)}>
                      <Text style={styles.withdrawCompletedBtnText}>🏦 Withdraw Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Create Goal Modal */}
      <Modal visible={createModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>🎯 Create Savings Goal</Text>
              <Text style={styles.modalSubtitle}>Set a target and start saving!</Text>

              <TextInput
                style={styles.input}
                placeholder="Goal title (e.g. New iPhone)"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Description (optional)"
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Goal amount (₦)"
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Initial deposit (₦) — optional"
                value={initialDeposit}
                onChangeText={setInitialDeposit}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Target date (YYYY-MM-DD)"
                value={targetDate}
                onChangeText={setTargetDate}
              />

              <Text style={styles.sectionLabel}>Auto-debit (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Auto-debit amount (₦)"
                value={autoDebitAmount}
                onChangeText={setAutoDebitAmount}
                keyboardType="numeric"
              />

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

              <View style={styles.penaltyInfo}>
                <Text style={styles.penaltyInfoText}>
                  ⚠️ Early withdrawal penalty: 5% of saved amount
                </Text>
              </View>

              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>🎯 Create Goal</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCreateModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Deposit Modal */}
      <Modal visible={depositModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>💰 Add Money</Text>
            {selectedGoal && (
              <Text style={styles.modalSubtitle}>
                Adding to: {selectedGoal.title}
              </Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Amount to deposit (₦)"
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              autoFocus
            />
            {selectedGoal && depositAmount && (
              <View style={styles.depositPreview}>
                <Text style={styles.depositPreviewText}>
                  New total: ₦{(selectedGoal.currentAmount + Number(depositAmount)).toLocaleString()}
                </Text>
                <Text style={styles.depositPreviewText}>
                  Progress: {Math.round(((selectedGoal.currentAmount + Number(depositAmount)) / selectedGoal.goalAmount) * 100)}%
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.createBtn} onPress={handleDeposit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>💰 Deposit</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDepositModal(false); setDepositAmount('') }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12 },
  currentAmountLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  currentAmount: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1' },
  goalAmountLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  goalAmountText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  daysLeftLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  daysLeftText: { fontSize: 16, fontWeight: 'bold' },
  amountsDivider: { width: 1, height: 30, backgroundColor: '#e0e0e0' },
  progressSection: { marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#888' },
  progressPercent: { fontSize: 12, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4 },
  progressBarFill: { height: 8, borderRadius: 4 },
  autoDebitInfo: { backgroundColor: '#e3f2fd', borderRadius: 10, padding: 10, marginBottom: 8 },
  autoDebitText: { fontSize: 12, color: '#0d47a1' },
  targetDate: { fontSize: 12, color: '#888', marginBottom: 8 },
  warningBox: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 10, marginBottom: 12 },
  warningText: { fontSize: 12, color: '#f5a623' },
  actions: { flexDirection: 'row', gap: 8 },
  depositBtn: { flex: 1, backgroundColor: '#0d47a1', borderRadius: 12, padding: 12, alignItems: 'center' },
  depositBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  withdrawBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, padding: 12, alignItems: 'center' },
  withdrawBtnEarly: { backgroundColor: '#fee2e2' },
  withdrawBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  completedBanner: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 16, alignItems: 'center' },
  completedBannerText: { color: '#22c55e', fontWeight: 'bold', fontSize: 14, marginBottom: 12 },
  withdrawCompletedBtn: { backgroundColor: '#22c55e', borderRadius: 12, padding: 12, paddingHorizontal: 24 },
  withdrawCompletedBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, color: '#333' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 8 },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  freqBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, alignItems: 'center' },
  freqBtnActive: { backgroundColor: '#0d47a1' },
  freqBtnText: { color: '#888', fontWeight: '600', fontSize: 12 },
  freqBtnTextActive: { color: '#fff' },
  penaltyInfo: { backgroundColor: '#fff3e0', borderRadius: 12, padding: 12, marginBottom: 16 },
  penaltyInfoText: { fontSize: 12, color: '#f5a623' },
  createBtn: { backgroundColor: '#0d47a1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelText: { textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 8 },
  depositPreview: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 12, marginBottom: 16 },
  depositPreviewText: { fontSize: 13, color: '#0d47a1', marginBottom: 4 }
})