import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { trustAPI } from '../utils/api'

export default function TrustScoreScreen({ navigation }: any) {
  const [trustData, setTrustData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await trustAPI.getMyScore()
        setTrustData(response.data.data)
      } catch (error) {
        console.error('Could not load trust score')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'
    if (score >= 65) return '#84cc16'
    if (score >= 50) return '#f5a623'
    if (score >= 35) return '#f97316'
    return '#ef4444'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '🌟'
    if (score >= 65) return '😊'
    if (score >= 50) return '😐'
    if (score >= 35) return '😟'
    return '😰'
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust Score</Text>
        <View />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 60 }} />
      ) : trustData ? (
        <>
          {/* Score Circle */}
          <View style={styles.scoreCard}>
            <View style={[styles.scoreCircle, { borderColor: getScoreColor(trustData.score) }]}>
              <Text style={styles.scoreEmoji}>{getScoreEmoji(trustData.score)}</Text>
              <Text style={[styles.scoreNumber, { color: getScoreColor(trustData.score) }]}>
                {Math.round(trustData.score)}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={[styles.scoreLabel, { color: getScoreColor(trustData.score) }]}>
              {trustData.label}
            </Text>
            <Text style={styles.scoreDesc}>
              Your trust score determines your eligibility for Guaranteed Ajo groups and your position in payout cycles.
            </Text>
          </View>

          {/* Score Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to improve your score</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>🪪</Text>
                <View style={styles.breakdownText}>
                  <Text style={styles.breakdownLabel}>Submit BVN</Text>
                  <Text style={styles.breakdownValue}>+10 points</Text>
                </View>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>📋</Text>
                <View style={styles.breakdownText}>
                  <Text style={styles.breakdownLabel}>Submit NIN</Text>
                  <Text style={styles.breakdownValue}>+10 points</Text>
                </View>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>✅</Text>
                <View style={styles.breakdownText}>
                  <Text style={styles.breakdownLabel}>Get verified by admin</Text>
                  <Text style={styles.breakdownValue}>+10 points</Text>
                </View>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>🤝</Text>
                <View style={styles.breakdownText}>
                  <Text style={styles.breakdownLabel}>Complete Ajo groups</Text>
                  <Text style={styles.breakdownValue}>+5 per group</Text>
                </View>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>⚠️</Text>
                <View style={styles.breakdownText}>
                  <Text style={styles.breakdownLabel}>Default on payment</Text>
                  <Text style={[styles.breakdownValue, { color: '#ef4444' }]}>-15 points</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Eligibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guaranteed Ajo Eligibility</Text>
            <View style={styles.eligibilityCard}>
              <View style={styles.eligibilityRow}>
                <Text style={styles.eligibilityIcon}>{trustData.score >= 35 ? '✅' : '❌'}</Text>
                <Text style={styles.eligibilityText}>Minimum trust score of 35</Text>
              </View>
              <View style={styles.eligibilityRow}>
                <Text style={styles.eligibilityIcon}>
                  {trustData.score >= 80 ? '🌟' : trustData.score >= 50 ? '😊' : '⏳'}
                </Text>
                <Text style={styles.eligibilityText}>
                  {trustData.score >= 80
                    ? 'Priority early payout position'
                    : trustData.score >= 50
                    ? 'Mid-cycle payout position'
                    : 'Later payout position (build score to improve)'}
                </Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.improveBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.improveBtnText}>📋 Submit KYC to improve score</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Could not load trust score</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scoreCard: { backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  scoreCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scoreEmoji: { fontSize: 32, marginBottom: 4 },
  scoreNumber: { fontSize: 40, fontWeight: 'bold' },
  scoreMax: { fontSize: 14, color: '#888' },
  scoreLabel: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  scoreDesc: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
  section: { margin: 16, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12 },
  breakdownCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  breakdownIcon: { fontSize: 24, marginRight: 12 },
  breakdownText: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 14, color: '#333' },
  breakdownValue: { fontSize: 14, fontWeight: 'bold', color: '#22c55e' },
  breakdownDivider: { height: 1, backgroundColor: '#f5f5f5', marginLeft: 52 },
  eligibilityCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  eligibilityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  eligibilityIcon: { fontSize: 20, marginRight: 12 },
  eligibilityText: { fontSize: 14, color: '#333', flex: 1 },
  improveBtn: { margin: 16, backgroundColor: '#0d47a1', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 40 },
  improveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorState: { alignItems: 'center', padding: 60 },
  errorText: { color: '#888', fontSize: 16 }
})