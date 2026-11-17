import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, font, shadow, F, ds } from '../constants/theme'
import Icon, { IconName } from '../components/Icon'
import { TopBar, List, Tile, Section, ui } from '../components/ui'

const WHATSAPP = '2348020973590'
const PHONE = '+2348020973590'
const EMAIL = 'support@owodealajo.com'

const FAQS = [
  {
    q: 'What is Ajo on OWODE?',
    a: 'Ajo (also called Esusu) is a group savings system. Members contribute a fixed amount on a schedule, and each cycle one member receives the full pot. OWODE runs this digitally so every contribution and payout is tracked and transparent.'
  },
  {
    q: 'What happens if a group member does not pay?',
    a: 'Your payout is protected. The OWODE Avatar covers any missed contribution so the member due to be paid still receives their full amount on time. The defaulting member is then recovered against.'
  },
  {
    q: 'How do I add money to my wallet?',
    a: 'Ask someone to send money to your OWODE phone number, or fund through an OWODE agent. Direct bank funding is coming soon.'
  },
  {
    q: 'How do I send money to someone?',
    a: 'Go to Transfer, enter the recipient\'s OWODE phone number, enter the amount, then confirm with your 4-digit transaction PIN. Transfers between OWODE users are instant and free.'
  },
  {
    q: 'Why do I need to provide my BVN or NIN?',
    a: 'Nigerian financial regulations require us to verify who you are. Verification also raises your limits, unlocks Guaranteed Ajo, and improves your Trust Score.'
  },
  {
    q: 'I did not receive my verification code',
    a: 'Wait about 60 seconds and tap Resend. Make sure your number is entered correctly and you have network. If you added an email address, check your inbox and spam folder as the code is also sent there.'
  },
  {
    q: 'How do I change my transaction PIN?',
    a: 'Go to Settings, then Change Transaction PIN. For your security we send a verification code to your phone or email first, then you can set the new PIN.'
  },
  {
    q: 'I forgot my PIN. What do I do?',
    a: 'Use the verification code flow under Settings to reset your transaction PIN. If you are locked out entirely, contact support on WhatsApp and we will help you recover your account.'
  },
]

export default function HelpSupportScreen({ navigation }: any) {
  const [open, setOpen] = useState<number | null>(null)

  // OWODE Alajo Redesign "Help & support" board
  const contacts: { icon: IconName; title: string; sub: string; onPress: () => void }[] = [
    { icon: 'chat', title: 'WhatsApp', sub: 'Fastest', onPress: () => Linking.openURL(`https://wa.me/${WHATSAPP}?text=Hello OWODE Support, I need help with`) },
    { icon: 'phone', title: 'Call us', sub: '9am–9pm', onPress: () => Linking.openURL(`tel:${PHONE}`) },
    { icon: 'mail', title: 'Email', sub: 'Within 24h', onPress: () => Linking.openURL(`mailto:${EMAIL}?subject=OWODE Support Request`) },
  ]
  return (
    <View style={ui.screen}>
      <TopBar title="Help & support" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ui.body} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {contacts.map(c => (
            <TouchableOpacity key={c.title} style={h.contact} onPress={c.onPress} activeOpacity={0.8}>
              <Tile icon={c.icon} size={42} />
              <Text style={h.contactTitle}>{c.title}</Text>
              <Text style={h.contactSub}>{c.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Section>Frequently asked questions</Section>
        <List>
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <TouchableOpacity key={i} style={h.faq} onPress={() => setOpen(isOpen ? null : i)} activeOpacity={0.7}>
                <View style={h.faqTop}>
                  <Text style={[h.q, isOpen && { fontFamily: F.x }]}>{item.q}</Text>
                  <Icon name={isOpen ? 'close' : 'plus'} size={16} color={ds.muted} width={2} />
                </View>
                {isOpen ? <Text style={h.a}>{item.a}</Text> : null}
              </TouchableOpacity>
            )
          })}
        </List>

        <TouchableOpacity
          style={h.report}
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}?text=Hello OWODE Support, I want to report a problem:`)}
        >
          <Tile icon="alert" tone="gold" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={h.reportTitle}>Report a problem</Text>
            <Text style={h.reportSub}>Tell us what went wrong and we will fix it</Text>
          </View>
          <Icon name="chevron" size={18} color={ds.goldInk} width={2} />
        </TouchableOpacity>
        <Text style={[ui.muted, { textAlign: 'center' }]}>{PHONE} · {EMAIL}</Text>
      </ScrollView>
    </View>
  )
}

const h = StyleSheet.create({
  contact: { flex: 1, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  contactTitle: { fontSize: 13, lineHeight: 16, color: ds.ink, fontFamily: F.b },
  contactSub: { fontSize: 11, lineHeight: 14, color: ds.muted, fontFamily: F.r },
  faq: { paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  faqTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  q: { flex: 1, fontSize: 14, lineHeight: 19, color: ds.ink, fontFamily: F.s },
  a: { fontSize: 13, lineHeight: 20, color: ds.inkSoft, fontFamily: F.r },
  report: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ds.goldWash, borderWidth: 1, borderColor: ds.goldLine, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  reportTitle: { fontSize: 14, lineHeight: 17, color: ds.ink, fontFamily: F.x },
  reportSub: { fontSize: 12, lineHeight: 16, color: ds.goldInk2, fontFamily: F.r },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg,
    backgroundColor: colors.navy,
  },
  headerTitle: { color: '#fff', fontSize: font.h3, fontWeight: font.bold },
  groupTitle: {
    fontSize: font.tiny, fontWeight: font.bold, color: colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.sm, marginHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.card,
    marginHorizontal: spacing.lg, overflow: 'hidden', ...shadow.card,
  },
  badge: {
    alignSelf: 'flex-start', backgroundColor: colors.tint,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
    margin: spacing.md, marginBottom: 0,
  },
  badgeText: { fontSize: font.tiny, fontWeight: font.semi, color: colors.navy },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  contactTitle: { fontSize: font.body, fontWeight: font.semi, color: colors.text },
  contactSub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  actionPill: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  actionPillText: { color: '#fff', fontSize: font.small, fontWeight: font.bold },
  faqRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  faqQ: { flex: 1, fontSize: font.small, fontWeight: font.semi, color: colors.text },
  faqA: {
    fontSize: font.small, color: colors.textMuted, lineHeight: 20,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, marginTop: -4,
  },
  faqDivider: { borderBottomWidth: 1, borderBottomColor: colors.track },
  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.tint, borderRadius: radius.card,
    marginHorizontal: spacing.lg, padding: spacing.lg,
  },
  reportTitle: { fontSize: font.body, fontWeight: font.bold, color: colors.navy },
  reportSub: { fontSize: font.tiny, color: '#42618f', marginTop: 2 },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xl, lineHeight: 16 },
})
