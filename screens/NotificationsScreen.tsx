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
import { IconName } from '../components/Icon'
import { TopBar, Tile, ui } from '../components/ui'
import { F, ds } from '../constants/theme'

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

  // OWODE Alajo Redesign "Notifications" board
  const [chip, setChip] = useState<'ALL' | 'MONEY' | 'AJO' | 'ACCOUNT'>('ALL')
  const isAjo = (n: OwodeNotification) => /aj[oọ]/i.test(`${n.title} ${n.body}`)
  const isMoney = (n: OwodeNotification) => n.kind === 'CREDIT' || n.kind === 'DEBIT'
  const shown = items.filter(n =>
    chip === 'ALL' ? true : chip === 'AJO' ? isAjo(n) : chip === 'MONEY' ? isMoney(n) && !isAjo(n) : !isMoney(n) && !isAjo(n))
  const today = new Date().toDateString()
  const groups = [
    { label: 'TODAY', list: shown.filter(n => new Date(n.createdAt).toDateString() === today) },
    { label: 'EARLIER', list: shown.filter(n => new Date(n.createdAt).toDateString() !== today) },
  ].filter(g => g.list.length)
  const look = (n: OwodeNotification): { icon: IconName; tone: 'blue' | 'gold' | 'grey' } =>
    isAjo(n) ? { icon: 'ajo', tone: 'gold' }
    : n.kind === 'CREDIT' ? { icon: 'receive', tone: 'blue' }
    : n.kind === 'DEBIT' ? { icon: 'send', tone: 'grey' }
    : n.kind === 'REWARD' ? { icon: 'gift', tone: 'gold' }
    : { icon: 'bell', tone: 'blue' }

  return (
    <View style={ui.screen}>
      <TopBar
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handleClear} disabled={items.length === 0} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[n.clear, items.length === 0 && { color: ds.muted }]}>Clear all</Text>
          </TouchableOpacity>
        }
      />
      {loading ? (
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      ) : (
        <ScrollView
          contentContainerStyle={[ui.body, { gap: 12 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.navy} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {([['ALL', 'All'], ['MONEY', 'Money'], ['AJO', 'Ajọ'], ['ACCOUNT', 'Account']] as const).map(([k, label]) => (
              <TouchableOpacity key={k} style={[n.chip, chip === k && n.chipOn]} onPress={() => setChip(k)}>
                <Text style={[n.chipText, chip === k && n.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {groups.length === 0 ? (
            <View style={n.empty}>
              <Tile icon="bell" size={56} />
              <Text style={n.emptyTitle}>No notifications yet</Text>
              <Text style={[ui.muted, { textAlign: 'center' }]}>Money received, Ajọ reminders and rewards will show up here.</Text>
            </View>
          ) : groups.map(g => (
            <View key={g.label} style={{ gap: 10 }}>
              <Text style={n.day}>{g.label}</Text>
              <View style={n.list}>
                {g.list.map((item, i) => {
                  const m = look(item)
                  return (
                    <View key={item.id} style={[n.row, i < g.list.length - 1 && n.line, !item.read && { backgroundColor: ds.goldWash }]}>
                      <Tile icon={m.icon} tone={m.tone} />
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Text style={[n.title, !item.read && { fontFamily: F.x }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={n.body}>{item.body}</Text>
                        <Text style={n.time}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      {!item.read ? <View style={n.dot} /> : null}
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const n = StyleSheet.create({
  clear: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: ds.hero, borderColor: ds.hero },
  chipText: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.s },
  chipTextOn: { color: '#ffffff', fontFamily: F.x },
  day: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6, paddingHorizontal: 4 },
  list: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  line: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  title: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  body: { fontSize: 13, lineHeight: 19, color: ds.inkSoft, fontFamily: F.r },
  time: { fontSize: 11, lineHeight: 14, color: ds.muted, fontFamily: F.r },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ds.gold, marginTop: 6 },
  empty: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, lineHeight: 20, color: ds.ink, fontFamily: F.x },
})
