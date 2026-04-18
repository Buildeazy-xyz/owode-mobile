import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start()

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => onFinish())
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>O</Text>
        </View>
        <Text style={styles.appName}>OWODE</Text>
        <Text style={styles.appTagline}>Alajo Platform</Text>
        <View style={styles.divider} />
        <Text style={styles.mission}>Moving Nigerians into the{'\n'}middle class through savings</Text>
      </Animated.View>
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <Text style={styles.bottomText}>Secure • Transparent • Scalable</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </Animated.View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#f5a623', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 10 },
  logoLetter: { fontSize: 52, fontWeight: 'bold', color: '#fff' },
  appName: { fontSize: 48, fontWeight: 'bold', color: '#fff', letterSpacing: 8 },
  appTagline: { fontSize: 16, color: '#f5a623', letterSpacing: 4, marginTop: 4 },
  divider: { width: 60, height: 2, backgroundColor: '#f5a623', marginVertical: 24, borderRadius: 2 },
  mission: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  bottom: { paddingBottom: 40, alignItems: 'center' },
  bottomText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  version: { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }
})