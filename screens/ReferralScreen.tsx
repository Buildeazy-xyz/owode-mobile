import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  Share, Clipboard, Dimensions, Image
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { authAPI } from '../utils/api'

const { width } = Dimensions.get('window')

export default function ReferralScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadReferral()
  }, [])

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

  const handleCopyCode = () => {
    Clipboard.setString(data?.referralCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on OWODE Alajo — Nigeria's first guaranteed digital Ajo savings platform!\n\nUse my referral code: ${data?.referralCode}\n\nDownload: https://owode.xyz/join?ref=${data?.referralCode}\n\nSave together, grow together!`,
        title: 'Join OWODE Alajo'
      })
    } catch (error) {
      console.log('Share error:', error)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0d47a1" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.logoCard}>
          <Image source={require('../assets/owode-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <Text style={styles.headerSub}>Invite friends and earn trust score bonuses!</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon: '', label: 'Friends Referred', value: data?.referralCount || 0, color: '#0d47a1' },
          { icon: '', label: 'Bonus Points', value: `+${(data?.referralCount || 0) * 5}`, color: '#f5a623' },
          { icon: '🏆', label: 'Your Rank', value: data?.referralCount >= 10 ? 'Gold' : data?.referralCount >= 5 ? 'Silver' : 'Bronze', color: '#22c55e' },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{data?.referralCode || '-------'}</Text>
          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
            onPress={handleCopyCode}
          >
            <Text style={styles.copyBtnText}>{copied ? '✅ Copied!' : '📋 Copy'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.codeLink}>{data?.referralLink}</Text>
      </View>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <LinearGradient colors={['#0d47a1', '#1565c0']} style={styles.shareBtnGradient}>
          <Text style={styles.shareBtnText}>📤 Share with Friends</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsCard}>
          {[
            { step: '1', icon: '📤', title: 'Share Your Code', desc: 'Send your referral code or link to friends and family' },
            { step: '2', icon: '', title: 'Friend Registers', desc: 'Your friend downloads OWODE and registers with your code' },
            { step: '3', icon: '', title: 'Both Get Rewarded', desc: 'You get +5 trust score points for every friend you refer!' },
          ].map(item => (
            <View key={item.step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{item.step}</Text>
              </View>
              <Text style={styles.stepIcon}>{item.icon}</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Rewards Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Referral Rewards</Text>
        <View style={styles.rewardsCard}>
          {[
            { referrals: '1-4', reward: '+5 points each', badge: '🥉 Bronze', color: '#cd7f32' },
            { referrals: '5-9', reward: '+5 points each', badge: '🥈 Silver', color: '#888' },
            { referrals: '10+', reward: '+5 points each', badge: '🥇 Gold', color: '#f5a623' },
          ].map((tier, i) => (
            <View key={tier.badge} style={[styles.tierRow, i < 2 && styles.tierDivider]}>
              <Text style={styles.tierBadge}>{tier.badge}</Text>
              <View style={styles.tierMiddle}>
                <Text style={styles.tierReferrals}>{tier.referrals} referrals</Text>
                <Text style={styles.tierReward}>{tier.reward}</Text>
              </View>
              {data?.referralCount >= parseInt(tier.referrals.split('-')[0]) && (
                <Text style={styles.tierActive}>✅ Active</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Referred Friends */}
      {data?.referredUsers?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends You Referred ({data.referredUsers.length})</Text>
          <View style={styles.friendsCard}>
            {data.referredUsers.map((friend: any, i: number) => (
              <View key={i} style={[styles.friendRow, i < data.referredUsers.length - 1 && styles.friendDivider]}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarText}>{friend.fullName?.charAt(0)}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.fullName}</Text>
                  <Text style={styles.friendDate}>
                    Joined {new Date(friend.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.friendBadge, { backgroundColor: friend.isVerified ? '#e8f5e9' : '#fff3e0' }]}>
                  <Text style={[styles.friendBadgeText, { color: friend.isVerified ? '#22c55e' : '#f5a623' }]}>
                    {friend.isVerified ? '✅ Verified' : '⏳ Unverified'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {data?.referredUsers?.length === 0 && (
        <View style={styles.emptyFriends}>
          <Text style={styles.emptyFriendsIcon}></Text>
          <Text style={styles.emptyFriendsText}>No referrals yet</Text>
          <Text style={styles.emptyFriendsSub}>Share your code and start earning!</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingBottom: 28 },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  back: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  logoCard: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 8, marginBottom: 16 },
  logoImage: { width: width * 0.38, height: 38 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 6 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 40 },
  statsRow: { flexDirection: 'row', margin: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#888', textAlign: 'center' },
  codeCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 12 },
  codeLabel: { fontSize: 12, color: '#888', marginBottom: 12, fontWeight: '600' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  code: { flex: 1, fontSize: 28, fontWeight: 'bold', color: '#0d47a1', letterSpacing: 4, backgroundColor: '#f0f7ff', padding: 12, borderRadius: 12, textAlign: 'center' },
  copyBtn: { backgroundColor: '#e3f2fd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  copyBtnSuccess: { backgroundColor: '#e8f5e9' },
  copyBtnText: { color: '#0d47a1', fontWeight: '700', fontSize: 13 },
  codeLink: { fontSize: 11, color: '#888', textAlign: 'center' },
  shareBtn: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  shareBtnGradient: { padding: 18, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12 },
  stepsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  stepIcon: { fontSize: 24 },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#888', lineHeight: 16 },
  rewardsCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tierRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  tierDivider: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tierBadge: { fontSize: 20, width: 40 },
  tierMiddle: { flex: 1 },
  tierReferrals: { fontSize: 14, fontWeight: '600', color: '#333' },
  tierReward: { fontSize: 12, color: '#888', marginTop: 2 },
  tierActive: { fontSize: 12, color: '#22c55e', fontWeight: '700' },
  friendsCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  friendRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  friendDivider: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0d47a1', justifyContent: 'center', alignItems: 'center' },
  friendAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 14, fontWeight: '600', color: '#333' },
  friendDate: { fontSize: 11, color: '#888', marginTop: 2 },
  friendBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  friendBadgeText: { fontSize: 11, fontWeight: '600' },
  emptyFriends: { alignItems: 'center', padding: 40 },
  emptyFriendsIcon: { fontSize: 48, marginBottom: 12 },
  emptyFriendsText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  emptyFriendsSub: { fontSize: 13, color: '#888' },
})