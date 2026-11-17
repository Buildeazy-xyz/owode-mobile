// Shared building blocks for the OWODE Alajo Redesign, so every screen uses
// the same header, cards, rows, inputs and buttons as the canvas.
import React from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
  TextInputProps, ViewStyle, StyleProp,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon, { IconName } from './Icon'
import { F, ds, tnum } from '../constants/theme'

const lh = (n: number) => Math.round(n * 1.22)

// Back button + title on a light screen. `onWhite` uses the grey circle (screens with white background).
export function TopBar({ title, onBack, right, onWhite, dark }: {
  title: string; onBack?: () => void; right?: React.ReactNode; onWhite?: boolean; dark?: boolean
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[u.topbar, { paddingTop: insets.top + 18 }]}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          accessibilityLabel="Back"
          style={[u.back, dark ? u.backDark : onWhite ? u.backWhite : u.backLight]}
        >
          <Icon name="back" size={20} color={dark ? '#ffffff' : ds.ink} width={2} />
        </TouchableOpacity>
      ) : null}
      <Text style={[u.topTitle, dark && { color: '#ffffff' }]} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  )
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'gold' }) {
  return <View style={[u.card, tone === 'gold' && u.cardGold, style]}>{children}</View>
}

export function List({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <View style={[u.list, style]}>
      {items.map((c, i) => (
        <View key={i} style={i < items.length - 1 ? u.line : undefined}>{c}</View>
      ))}
    </View>
  )
}

const tones = {
  blue: { bg: ds.blueSoft, fg: ds.navy },
  gold: { bg: ds.goldSoft, fg: ds.goldInk },
  red: { bg: ds.dangerSoft, fg: ds.danger },
  grey: { bg: ds.divider, fg: ds.inkSoft },
}

export function Tile({ icon, tone = 'blue', size = 38 }: { icon: IconName; tone?: keyof typeof tones; size?: number }) {
  return (
    <View style={[u.tile, { width: size, height: size, backgroundColor: tones[tone].bg }]}>
      <Icon name={icon} size={Math.round(size * 0.47)} color={tones[tone].fg} width={2} />
    </View>
  )
}

export function Row({ icon, tone, title, sub, right, onPress, danger, chevron = true }: {
  icon?: IconName; tone?: keyof typeof tones; title: string; sub?: string
  right?: React.ReactNode; onPress?: () => void; danger?: boolean; chevron?: boolean
}) {
  const body = (
    <View style={u.row}>
      {icon ? <Tile icon={icon} tone={danger ? 'red' : tone} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[u.rowTitle, danger && { color: ds.danger }]} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={u.rowSub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right !== undefined ? right : onPress && chevron && !danger ? <Icon name="chevron" size={18} color="#9aa5b8" width={2} /> : null}
    </View>
  )
  return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{body}</TouchableOpacity> : body
}

export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text style={[u.eyebrow, color ? { color } : null]}>{children}</Text>
}

export function Section({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={u.sectionRow}>
      <Text style={u.section}>{children}</Text>
      {right}
    </View>
  )
}

export function Pill({ children, tone = 'blue' }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <Text style={[u.pill, { backgroundColor: tones[tone].bg, color: tones[tone].fg }]}>{children}</Text>
}

export function Field({ label, prefix, right, style, ...props }: TextInputProps & {
  label?: string; prefix?: string; right?: React.ReactNode
}) {
  const [focus, setFocus] = React.useState(false)
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={u.eyebrow}>{label.toUpperCase()}</Text> : null}
      <View>
        {prefix ? <Text style={u.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor="#9aa5b8"
          {...props}
          onFocus={e => { setFocus(true); props.onFocus?.(e) }}
          onBlur={e => { setFocus(false); props.onBlur?.(e) }}
          style={[u.input, focus && u.inputOn, prefix ? { paddingLeft: 40 } : null, right ? { paddingRight: 52 } : null,
            props.multiline ? { height: 110, paddingTop: 14, textAlignVertical: 'top' } : null, style]}
        />
        {right ? <View style={u.inputRight}>{right}</View> : null}
      </View>
    </View>
  )
}

export function Btn({ title, onPress, kind = 'gold', icon, disabled, loading, style, small }: {
  title: string; onPress?: () => void; kind?: 'gold' | 'navy' | 'outline' | 'danger' | 'heroline'
  icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean
}) {
  const k = {
    gold: { bg: ds.gold, fg: ds.hero, border: ds.gold },
    navy: { bg: ds.navy, fg: '#ffffff', border: ds.navy },
    outline: { bg: '#ffffff', fg: ds.navy, border: ds.border },
    danger: { bg: '#ffffff', fg: ds.danger, border: '#f3c9c9' },
    heroline: { bg: 'transparent', fg: '#ffffff', border: ds.heroBtn },
  }[kind]
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[u.btn, small && u.btnSmall, { backgroundColor: k.bg, borderColor: k.border }, (disabled && !loading) && { opacity: 0.45 }, style]}
    >
      {loading ? <ActivityIndicator color={k.fg} /> : (
        <>
          {icon ? <Icon name={icon} size={18} color={k.fg} width={2} /> : null}
          <Text style={[u.btnText, small && { fontSize: 15 }, { color: k.fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}

// Navy header block used by Trust score, Refer & earn and the Ajọ group view.
export function HeroHeader({ title, onBack, right, children }: {
  title: string; onBack?: () => void; right?: React.ReactNode; children?: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[u.hero, { paddingTop: insets.top + 18 }]}>
      <View style={u.heroTop}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} accessibilityLabel="Back" style={[u.back, u.backDark]}>
            <Icon name="back" size={20} color="#ffffff" width={2} />
          </TouchableOpacity>
        ) : null}
        <Text style={[u.topTitle, { color: '#ffffff' }]} numberOfLines={1}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  )
}

export function Note({ icon = 'info', children, color = ds.muted }: { icon?: IconName; children: React.ReactNode; color?: string }) {
  return (
    <View style={u.note}>
      <Icon name={icon} size={18} color={color} width={2} />
      <Text style={[u.noteText, { color }]}>{children}</Text>
    </View>
  )
}

export function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[u.step, i < current && { backgroundColor: ds.navy }]} />
      ))}
    </View>
  )
}

export const ui = {
  screen: { flex: 1, backgroundColor: ds.bg } as ViewStyle,
  white: { flex: 1, backgroundColor: '#ffffff' } as ViewStyle,
  body: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 40, gap: 14 } as ViewStyle,
  h2: { fontSize: 24, lineHeight: lh(24), color: ds.ink, fontFamily: F.x },
  lead: { fontSize: 14, lineHeight: 21, color: ds.inkSoft, fontFamily: F.r },
  muted: { fontSize: 13, lineHeight: 19, color: ds.muted, fontFamily: F.r },
  big: { fontSize: 36, lineHeight: lh(36), color: ds.ink, fontFamily: F.x, letterSpacing: -0.5, ...tnum },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
}

const u = StyleSheet.create({
  topbar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backLight: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border },
  backWhite: { backgroundColor: ds.bg },
  backDark: { backgroundColor: ds.heroChip },
  topTitle: { flex: 1, fontSize: 20, lineHeight: lh(20), color: ds.ink, fontFamily: F.x },
  card: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, padding: 16, gap: 14 },
  cardGold: { backgroundColor: ds.goldWash, borderColor: ds.goldLine },
  list: { backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 18, overflow: 'hidden' },
  line: { borderBottomWidth: 1, borderBottomColor: ds.divider },
  tile: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowTitle: { fontSize: 14, lineHeight: lh(14), color: ds.ink, fontFamily: F.b },
  rowSub: { fontSize: 12, lineHeight: 16, color: ds.muted, fontFamily: F.r },
  eyebrow: { fontSize: 12, lineHeight: lh(12), color: ds.muted, fontFamily: F.b, letterSpacing: 0.6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 15, lineHeight: lh(15), color: ds.ink, fontFamily: F.x },
  pill: { fontSize: 12, lineHeight: lh(12), fontFamily: F.b, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: ds.border, backgroundColor: '#ffffff', paddingHorizontal: 16, fontSize: 16, color: ds.ink, fontFamily: F.b, ...tnum },
  inputOn: { borderColor: ds.navy },
  prefix: { position: 'absolute', left: 16, top: 14, zIndex: 1, fontSize: 17, lineHeight: 22, color: ds.muted, fontFamily: F.b },
  inputRight: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 54, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  btnSmall: { height: 46, borderRadius: 14 },
  btnText: { fontSize: 16, lineHeight: 20, fontFamily: F.x },
  hero: { backgroundColor: ds.hero, paddingHorizontal: 20, paddingBottom: 22, gap: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.r },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#dbe2ee' },
})
