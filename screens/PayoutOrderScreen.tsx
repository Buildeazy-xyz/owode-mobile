import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { userAjoAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { TopBar, List, Btn, Note, ui } from '../components/ui'
import { F, ds } from '../constants/theme'

export default function PayoutOrderScreen({ navigation, route }: any) {
  const { groupId } = route.params || {}
  const [group, setGroup] = useState<any>(null)
  const [order, setOrder] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    userAjoAPI.mine()
      .then(res => {
        const g = (res.data.data || []).find((x: any) => x.id === groupId)
        if (!g) { Alert.alert('Not found', 'Could not load this group'); navigation.goBack(); return }
        setGroup(g)
        setOrder((g.members || []).filter((m: any) => m.status === 'APPROVED'))
      })
      .catch(() => { Alert.alert('Error', 'Could not load this group'); navigation.goBack() })
      .finally(() => setLoading(false))
  }, [groupId])

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }

  const save = async () => {
    try {
      setSaving(true)
      await userAjoAPI.setOrder(groupId, order.map(m => m.userId))
      Alert.alert('Saved', 'Payout order updated', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (e: any) {
      Alert.alert('Could not save', e.response?.data?.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  const locked = group?.approvalStatus === 'APPROVED'

  // OWODE Alajo Redesign "Payout order" board (arrows instead of drag: easier to tap)
  return (
    <View style={ui.screen}>
      <TopBar title="Payout order" onBack={() => navigation.goBack()} />
      {loading ? <OwodeLoader size="large" fullscreen color={ds.navy} /> : (
        <>
          <ScrollView contentContainerStyle={[ui.body, { gap: 14 }]}>
            <Text style={ui.lead}>
              {locked
                ? 'The group has started, so the order can no longer change.'
                : 'Position 1 collects first. Use the arrows to move members, then save. Everyone in the group sees this order.'}
            </Text>
            <List>
              {order.map((m, i) => (
                <View key={m.id} style={po.row}>
                  <View style={[po.pos, i === 0 && { backgroundColor: ds.gold }]}>
                    <Text style={[po.posText, i === 0 && { color: ds.hero }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={po.name} numberOfLines={1}>{m.user?.fullName || 'Member'}</Text>
                    <Text style={ui.muted}>Collects in cycle {i + 1}</Text>
                  </View>
                  {!locked && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity style={[po.arrow, i === 0 && { opacity: 0.35 }]} onPress={() => move(i, -1)} disabled={i === 0} accessibilityLabel="Move up">
                        <Icon name="up" size={18} color={ds.navy} width={2.2} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[po.arrow, i === order.length - 1 && { opacity: 0.35 }]} onPress={() => move(i, 1)} disabled={i === order.length - 1} accessibilityLabel="Move down">
                        <Icon name="down" size={18} color={ds.navy} width={2.2} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </List>
            <Note icon="lock">The order locks once OWODE approves the group.</Note>
          </ScrollView>
          {!locked && order.length > 0 ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 28) }}>
              <Btn title="Save payout order" onPress={save} loading={saving} />
            </View>
          ) : null}
        </>
      )}
    </View>
  )
}

const po = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  pos: { width: 30, height: 30, borderRadius: 15, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  posText: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.x },
  name: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  arrow: { width: 38, height: 38, borderRadius: 12, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
})

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, minHeight: 56 },
  headerTitle: { flex: 1, flexShrink: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { padding: 16 },
  noteCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#eaf2ff', borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { flex: 1, flexShrink: 1, fontSize: 12.5, lineHeight: 18, color: '#25427a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8 },
  pos: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#25427a', alignItems: 'center', justifyContent: 'center' },
  posText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  name: { fontSize: 14, fontWeight: '600', color: '#1a2b4a' },
  phone: { fontSize: 12, color: '#7c8aa5', marginTop: 2 },
  arrows: { flexDirection: 'row', gap: 6 },
  arrowBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  arrowOff: { backgroundColor: '#f0f2f7' },
  btn: { backgroundColor: '#25427a', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 14, minHeight: 50 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
})
