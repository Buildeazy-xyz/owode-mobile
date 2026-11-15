import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration, Image, Dimensions
} from 'react-native'
import OwodeLoader from './OwodeLoader'
import Icon from './Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F, ds } from '../constants/theme'

const { width } = Dimensions.get('window')

interface PinKeypadProps {
  onComplete: (pin: string) => void
  title?: string
  subtitle?: string
  pinLength?: number
  requireConfirm?: boolean
}

export default function PinKeypad({
  onComplete,
  title = 'Enter PIN',
  subtitle = 'Enter your PIN',
  pinLength = 4,
  requireConfirm = true
}: PinKeypadProps) {
  const [pin, setPin] = useState('')
  const [confirmedPin, setConfirmedPin] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const insets = useSafeAreaInsets()
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = () => {
    Vibration.vibrate([0, 100, 50, 100])
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const currentPin = isConfirming ? confirmedPin : pin

  const handlePress = (value: string) => {
    if (busy) return
    setError('')

    if (value === 'del') {
      if (isConfirming) {
        setConfirmedPin(prev => prev.slice(0, -1))
      } else {
        setPin(prev => prev.slice(0, -1))
      }
      return
    }

    if (currentPin.length >= pinLength) return

    if (isConfirming) {
      const newConfirm = confirmedPin + value
      setConfirmedPin(newConfirm)

      if (newConfirm.length === pinLength) {
        if (newConfirm === pin) {
          // ✅ Match — call immediately no delay
          Vibration.vibrate(100)
          setPin('')
          setConfirmedPin('')
          setIsConfirming(false)
          setBusy(true)
          onComplete(newConfirm)
        } else {
          // ❌ No match — reset immediately
          shake()
          setError('PINs do not match! Try again.')
          setPin('')
          setConfirmedPin('')
          setIsConfirming(false)
        }
      }
    } else {
      const newPin = pin + value
      setPin(newPin)

      if (newPin.length === pinLength) {
        if (requireConfirm) {
          // Switch to confirm immediately no delay
          setIsConfirming(true)
        } else {
          setBusy(true)
          onComplete(newPin)
          setPin('')
        }
      }
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  if (busy) return <View style={s.container}><OwodeLoader size="large" fullscreen color={ds.gold} /></View>

  // OWODE Alajo Redesign "Enter PIN" board: navy screen, gold dots, flat keys
  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
      <View style={s.content}>
        <View style={s.lockTile}>
          <Icon name="lock" size={26} color={ds.gold} width={2} />
        </View>
        {requireConfirm && (
          <View style={s.steps}>
            <View style={[s.step, s.stepOn]} />
            <View style={[s.step, isConfirming && s.stepOn]} />
          </View>
        )}
        <Text style={s.title}>{isConfirming ? `Confirm ${title}` : title}</Text>
        <Text style={s.sub}>
          {isConfirming ? `Enter the same ${pinLength}-digit PIN again` : subtitle}
        </Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Animated.View style={[s.dots, { transform: [{ translateX: shakeAnim }] }]}
          accessibilityLabel={`${currentPin.length} of ${pinLength} digits entered`}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <View key={i} style={[s.dot, i < currentPin.length && s.dotOn]} />
          ))}
        </Animated.View>
      </View>

      <View style={{ flex: 1, minHeight: 16 }} />

      <View style={s.pad}>
        {keys.map((key, index) => (
          key === '' ? <View key={index} style={s.keyBlank} /> : (
            <TouchableOpacity
              key={index}
              style={s.key}
              disabled={busy}
              onPress={() => !busy && handlePress(key)}
              activeOpacity={0.6}
              accessibilityLabel={key === 'del' ? 'Delete' : key}
            >
              {key === 'del'
                ? <Icon name="backspace" size={24} color="#ffffff" />
                : <Text style={s.keyText}>{key}</Text>}
            </TouchableOpacity>
          )
        ))}
      </View>

      <View style={s.secure}>
        <Icon name="shieldCheck" size={14} color={ds.onHero} width={2} />
        <Text style={s.secureText}>OWODE will never ask for your PIN</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignSelf: 'stretch', width: '100%', backgroundColor: ds.hero, paddingTop: 24 },
  content: { alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  lockTile: { width: 56, height: 56, borderRadius: 18, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 6, width: 64 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: ds.heroBtn },
  stepOn: { backgroundColor: ds.gold },
  title: { fontSize: 22, lineHeight: 27, color: '#ffffff', fontFamily: F.x, textAlign: 'center' },
  sub: { fontSize: 14, lineHeight: 20, color: ds.onHero, fontFamily: F.r, textAlign: 'center' },
  error: { fontSize: 13, lineHeight: 18, color: '#ffb4b4', fontFamily: F.b, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 16, paddingTop: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: ds.heroBtn },
  dotOn: { backgroundColor: ds.gold, borderColor: ds.gold },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, paddingHorizontal: 20 },
  key: { width: '31.5%', height: 60, borderRadius: 14, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  keyBlank: { width: '31.5%', height: 60 },
  keyText: { fontSize: 24, lineHeight: 29, color: '#ffffff', fontFamily: F.b },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 16 },
  secureText: { fontSize: 12, lineHeight: 15, color: ds.onHero, fontFamily: F.r },
})
