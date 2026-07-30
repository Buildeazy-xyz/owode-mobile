import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { userAjoAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'

export default function PayoutOrderScreen({ navigation, route }: any) {
  const { groupId } = route.params || {}
  const [group, setGroup] = useState<any>(null)
  const [order, setOrder] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#1a2e55', '#25427a']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Payout order</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      {loading ? <OwodeLoader size="large" fullscreen color="#25427a"  /> : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.noteCard}>
            <Ionicons name={locked ? 'lock-closed' : 'swap-vertical'} size={17} color="#25427a" />
            <Text style={styles.noteText}>
              {locked
                ? 'The group has started, so the order can no longer change.'
                : 'Position 1 collects first. Use the arrows, then save. The order locks once OWODE approves the group.'}
            </Text>
          </View>

          {order.map((m, i) => (
            <View key={m.id} style={styles.row}>
              <View style={styles.pos}><Text style={styles.posText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{m.user?.fullName || 'Member'}</Text>
                <Text style={styles.phone} numberOfLines={1}>{m.user?.phone || ''}</Text>
              </View>
              {!locked && (
                <View style={styles.arrows}>
                  <TouchableOpacity style={[styles.arrowBtn, i === 0 && styles.arrowOff]} onPress={() => move(i, -1)} disabled={i === 0}>
                    <Ionicons name="chevron-up" size={18} color={i === 0 ? '#c3cbda' : '#25427a'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.arrowBtn, i === order.length - 1 && styles.arrowOff]} onPress={() => move(i, 1)} disabled={i === order.length - 1}>
                    <Ionicons name="chevron-down" size={18} color={i === order.length - 1 ? '#c3cbda' : '#25427a'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {!locked && order.length > 0 && (
            <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
              {saving ? <OwodeLoader color="#fff" /> : <Text style={styles.btnText}>Save payout order</Text>}
            </TouchableOpacity>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  )
}

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
