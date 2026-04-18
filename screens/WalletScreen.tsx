import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { walletAPI } from '../utils/api'

export default function WalletScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'credit' | 'debit'>('credit')

  const loadWallet = async () => {
    try {
      const response = await walletAPI.getBalance()
      setWallet(response.data.data)
    } catch (error) {
      Alert.alert('Error', 'Could not load wallet')
    }
  }

  useEffect(() => { loadWallet() }, [])

  const handleTransaction = async () => {
    if (!amount || !description) { Alert.alert('Error', 'Amount and description are required'); return }
    try {
      setLoading(true)
      if (activeTab === 'credit') {
        await walletAPI.credit(Number(amount), description)
        Alert.alert('Success', `₦${Number(amount).toLocaleString()} added to your wallet!`)
      } else {
        await walletAPI.debit(Number(amount), description)
        Alert.alert('Success', `₦${Number(amount).toLocaleString()} withdrawn!`)
      }
      setAmount(''); setDescription('')
      await loadWallet()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>₦{wallet?.balance?.toLocaleString() || '0'}</Text>
        </View>
      </LinearGradient>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'credit' && styles.activeTab]} onPress={() => setActiveTab('credit')}>
          <Text style={[styles.tabText, activeTab === 'credit' && styles.activeTabText]}>➕ Add Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'debit' && styles.activeTab]} onPress={() => setActiveTab('debit')}>
          <Text style={[styles.tabText, activeTab === 'debit' && styles.activeTabText]}>➖ Withdraw</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Amount (₦)" placeholderTextColor="#888" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#888" value={description} onChangeText={setDescription} />
        <TouchableOpacity style={[styles.button, { backgroundColor: activeTab === 'credit' ? '#22c55e' : '#ef4444' }]} onPress={handleTransaction} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{activeTab === 'credit' ? 'Add Money' : 'Withdraw'}</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>
      {wallet?.transactions?.map((tx: any) => (
        <View key={tx.id} style={styles.txCard}>
          <View style={[styles.txIconCircle, { backgroundColor: tx.type === 'CREDIT' ? '#e8f5e9' : '#ffebee' }]}>
            <Text>{tx.type === 'CREDIT' ? '⬆️' : '⬇️'}</Text>
          </View>
          <View style={styles.txMiddle}>
            <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
            <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#22c55e' : '#ef4444' }]}>
            {tx.type === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30 },
  back: { color: '#f5a623', fontSize: 16, marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  balanceCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 8 },
  tabRow: { flexDirection: 'row', margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tab: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  activeTab: { backgroundColor: '#0d47a1' },
  tabText: { color: '#888', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  form: { margin: 16 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1', marginHorizontal: 16, marginBottom: 12 },
  txCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  txIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txMiddle: { flex: 1 },
  txDesc: { fontSize: 14, color: '#333', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#888', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' }
})