import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Share, Clipboard, Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { authAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'
import Icon from '../components/Icon'
import { HeroHeader, Card, List, Row, Pill, Btn, Eyebrow, Section, ui } from '../components/ui'
import { F, ds, tnum } from '../constants/theme'
import { initials } from '../utils/ajoDue'

const { width } = Dimensions.get('window')

const CAMPAIGNS = [
  {
    icon: 'people-outline', color: '#25427a', tint: '#eaf2ff',
    title: 'Invite a friend',
    desc: 'They join an Ajo group, you both earn trust points',
    reward: '+5 points', expiry: 'Ongoing',
  },
  {
    icon: 'trophy-outline', color: '#f5a623', tint: '#fff8e1',
    title: 'Reach Silver tier',
    desc: 'Invite 5 friends to unlock priority Ajo positions',
    reward: '5 friends', expiry: 'No end date',
  },
  {
    icon: 'shield-checkmark-outline', color: '#22c55e', tint: '#e8f5e9',
    title: 'Verified referral bonus',
    desc: 'Extra points when a friend completes BVN or NIN verification',
    reward: '+3 points', expiry: 'Ongoing',
  },
]

export default function ReferralScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadReferral() }, [])

  const loadReferral = async () => {
    try {
      const response = await authAPI.getReferral()
      setData(response.data.data)
    } catch (error) {
      console.log('Could not load referral data')
    } finally {
      setLoading(false)
    }
  }

  const count = data?.referralCount || 0
  const link = `https://owodealajo.com/join?ref=${data?.referralCode || ''}`

  const nextTier = count >= 10 ? null : count >= 5 ? 10 : 5
  const tierName = count >= 10 ? 'Gold' : count >= 5 ? 'Silver' : 'Bronze'
  const tierColor = count >= 10 ? '#f5a623' : count >= 5 ? '#9ca3af' : '#cd7f32'
  const progress = nextTier ? Math.min(count / nextTier, 1) : 1

  const handleCopy = () => {
    Clipboard.setString(data?.referralCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on OWODE Alajo — Nigeria's guaranteed digital Ajo savings platform!\n\nMy referral code: ${data?.referralCode}\n\nDownload: ${link}\n\nSave together, grow together.`,
        title: 'Join OWODE Alajo'
      })
    } catch (error) { console.log('Share error:', error) }
  }

  // OWODE Alajo Redesign "Refer & earn" board
  if (loading) {
    return (
      <View style={ui.screen}>
        <OwodeLoader size="large" fullscreen color={ds.navy} />
      </View>
    )
  }
  const friends: any[] = data?.referredUsers || []
  const tiers = [
    { name: 'Bronze', range: '1 – 4 friends', min: 1, tone: 'gold' as const },
    { name: 'Silver', range: '5 – 9 friends · priority Ajọ positions', min: 5, tone: 'grey' as const },
    { name: 'Gold', range: '10+ friends', min: 10, tone: 'gold' as const },
  ]
  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <HeroHeader title="Refer & earn" onBack={() => navigation.goBack()}>
          <View style={ui.rowBetween}>
            <View style={{ gap: 4 }}>
              <Text style={rf.heroLabel}>Friends who joined</Text>
              <Text style={rf.heroCount}>{count}</Text>
            </View>
            <View style={rf.tierBadge}>
              <Icon name="trophy" size={14} color={ds.hero} width={2} />
              <Text style={rf.tierBadgeText}>{tierName} tier</Text>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <View style={rf.track}><View style={[rf.fill, { width: `${Math.round(progress * 100)}%` }]} /></View>
            <Text style={rf.heroLabel}>
              {nextTier ? `${nextTier - count} more friend${nextTier - count === 1 ? '' : 's'} to reach ${nextTier === 5 ? 'Silver' : 'Gold'}` : 'You are at the top tier'}
            </Text>
          </View>
        </HeroHeader>

        <View style={ui.body}>
          <Card>
            <Eyebrow>YOUR CODE</Eyebrow>
            <View style={ui.rowBetween}>
              <Text style={rf.code}>{data?.referralCode || '—'}</Text>
              <TouchableOpacity style={rf.copy} onPress={handleCopy} accessibilityLabel="Copy code">
                <Icon name={copied ? 'check' : 'copy'} size={20} color={copied ? ds.navy : ds.ink} width={copied ? 2.4 : 1.8} />
              </TouchableOpacity>
            </View>
            <Btn title="Share invite" icon="share" onPress={handleShare} small />
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['1', 'Share', 'Send your code'], ['2', 'They join', 'And join an Ajọ group'], ['3', 'You earn', '+5 trust points each']].map(([nn, t, d]) => (
                <View key={nn} style={rf.step}>
                  <View style={rf.stepDot}><Text style={rf.stepNum}>{nn}</Text></View>
                  <Text style={rf.stepTitle}>{t}</Text>
                  <Text style={rf.stepSub}>{d}</Text>
                </View>
              ))}
            </View>
          </Card>

          <List>
            {tiers.map(t => (
              <Row key={t.name} icon="trophy" tone={t.tone} title={t.name} sub={t.range}
                right={count >= t.min ? <Pill>Unlocked</Pill> : <Text style={ui.muted}>Locked</Text>} />
            ))}
          </List>

          <Section>{friends.length ? `Friends invited (${friends.length})` : 'Friends invited'}</Section>
          {friends.length ? (
            <List>
              {friends.map((f: any, i: number) => (
                <View key={i} style={rf.friend}>
                  <View style={rf.avatar}><Text style={rf.avatarText}>{initials(f.fullName)}</Text></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={rf.friendName} numberOfLines={1}>{f.fullName}</Text>
                    <Text style={ui.muted}>{new Date(f.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <Pill tone={f.isVerified ? 'blue' : 'gold'}>{f.isVerified ? 'Verified' : 'Pending'}</Pill>
                </View>
              ))}
            </List>
          ) : (
            <Card style={{ alignItems: 'center' }}>
              <Text style={[ui.muted, { textAlign: 'center' }]}>No friends yet. Share your code to start earning trust points.</Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const rf = StyleSheet.create({
  heroLabel: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
  heroCount: { fontSize: 34, lineHeight: 41, color: '#ffffff', fontFamily: F.x, ...tnum },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ds.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  tierBadgeText: { fontSize: 12, lineHeight: 15, color: ds.hero, fontFamily: F.x },
  track: { height: 8, borderRadius: 4, backgroundColor: ds.heroLine, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: ds.gold },
  code: { fontSize: 28, lineHeight: 34, color: ds.ink, fontFamily: F.x, letterSpacing: 3 },
  copy: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.bg, alignItems: 'center', justifyContent: 'center' },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.x },
  stepTitle: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.b, textAlign: 'center' },
  stepSub: { fontSize: 11, lineHeight: 15, color: ds.muted, fontFamily: F.r, textAlign: 'center' },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: ds.blueSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.x },
  friendName: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.b },
})

const styles = StyleSheet.create({
  campaignCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  campaignTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  campaignIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  campaignTitle: { fontSize: 14.5, fontWeight: '700', color: '#1a2b4a' },
  campaignDesc: { fontSize: 12, color: '#7c8aa5', marginTop: 2, lineHeight: 16 },
  campaignFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f2f7' },
  expiryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f2f7', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100 },
  expiryText: { fontSize: 10.5, color: '#7c8aa5', fontWeight: '600' },
  campaignReward: { fontSize: 13, fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6fb' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16 },
  backBtn: { width: 24 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroWrap: { paddingHorizontal: 16, marginTop: -4 },
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#25427a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  heroIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  heroValue: { fontSize: 44, fontWeight: '800', color: '#fff', lineHeight: 48 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 16 },
  tierPillText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { width: '100%', height: 7, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 7, backgroundColor: '#f5a623', borderRadius: 4 },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  codeCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  codeCaption: { fontSize: 11, color: '#9aa5b8', fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf2ff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe9ff', borderStyle: 'dashed', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14 },
  code: { flex: 1, fontSize: 26, fontWeight: '800', color: '#25427a', letterSpacing: 4, textAlign: 'center' },
  copyIconBtn: { padding: 4 },
  shareBtn: { borderRadius: 14, overflow: 'hidden' },
  shareBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a2b4a', marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  stepsScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  stepCard: { width: width * 0.42, backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  stepIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eaf2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  stepNum: { fontSize: 10, fontWeight: '700', color: '#f5a623', letterSpacing: 1, marginBottom: 3 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#1a2b4a', marginBottom: 3 },
  stepDesc: { fontSize: 12, color: '#7c8aa5', lineHeight: 16 },
  tiersCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#f0f2f7' },
  tierDot: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  tierRowName: { fontSize: 15, fontWeight: '700', color: '#1a2b4a' },
  tierRowRange: { fontSize: 12, color: '#7c8aa5', marginTop: 1 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  activeChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  friendsCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  friendAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#25427a', justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  friendName: { fontSize: 14, fontWeight: '600', color: '#1a2b4a' },
  friendDate: { fontSize: 11, color: '#9aa5b8', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 36, marginHorizontal: 16 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eaf2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a2b4a', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#7c8aa5', textAlign: 'center', paddingHorizontal: 40 },
})
