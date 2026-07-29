import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View, StyleSheet } from 'react-native'
import { Image } from 'react-native'

// Breathing OWODE shield. Drop-in replacement for <ActivityIndicator />.
// Accepts the same size/color props so existing call sites keep working.
export default function OwodeLoader({ size = 'large', color = '#25427a', style }: any) {
  const scale = useRef(new Animated.Value(0.86)).current
  const glow = useRef(new Animated.Value(0.55)).current
  const px = typeof size === 'number' ? size : size === 'small' ? 22 : 42

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.14, duration: 780, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.86, duration: 780, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.55, duration: 780, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View style={{ transform: [{ scale }], opacity: glow }}>
        <Image source={require('../assets/owode-shield.png')} style={{ width: px * 0.72, height: px }} resizeMode="contain" />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }
})
