import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View, Image, StyleSheet } from 'react-native'

// Breathing OWODE shield inside a white rounded card.
// Drop-in replacement for <ActivityIndicator />; keeps the same size/color props.
// Pass fullscreen to centre it in the whole available space.
export default function OwodeLoader({ size = 'large', fullscreen = false, style }: any) {
  const scale = useRef(new Animated.Value(0.9)).current
  const glow  = useRef(new Animated.Value(0.6)).current

  const shieldH = typeof size === 'number' ? size : size === 'small' ? 34 : 76
  const RATIO   = 0.7321                      // true shield aspect
  const shieldW = Math.round(shieldH * RATIO)
  const pad     = size === 'small' ? 9 : 14   // snug: card just clears the shield
  const cardW   = shieldW + pad * 2
  const cardH   = shieldH + pad * 2
  const radius  = Math.round(Math.min(cardW, cardH) * 0.28)

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.05, duration: 820, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 1,    duration: 820, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.9,  duration: 820, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.6,  duration: 820, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  return (
    <View style={[fullscreen ? styles.fullscreen : styles.wrap, style]}>
      <View style={[styles.card, { width: cardW, height: cardH, borderRadius: radius }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Image
            source={require('../assets/owode-shield.png')}
            style={{ width: shieldW, height: shieldH }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  card: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e6ebf4',
    shadowColor: '#25427a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8
  }
})
