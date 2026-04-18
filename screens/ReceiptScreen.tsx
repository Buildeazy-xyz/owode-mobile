import React, { useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'

export default function ReceiptScreen({ route, navigation }: any) {
  const { transaction } = route.params
  const receiptRef = useRef<any>(null)
  const isCredit = transaction.type === 'CREDIT'

  const handleShareAsImage = async () => {
    try {
      const uri = await receiptRef.current.capture()
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share OWODE Receipt'
        })
      } else {
        Alert.alert('Error', 'Sharing is not available on this device')
      }
    } catch (error) {
      Alert.alert('Error', 'Could not capture receipt')
    }
  }

  return (
    <ScrollView style={styles.container}>
      <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }}>
        <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
          <View style={[styles.statusCircle, { backgroundColor: isCredit ? '#22c55e' : '#f5a623' }]}>
            <Text style={styles.statusIcon}>{isCredit ? '✅' : '💸'}</Text>
          </View>
          <Text style={styles.statusText}>{isCredit ? 'Money Received!' : 'Transfer Successful!'}</Text>
          <Text style={styles.amount}>₦{transaction.amount?.toLocaleString()}</Text>
        </LinearGradient>

        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.owodeLogo}>OWODE</Text>
            <Text style={styles.receiptTitle}>Transaction Receipt</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <Text style={[styles.rowValue, { color: '#22c55e', fontWeight: 'bold' }]}>✅ {transaction.status}</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Type</Text>
            <Text style={styles.rowValue}>{transaction.type}</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Amount</Text>
            <Text style={[styles.rowValue, { color: isCredit ? '#22c55e' : '#ef4444', fontWeight: 'bold' }]}>
              {isCredit ? '+' : '-'}₦{transaction.amount?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>New Balance</Text>
            <Text style={styles.rowValue}>₦{transaction.balance?.toLocaleString()}</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Description</Text>
            <Text style={[styles.rowValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>{transaction.description}</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Reference</Text>
            <Text style={[styles.rowValue, { fontSize: 11, flex: 1, textAlign: 'right' }]}>{transaction.reference}</Text>
          </View>
          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date & Time</Text>
            <Text style={styles.rowValue}>{new Date(transaction.createdAt).toLocaleString()}</Text>
          </View>

          <View style={styles.poweredBy}>
            <View style={styles.poweredByLine} />
            <Text style={styles.poweredByText}>🔒 Secured by OWODE Digital Services Limited</Text>
            <View style={styles.poweredByLine} />
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.shareButton} onPress={handleShareAsImage}>
        <Text style={styles.shareButtonText}>📤 Share Receipt as Image</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.doneButton} onPress={() => navigation.navigate('Dashboard')}>
        <Text style={styles.doneButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 40, alignItems: 'center', paddingTop: 80 },
  statusCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusIcon: { fontSize: 36 },
  statusText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  amount: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  receiptCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  receiptHeader: { alignItems: 'center', marginBottom: 20 },
  owodeLogo: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1', letterSpacing: 4 },
  receiptTitle: { fontSize: 14, color: '#888', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowLabel: { fontSize: 14, color: '#888', flex: 1 },
  rowValue: { fontSize: 14, color: '#333' },
  separator: { height: 1, backgroundColor: '#f5f5f5' },
  poweredBy: { marginTop: 20, alignItems: 'center', gap: 8 },
  poweredByLine: { height: 1, backgroundColor: '#f0f0f0', width: '100%' },
  poweredByText: { fontSize: 11, color: '#888', textAlign: 'center' },
  shareButton: { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#0d47a1' },
  shareButtonText: { color: '#0d47a1', fontSize: 16, fontWeight: 'bold' },
  doneButton: { margin: 16, marginTop: 0, backgroundColor: '#0d47a1', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 40 },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
})