import React, { useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { TopBar, Pill, Btn, ui } from '../components/ui'
import { F, ds, tnum } from '../constants/theme'
import { naira } from '../utils/ajoDue'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'

export default function ReceiptScreen({ route, navigation }: any) {
  const { transaction } = route.params
  const receiptRef = useRef<any>(null)
  const isCredit = transaction.type === 'CREDIT'
  const insets = useSafeAreaInsets()

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

  // OWODE Alajo Redesign "Receipt" board
  const ok = String(transaction.status || 'SUCCESS').toUpperCase() === 'SUCCESS'
  const when = new Date(transaction.createdAt)
  const h = when.getHours()
  const stamp = `${when.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}, ${h % 12 || 12}:${String(when.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
  const rows: [string, string][] = [
    ['Description', transaction.description || '—'],
    ['Type', isCredit ? 'Money in' : 'Money out'],
    ['Reference', transaction.reference || '—'],
    ['Date', stamp],
    ...(typeof transaction.balance === 'number' ? [['Balance after', naira(transaction.balance)] as [string, string]] : []),
  ]
  return (
    <View style={ui.screen}>
      <TopBar title="Receipt" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ui.body}>
        <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: ds.bg }}>
          <View style={r.card}>
            <View style={r.top}>
              <View style={[r.badge, !ok && { backgroundColor: ds.goldSoft }]}>
                <Icon name={ok ? 'check' : 'clock'} size={28} color={ok ? ds.navy : ds.goldInk} width={2.6} />
              </View>
              <Text style={r.label}>{isCredit ? 'You received' : 'You sent'}</Text>
              <Text style={r.amount}>{naira(transaction.amount || 0)}.00</Text>
              <Pill tone={ok ? 'blue' : 'gold'}>{ok ? 'Successful' : String(transaction.status || '').toLowerCase()}</Pill>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              {rows.map(([k, v], i) => (
                <View key={k} style={[r.row, i < rows.length - 1 && r.rowLine]}>
                  <Text style={r.key}>{k}</Text>
                  <Text style={r.val} numberOfLines={2}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={r.foot}>
              <Icon name="shieldCheck" size={16} color={ds.muted} width={2} />
              <Text style={r.footText}>Secured by OWODE Digital Services Limited</Text>
            </View>
          </View>
        </ViewShot>
      </ScrollView>
      <View style={[r.actions, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <Btn title="Share receipt" icon="share" onPress={handleShareAsImage} style={{ flex: 1 }} />
        <Btn title="Done" kind="outline" onPress={() => navigation.navigate('Dashboard')} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

const r = StyleSheet.create({
  card: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 22, overflow: 'hidden' },
  top: { paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#d3dbe8', borderStyle: 'dashed' },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.r },
  amount: { fontSize: 36, lineHeight: 44, color: ds.ink, fontFamily: F.x, letterSpacing: -0.5, ...tnum },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  key: { fontSize: 13, lineHeight: 16, color: ds.muted, fontFamily: F.r },
  val: { flex: 1, fontSize: 13, lineHeight: 17, color: ds.ink, fontFamily: F.b, textAlign: 'right' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: ds.bg },
  footText: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.r },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
})
