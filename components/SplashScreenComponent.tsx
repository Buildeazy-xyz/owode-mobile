import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import OwodeLoader from './OwodeLoader'
import { F, ds } from '../constants/theme'

// OWODE Alajo Redesign "Loading (app opening)" board: navy screen, shield in a
// white circle with the gold ring, "OWODE / Your money is safe".
export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onFinish())
    }, 2600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <OwodeLoader size="large" fullscreen color={ds.gold} />
      </Animated.View>
      <Text style={styles.footer}>OWODE Digital Services Limited · RC 8569061</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ds.hero },
  center: { flex: 1 },
  footer: { fontSize: 11, lineHeight: 15, color: ds.onHero, fontFamily: F.r, textAlign: 'center', paddingBottom: 34 },
})
