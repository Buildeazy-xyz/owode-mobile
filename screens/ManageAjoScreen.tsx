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

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#1a2e55', '#25427a']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PayoutOrder', { groupId })}>
          <Ionicons name="swap-vertical" size={20} color="#f5a623" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <OwodeLoader color="#25427a"  />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          {!started ? (
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>INVITE CODE</Text>
              <Text style={styles.code}>{inviteCode}</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={share}>
                <Ionicons name="share-social-outline" size={16} color="#25427a" />
                <Text style={styles.shareText}>Share invite</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.countRow}>
            <Text style={styles.countText}>{approved.length} of {total} members</Text>
            {pending.length > 0 ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{pending.length} waiting</Text></View>
            ) : null}
          </View>

          {pending.length > 0 && !started ? (
            <>
              <Text style={styles.section}>REQUESTS TO JOIN</Text>
              {pending.map((m: any) => (
                <View key={m.id} style={styles.card}>
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{m.user?.fullName}</Text>
                      <Text style={styles.sub} numberOfLines={1}>
                        {m.user?.phone} {'\u00b7'} Trust {m.user?.trustScore ?? '-'}
                      </Text>
                    </View>
                    {m.user?.isVerified ? (
                      <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    ) : (
                      <Ionicons name="alert-circle" size={18} color="#ef4444" />
                    )}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.btn, styles.accept]}
                      onPress={() => respond(m, true)}
                      disabled={busy === m.id}
                    >
                      {busy === m.id
                        ? <OwodeLoader color="#fff" size="small" />
                        : <Text style={styles.acceptText}>Accept</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.decline]}
                      onPress={() => respond(m, false)}
                      disabled={busy === m.id}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>PAYOUT ORDER</Text>
          {approved.map((m: any) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={styles.pos}><Text style={styles.posText}>{m.position}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{m.user?.fullName}</Text>
                <Text style={styles.sub} numberOfLines={1}>{m.user?.phone}</Text>
              </View>
              {!started && m.position !== 1 ? (
                <TouchableOpacity onPress={() => remove(m)} disabled={busy === m.id}>
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {started ? (
            <View style={styles.note}>
              <Ionicons name="checkmark-circle" size={17} color="#22c55e" />
              <Text style={styles.noteText}>
                This group has started. Members can no longer be added or removed.
              </Text>
            </View>
          ) : approved.length >= total ? (
            <View style={styles.note}>
              <Ionicons name="time-outline" size={17} color="#d97706" />
              <Text style={styles.noteText}>
                The group is full and waiting for OWODE to approve it. Collection starts the day after approval.
              </Text>
            </View>
          ) : (
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={17} color="#7c8aa5" />
              <Text style={styles.noteText}>
                Share the invite with {total - approved.length} more {total - approved.length === 1 ? 'person' : 'people'}.
                Only accept people you know and trust.
              </Text>
            </View>
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
