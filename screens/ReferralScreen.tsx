import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Share, Clipboard, Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { authAPI } from '../utils/api'

const { width } = Dimensions.get('window')

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
  const link = `https://owodeagent.com/join?ref=${data?.referralCode || ''}`

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

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0d47a1" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#f5a623" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Refer & Earn</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={styles.heroWrap}>
        <LinearGradient colors={['#0d47a1', '#1565c0']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
          <View style={styles.heroIconCircle}>
            <Ionicons name="gift" size={30} color="#f5a623" />
          </View>
          <Text style={styles.heroValue}>{count}</Text>
          <Text style={styles.heroLabel}>Friends Invited</Text>

          <View style={styles.tierPill}>
            <Ionicons name="trophy" size={13} color={tierColor} />
            <Text style={[styles.tierPillText, { color: tierColor }]}>{tierName} Tier</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {nextTier ? `${nextTier - count} more to reach ${count >= 5 ? 'Gold' : 'Silver'}` : 'Top tier reached!'}
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeCaption}>YOUR REFERRAL CODE</Text>
        <View style={styles.codeBox}>
          <Text style={styles.code}>{data?.referralCode || '------'}</Text>
          <TouchableOpacity style={styles.copyIconBtn} onPress={handleCopy}>
            <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={22} color={copied ? '#22c55e' : '#0d47a1'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <LinearGradient colors={['#f5a623', '#e8940f']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.shareBtnInner}>
            <Ionicons name="share-social" size={19} color="#fff" />
            <Text style={styles.shareBtnText}>Share Invite</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>How it works</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsScroll}>
        {[
          { icon: 'share-social', title: 'Share', desc: 'Send your code to friends & family' },
          { icon: 'person-add', title: 'They Join', desc: 'They register using your code' },
          { icon: 'star', title: 'You Earn', desc: '+5 trust points per friend' },
        ].map((s, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepIconCircle}>
              <Ionicons name={s.icon as any} size={22} color="#0d47a1" />
            </View>
            <Text style={styles.stepNum}>STEP {i + 1}</Text>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepDesc}>{s.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Reward tiers</Text>
      <View style={styles.tiersCard}>
        {[
          { name: 'Bronze', range: '1 - 4 friends', min: 1, color: '#cd7f32' },
          { name: 'Silver', range: '5 - 9 friends', min: 5, color: '#9ca3af' },
          { name: 'Gold', range: '10+ friends', min: 10, color: '#f5a623' },
        ].map((t, i) => {
          const active = count >= t.min
          return (
            <View key={t.name} style={[styles.tierRow, i < 2 && styles.rowDivider]}>
              <View style={[styles.tierDot, { backgroundColor: t.color }]}>
                <Ionicons name="trophy" size={15} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierRowName}>{t.name}</Text>
                <Text style={styles.tierRowRange}>{t.range}</Text>
              </View>
              {active
                ? <View style={styles.activeChip}><Ionicons name="checkmark" size={13} color="#fff" /><Text style={styles.activeChipText}>Unlocked</Text></View>
                : <Ionicons name="lock-closed" size={16} color="#ccc" />}
            </View>
          )
        })}
      </View>

      <Text style={styles.sectionTitle}>
        Friends invited {count > 0 ? `(${count})` : ''}
      </Text>
      {count > 0 ? (
        <View style={styles.friendsCard}>
          {data.referredUsers.map((f: any, i: number) => (
            <View key={i} style={[styles.friendRow, i < data.referredUsers.length - 1 && styles.rowDivider]}>
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>{f.fullName?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName}>{f.fullName}</Text>
                <Text style={styles.friendDate}>
                  {new Date(f.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Ionicons
                name={f.isVerified ? 'checkmark-circle' : 'time-outline'}
                size={20}
                color={f.isVerified ? '#22c55e' : '#f5a623'}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={30} color="#0d47a1" />
          </View>
          <Text style={styles.emptyTitle}>No invites yet</Text>
          <Text style={styles.emptySub}>Share your code above and start earning rewards!</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6fb' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16 },
  backBtn: { width: 24 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroWrap: { paddingHorizontal: 16, marginTop: -4 },
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#0d47a1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
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
  code: { flex: 1, fontSize: 26, fontWeight: '800', color: '#0d47a1', letterSpacing: 4, textAlign: 'center' },
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
  friendAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  friendName: { fontSize: 14, fontWeight: '600', color: '#1a2b4a' },
  friendDate: { fontSize: 11, color: '#9aa5b8', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 36, marginHorizontal: 16 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eaf2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a2b4a', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#7c8aa5', textAlign: 'center', paddingHorizontal: 40 },
})
