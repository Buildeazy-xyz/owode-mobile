import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import {
  getNotifications, clearNotifications, markAllRead, OwodeNotification,
} from '../utils/notificationStore'
import OwodeLoader from '../components/OwodeLoader'

const C = {
  navy: '#0d47a1',
  navyLight: '#1565c0',
  gold: '#f5a623',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a2b4a',
  muted: '#7c8aa5',
  green: '#22c55e',
  red: '#ef4444',
  divider: '#f0f2f7',
}

const META: Record<string, { icon: any; tint: string; bg: string }> = {
  CREDIT: { icon: 'arrow-down-circle', tint: C.green, bg: '#e9f9ef' },
  DEBIT:  { icon: 'arrow-up-circle',   tint: C.red,   bg: '#fdecec' },
  REWARD: { icon: 'gift',              tint: C.gold,  bg: '#fef4e3' },
  INFO:   { icon: 'information-circle', tint: C.navy, bg: '#e8effb' },
}

const timeAgo = (iso: string) => {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  if (hrs < 48) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>()
  const [items, setItems] = useState<OwodeNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const list = await getNotifications()
    setItems(list)
    setLoading(false)
    await markAllRead()
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = async () => {
    setRefreshing(true)
    const list = await getNotifications()
    setItems(list)
    setRefreshing(false)
  }

  const handleClear = () => {
    if (items.length === 0) return
    Alert.alert('Clear all', 'Remove every notification from this list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all', style: 'destructive',
        onPress: async () => { await clearNotifications(); setItems([]) },
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Notifications</Text>
        <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
          <Text style={[styles.clear, items.length === 0 && { color: C.muted }]} numberOfLines={1}>
            Clear all
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <OwodeLoader color={C.navy} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={34} color={C.navy} />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            Credit alerts, Ajo payouts and rewards will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {items.map(item => {
            const m = META[item.kind] || META.INFO
            return (
              <View key={item.id} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={20} color={m.tint} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.rowTime} numberOfLines={1}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.rowText}>{item.body}</Text>
                </View>
              </View>
            )
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, minHeight: 56,
  },
  headerTitle: {
    flex: 1, flexShrink: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '700', color: C.text,
  },
  clear: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: C.navy },

  list: { padding: 16, paddingTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card, borderRadius: 18,
    padding: 16, marginBottom: 12, minHeight: 72,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, minHeight: 20 },
  rowTitle: { flex: 1, flexShrink: 1, fontSize: 14, fontWeight: '700', color: C.text },
  rowTime: { flexShrink: 1, marginLeft: 8, fontSize: 11, color: C.muted },
  rowText: { fontSize: 13, lineHeight: 19, color: C.muted },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 100 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#e8effb',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 20, color: C.muted, textAlign: 'center' },
})
