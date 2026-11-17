import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { guaranteedAjoAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'
import { TopBar, Card, List, Tile, Pill, Section, Note, ui } from '../components/ui'
import { F, ds, tnum } from '../constants/theme'
import { naira } from '../utils/ajoDue'

export default function GroupHistoryScreen({ route, navigation }: any) {
  const { groupId } = route.params
  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await guaranteedAjoAPI.getGroup(groupId)
        setGroup(response.data.data)
      } catch (error) {
        console.error('Could not load group')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // OWODE Alajo Redesign "Group history" board
  const cycles: any[] = group?.cycles || []
  const paidOut = cycles.reduce((t, c) => t + (c.totalAmount || 0), 0)
  const defaults: any[] = group?.defaultRecords || []
  const real = (group?.members || []).filter((m: any) => !m.isAvatar).sort((a: any, b: any) => a.position - b.position)
  return (
    <View style={ui.screen}>
      <TopBar title="Group history" onBack={() => navigation.goBack()} />
      {loading ? (
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      ) : !group ? (
        <View style={ui.body}><Note icon="alert">Could not load this group. Pull back and try again.</Note></View>
      ) : (
        <ScrollView contentContainerStyle={[ui.body, { gap: 12 }]}>
          <Text style={gh.name}>{group.name}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['PAID OUT', naira(paidOut)], ['CYCLE', `${group.currentCycle} of ${Math.max(1, group.totalMembers - 1)}`], ['MISSED', String(defaults.length)]].map(([k, v]) => (
              <View key={k} style={gh.stat}>
                <Text style={gh.statKey}>{k}</Text>
                <Text style={gh.statVal} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
              </View>
            ))}
          </View>

          <Section>Cycles</Section>
          {cycles.length === 0 ? (
            <Card><Text style={ui.muted}>No completed cycles yet</Text></Card>
          ) : (
            <List>
              {cycles.map((c: any) => (
                <View key={c.id} style={gh.row}>
                  <View style={[gh.dot, { backgroundColor: ds.divider }]}><Text style={[gh.dotText, { color: ds.muted }]}>{c.cycleNumber}</Text></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={gh.rowTitle}>Cycle {c.cycleNumber}{c.avatarCovered ? ' · OWODE covered' : ''}</Text>
                    <Text style={ui.muted}>{new Date(c.completedAt || c.startedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <Text style={gh.amt}>{naira(c.totalAmount || 0)}</Text>
                </View>
              ))}
            </List>
          )}

          <Section>Members</Section>
          <List>
            {real.map((m: any) => {
              const st = m.payoutReceived ? { t: 'Paid out', tone: 'blue' as const }
                : m.hasPaid ? { t: 'Contributed', tone: 'blue' as const }
                : { t: 'Pending', tone: 'gold' as const }
              return (
                <View key={m.id} style={gh.row}>
                  <View style={gh.dot}><Text style={gh.dotText}>{m.position}</Text></View>
                  <Text style={[gh.rowTitle, { flex: 1 }]} numberOfLines={1}>{m.user?.fullName}</Text>
                  <Pill tone={st.tone}>{st.t}</Pill>
                </View>
              )
            })}
          </List>

          <Section>Missed payments</Section>
          {defaults.length === 0 ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Tile icon="checkCircle" />
              <Text style={[ui.muted, { flex: 1 }]}>No missed payments in this group</Text>
            </Card>
          ) : (
            <List>
              {defaults.map((r: any) => (
                <View key={r.id} style={gh.row}>
                  <Tile icon="alert" tone="red" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={gh.rowTitle} numberOfLines={1}>{r.user?.fullName}</Text>
                    <Text style={ui.muted}>Owes {naira(r.amountOwed || 0)}</Text>
                  </View>
                  <Pill tone={r.recoveryStatus === 'RECOVERED' ? 'blue' : r.recoveryStatus === 'HARD_RECOVERY' ? 'red' : 'gold'}>
                    {String(r.recoveryStatus || '').replace('_', ' ').toLowerCase()}
                  </Pill>
                </View>
              ))}
            </List>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const gh = StyleSheet.create({
  name: { fontSize: 18, lineHeight: 22, color: ds.ink, fontFamily: F.x },
  stat: { flex: 1, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 16, padding: 12, gap: 4 },
  statKey: { fontSize: 11, lineHeight: 14, color: ds.muted, fontFamily: F.b, letterSpacing: 0.5 },
  statVal: { fontSize: 17, lineHeight: 21, color: ds.ink, fontFamily: F.x, ...tnum },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.x },
  rowTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  amt: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x, ...tnum },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  groupInfo: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, alignItems: 'center' },
  groupName: { fontSize: 20, fontWeight: 'bold', color: '#25427a', marginBottom: 4 },
  groupCycle: { fontSize: 14, color: '#7c8aa5' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#25427a', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  memberCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  positionBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  positionText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1a2b4a' },
  memberPhone: { fontSize: 12, color: '#7c8aa5', marginTop: 2 },
  memberStatus: { alignItems: 'flex-end' },
  payoutReceived: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  hasPaid: { fontSize: 12, color: '#25427a', fontWeight: '600' },
  pending: { fontSize: 12, color: '#7c8aa5' },
  avatarReady: { fontSize: 12, color: '#f5a623', fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 20 },
  emptyText: { color: '#7c8aa5', fontSize: 14 },
  cycleCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cycleLeft: {},
  cycleNumber: { fontSize: 14, fontWeight: 'bold', color: '#1a2b4a' },
  cycleDate: { fontSize: 12, color: '#7c8aa5', marginTop: 2 },
  cycleRight: { alignItems: 'flex-end' },
  cycleAmount: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' },
  avatarCovered: { fontSize: 11, color: '#f5a623', marginTop: 2 },
  defaultCard: { backgroundColor: '#ffebee', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16 },
  defaultUser: { fontSize: 14, fontWeight: 'bold', color: '#1a2b4a' },
  defaultAmount: { fontSize: 13, color: '#ef4444', marginTop: 2 },
  defaultStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 }
})