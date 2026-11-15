import React, { useEffect, useRef, useState } from 'react'
import { View, Image, Text, StyleSheet, Animated, Easing, AccessibilityInfo } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { F, ds } from '../constants/theme'

// OWODE Alajo Redesign "Loading" boards: the shield in a white circle with a
// ring spinning round it. Same props as before, so every screen picks it up.
//   color  — ring colour. White or gold means it sits on navy.
//   label  — optional line under it, e.g. "Loading your wallet…"
const DARK_RINGS = ['#fff', '#ffffff', 'white', '#f5a623', ds.gold]

export default function OwodeLoader({ size = 'large', fullscreen = false, style, color, label }: any) {
  const onDark = DARK_RINGS.includes(String(color || '').toLowerCase())
  const ring = color || ds.navy
  const track = onDark ? 'rgba(255,255,255,0.18)' : ds.border

  const small = size === 'small'
  const brand = fullscreen && onDark && !small
  const box = typeof size === 'number' ? size * 1.75 : small ? 36 : brand ? 152 : fullscreen ? 132 : 96
  const stroke = small ? 3 : 4
  const inner = box - (small ? 8 : brand ? 36 : 32)
  const shieldH = Math.round(inner * 0.63)
  const shieldW = Math.round(shieldH * 0.7321)
  const r = (box - stroke * 2) / 2
  const c = 2 * Math.PI * r

  const spin = useRef(new Animated.Value(0)).current
  const [still, setStill] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setStill(!!v) }).catch(() => {})
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (still) return
    const loop = Animated.loop(Animated.timing(spin, {
      toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true,
    }))
    loop.start()
    return () => loop.stop()
  }, [still])
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  const caption = label || (fullscreen && onDark ? 'Your money is safe' : '')

  return (
    <View
      style={[fullscreen ? styles.fullscreen : styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Loading'}
    >
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <Svg width={box} height={box}>
            <Circle
              cx={box / 2} cy={box / 2} r={r} stroke={ring} strokeWidth={stroke} fill="none"
              strokeLinecap="round" strokeDasharray={`${c * 0.26} ${c}`}
            />
          </Svg>
        </Animated.View>
        <View style={[styles.disc, { width: inner, height: inner, borderRadius: inner / 2 }, small && styles.discSmall]}>
          <Image
            source={require('../assets/owode-shield.png')}
            style={{ width: shieldW, height: shieldH }}
            resizeMode="contain"
          />
        </View>
      </View>
      {brand && <Text style={styles.brand}>OWODE</Text>}
      {!!caption && !small && (
        <Text style={[styles.caption, { color: onDark ? ds.onHero : ds.muted }]}>{caption}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 14 },
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', gap: 20 },
  disc: {
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0a142d', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  discSmall: { shadowOpacity: 0, elevation: 0 },
  caption: { fontSize: 14, lineHeight: 20, fontFamily: F.s, textAlign: 'center' },
  brand: { fontSize: 22, lineHeight: 27, fontFamily: F.x, color: '#ffffff', letterSpacing: 2, marginBottom: -14 },
})
