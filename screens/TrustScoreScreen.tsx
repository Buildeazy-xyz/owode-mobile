import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { trustAPI } from '../utils/api'
import OwodeLoader from '../components/OwodeLoader'
import Svg, { Circle } from 'react-native-svg'
import { HeroHeader, List, Row, Pill, Btn, Section, Note, ui } from '../components/ui'
import { F, ds, tnum } from '../constants/theme'

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
    if (score >= 80) return ''
    if (score >= 65) return ''
    if (score >= 50) return ''
    if (score >= 35) return ''
    return ''
  }

  // OWODE Alajo Redesign "Trust score" board
  const score = Math.round(trustData?.score || 0)
  const R = 62, C = 2 * Math.PI * R, frac = Math.max(0, Math.min(1, score / 100))
  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <HeroHeader title="Trust score" onBack={() => navigation.goBack()}>
          {loading ? (
            <OwodeLoader size="large" color={ds.gold} />
          ) : (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <View style={{ width: 150, height: 150 }} accessibilityLabel={`Trust score ${score} of 100`}>
                <Svg width={150} height={150}>
                  <Circle cx={75} cy={75} r={R} stroke={ds.heroLine} strokeWidth={12} fill="none" />
                  {frac > 0 && (
                    <Circle cx={75} cy={75} r={R} stroke={ds.gold} strokeWidth={12} fill="none" strokeLinecap="round"
                      strokeDasharray={`${C * frac} ${C}`} rotation={-90} origin="75, 75" />
                  )}
                </Svg>
                <View style={ts.center}>
                  <Text style={ts.num}>{score}</Text>
                  <Text style={ts.of}>of 100</Text>
                </View>
              </View>
              <Text style={ts.label}>
                {trustData ? `${trustData.label}${score >= 35 ? ' · you can join Guaranteed Ajọ' : ''}` : 'Could not load your score'}
              </Text>
            </View>
          )}
        </HeroHeader>

        <View style={ui.body}>
          <Section>How to raise your score</Section>
          <List>
            <Row icon="shieldCheck" title="Submit BVN" right={<Pill>+10</Pill>} />
            <Row icon="doc" title="Submit NIN" right={<Pill>+10</Pill>} />
            <Row icon="checkCircle" title="Get verified by OWODE" right={<Pill>+10</Pill>} />
            <Row icon="ajo" title="Complete Ajọ groups" right={<Pill>+5 each</Pill>} />
            <Row icon="alert" danger title="Missed Ajọ payment" sub="Lowers your score" right={<Pill tone="red">−15</Pill>} />
          </List>
          <Note>Guaranteed Ajọ needs a score of at least 35. Your score updates as soon as a payment or verification is confirmed.</Note>
          <Btn title="Verify my identity" icon="shieldCheck" onPress={() => navigation.navigate('KYCVerification')} />
        </View>
      </ScrollView>
    </View>
  )
}

const ts = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 40, lineHeight: 48, color: '#ffffff', fontFamily: F.x, ...tnum },
  of: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
  label: { fontSize: 14, lineHeight: 18, color: '#ffffff', fontFamily: F.b, textAlign: 'center' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#f5a623', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scoreCard: { backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  scoreCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scoreEmoji: { fontSize: 32, marginBottom: 4 },
  scoreNumber: { fontSize: 40, fontWeight: 'bold' },
  scoreMax: { fontSize: 14, color: '#7c8aa5' },
  scoreLabel: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  scoreDesc: { fontSize: 13, color: '#7c8aa5', textAlign: 'center', lineHeight: 20 },
  section: { margin: 16, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#25427a', marginBottom: 12 },
  breakdownCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  breakdownIcon: { fontSize: 24, marginRight: 12 },
  breakdownText: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 14, color: '#1a2b4a' },
  breakdownValue: { fontSize: 14, fontWeight: 'bold', color: '#22c55e' },
  breakdownDivider: { height: 1, backgroundColor: '#f4f6fb', marginLeft: 52 },
  eligibilityCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  eligibilityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  eligibilityIcon: { fontSize: 20, marginRight: 12 },
  eligibilityText: { fontSize: 14, color: '#1a2b4a', flex: 1 },
  improveBtn: { margin: 16, backgroundColor: '#25427a', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 40 },
  improveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorState: { alignItems: 'center', padding: 60 },
  errorText: { color: '#7c8aa5', fontSize: 16 }
})