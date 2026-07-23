import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, font, shadow } from '../constants/theme'

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

  const ContactCard = ({ icon, iconBg, iconColor, title, sub, badge, actionLabel, onPress }: any) => (
    <View style={styles.card}>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.contactRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactTitle}>{title}</Text>
          <Text style={styles.contactSub}>{sub}</Text>
        </View>
        <View style={styles.actionPill}>
          <Text style={styles.actionPillText}>{actionLabel}</Text>
        </View>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
          <Ionicons name="chevron-back" size={24} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        <Text style={styles.groupTitle}>Chat with us</Text>
        <ContactCard
          icon="logo-whatsapp"
          iconBg="#e8f5e9"
          iconColor="#25D366"
          title="WhatsApp"
          sub="Fastest way to reach our team"
          badge="Avg. response: under 30 mins"
          actionLabel="Chat"
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}?text=Hello OWODE Support, I need help with`)}
        />

        <Text style={styles.groupTitle}>Call us</Text>
        <ContactCard
          icon="call-outline"
          iconBg={colors.tint}
          iconColor={colors.navy}
          title={PHONE}
          sub="Mon - Sat, 9am to 9pm"
          actionLabel="Call"
          onPress={() => Linking.openURL(`tel:${PHONE}`)}
        />

        <Text style={styles.groupTitle}>Email us</Text>
        <ContactCard
          icon="mail-outline"
          iconBg="#fff8e1"
          iconColor={colors.gold}
          title={EMAIL}
          sub="For account and document issues"
          badge="Avg. response: within 24 hrs"
          actionLabel="Email"
          onPress={() => Linking.openURL(`mailto:${EMAIL}?subject=OWODE Support Request`)}
        />

        <Text style={styles.groupTitle}>Frequently asked questions</Text>
        <View style={styles.card}>
          {FAQS.map((item, i) => (
            <View key={i} style={i < FAQS.length - 1 ? styles.faqDivider : undefined}>
              <TouchableOpacity
                style={styles.faqRow}
                onPress={() => setOpen(open === i ? null : i)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons
                  name={open === i ? 'chevron-up' : 'chevron-down'}
                  size={17}
                  color={colors.textFaint}
                />
              </TouchableOpacity>
              {open === i && <Text style={styles.faqA}>{item.a}</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.groupTitle}>Still stuck?</Text>
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}?text=Hello OWODE, I want to report a problem with the app:`)}
        >
          <Ionicons name="bug-outline" size={20} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Report a problem</Text>
            <Text style={styles.reportSub}>Tell us what went wrong and we will fix it</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.navy} />
        </TouchableOpacity>

        <Text style={styles.footer}>OWODE Digital Services Limited{'\n'}RC 8569061</Text>
      </ScrollView>
    </View>
  )
}

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
