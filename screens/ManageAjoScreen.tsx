import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
   Alert, Share, RefreshControl
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { userAjoAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'
import Icon from '../components/Icon'
import { TopBar, Card, List, Pill, Btn, Eyebrow, Section, Note, ui } from '../components/ui'
import { F, ds } from '../constants/theme'
import { initials } from '../utils/ajoDue'

export default function ManageAjoScreen({ navigation, route }: any) {
  const { groupId, groupName, inviteCode, amount, frequency } = route.params || {}
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await userAjoAPI.getRequests(groupId)
      setData(res.data.data)
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not load the group')
    } finally { setLoading(false) }
  }, [groupId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const respond = async (m: any, accept: boolean) => {
    try {
      setBusy(m.id)
      await userAjoAPI.respondToRequest(m.id, accept)
      await load()
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Something went wrong')
    } finally { setBusy('') }
  }

  const remove = (m: any) => {
    Alert.alert('Remove member', `Remove ${m.user?.fullName} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            setBusy(m.id)
            await userAjoAPI.removeMember(m.id)
            await load()
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Something went wrong')
          } finally { setBusy('') }
        }
      }
    ])
  }

  const share = async () => {
    await Share.share({
      message:
        'https://owodeagent.com/join/' + inviteCode + '\n\n' +
        'Join my Ajo group "' + groupName + '" on OWODE Alajo.\n' +
        '\u20a6' + Number(amount).toLocaleString() + ' ' + String(frequency).toLowerCase()
    })
  }

  const pending = data?.pending || []
  const approved = data?.approved || []
  const total = data?.totalMembers || 0
  const started = data?.approvalStatus === 'APPROVED'

  // OWODE Alajo Redesign "Manage group" board
  const left = total - approved.length
  return (
    <View style={ui.screen}>
      <TopBar
        title={groupName || 'Manage group'}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      ) : (
        <ScrollView contentContainerStyle={[ui.body, { gap: 12 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={ds.navy} />}>
          {!started ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 3 }}>
                <Eyebrow>INVITE CODE</Eyebrow>
                <Text style={mg.code}>{inviteCode}</Text>
              </View>
              <Btn title="Share" icon="share" small onPress={share} />
            </Card>
          ) : null}

          {pending.length > 0 && !started ? (
            <>
              <Section right={<Pill tone="gold">{pending.length} new</Pill>}>Requests to join</Section>
              <List>
                {pending.map((m: any) => (
                  <View key={m.id} style={mg.req}>
                    <View style={mg.avatar}><Text style={mg.avatarText}>{initials(m.user?.fullName)}</Text></View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={mg.name} numberOfLines={1}>{m.user?.fullName}</Text>
                      <Text style={ui.muted} numberOfLines={1}>
                        Trust score {m.user?.trustScore ?? '–'} · {m.user?.isVerified ? 'verified' : 'not verified'}
                      </Text>
                    </View>
                    <TouchableOpacity style={mg.decline} onPress={() => respond(m, false)} disabled={busy === m.id} accessibilityLabel="Decline">
                      <Icon name="close" size={16} color={ds.danger} width={2} />
                    </TouchableOpacity>
                    <TouchableOpacity style={mg.accept} onPress={() => respond(m, true)} disabled={busy === m.id}>
                      {busy === m.id ? <OwodeLoader color="#fff" size="small" /> : <Text style={mg.acceptText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </List>
            </>
          ) : null}

          <Section right={!started ? (
            <TouchableOpacity onPress={() => navigation.navigate('PayoutOrder', { groupId })}>
              <Text style={mg.link}>Edit order</Text>
            </TouchableOpacity>
          ) : undefined}>Members · {approved.length} of {total}</Section>
          <List>
            {approved.map((m: any) => (
              <View key={m.id} style={mg.member}>
                <View style={[mg.pos, m.position === 1 && { backgroundColor: ds.navy }]}>
                  <Text style={[mg.posText, m.position === 1 && { color: '#ffffff' }]}>{m.position}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={mg.name} numberOfLines={1}>{m.user?.fullName}</Text>
                </View>
                {!started && m.position !== 1 ? (
                  <TouchableOpacity onPress={() => remove(m)} disabled={busy === m.id} accessibilityLabel="Remove member" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" size={18} color={ds.danger} width={2} />
                  </TouchableOpacity>
                ) : <Text style={ui.muted}>{m.position === 1 ? 'Creator' : 'Approved'}</Text>}
              </View>
            ))}
            {!started && left > 0 ? Array.from({ length: left }).map((_, i) => (
              <View key={`open-${i}`} style={mg.member}>
                <View style={mg.pos}><Text style={[mg.posText, { color: ds.muted }]}>{approved.length + i + 1}</Text></View>
                <Text style={[mg.name, { flex: 1, color: ds.muted }]}>Open seat</Text>
                <Text style={ui.muted}>Waiting</Text>
              </View>
            )) : null}
          </List>

          <Note icon={started ? 'checkCircle' : left <= 0 ? 'clock' : 'info'}>
            {started
              ? 'This group has started. Members can no longer be added or removed.'
              : left <= 0
                ? 'The group is full and waiting for OWODE to approve it. Collection starts the day after approval.'
                : `Share the invite with ${left} more ${left === 1 ? 'person' : 'people'}.`}
          </Note>
        </ScrollView>
      )}
    </View>
  )
}

const mg = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 22, lineHeight: 27, color: ds.ink, fontFamily: F.x, letterSpacing: 4 },
  req: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, lineHeight: 17, color: ds.navy, fontFamily: F.x },
  name: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
  decline: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: ds.border, alignItems: 'center', justifyContent: 'center' },
  accept: { height: 38, minWidth: 74, paddingHorizontal: 14, borderRadius: 12, backgroundColor: ds.navy, alignItems: 'center', justifyContent: 'center' },
  acceptText: { fontSize: 13, lineHeight: 16, color: '#ffffff', fontFamily: F.x },
  link: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  pos: { width: 30, height: 30, borderRadius: 15, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  posText: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.x },
})

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, minHeight: 56 },
  headerTitle: { flex: 1, flexShrink: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { padding: 16 },
  codeCard: { backgroundColor: '#25427a', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  codeLabel: { fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  code: { fontSize: 30, fontWeight: '700', color: '#fff', letterSpacing: 6, marginVertical: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 16, paddingVertical: 9, minHeight: 38 },
  shareText: { fontSize: 13, fontWeight: '700', color: '#25427a' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  countText: { flexShrink: 1, fontSize: 13.5, fontWeight: '700', color: '#1a2b4a' },
  badge: { backgroundColor: '#fef4e3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: '#8a5a00' },
  section: { fontSize: 11, fontWeight: '700', color: '#7c8aa5', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eef1f6' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flexShrink: 1, fontSize: 14.5, fontWeight: '700', color: '#1a2b4a' },
  sub: { flexShrink: 1, fontSize: 12, color: '#7c8aa5', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingVertical: 10, minHeight: 40 },
  accept: { backgroundColor: '#25427a' },
  acceptText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  decline: { backgroundColor: '#fdecec' },
  declineText: { color: '#ef4444', fontSize: 13.5, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, minHeight: 58 },
  pos: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  posText: { fontSize: 12, fontWeight: '700', color: '#25427a' },
  note: { flexDirection: 'row', gap: 9, backgroundColor: '#fff', borderRadius: 12, padding: 13, marginTop: 14 },
  noteText: { flex: 1, flexShrink: 1, fontSize: 12.5, lineHeight: 18, color: '#7c8aa5' }
})
