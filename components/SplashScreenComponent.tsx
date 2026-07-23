import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const logoFade = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    // Logo appears first
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start()

    // Then text slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start()
    }, 400)

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onFinish())
    }, 3500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>

      {/* Main Content */}
      <View style={styles.content}>

        {/* Logo Card */}
        <Animated.View style={[
          styles.logoCard,
          {
            opacity: logoFade,
            transform: [{ scale: logoScale }]
          }
        ]}>
          <Image
            source={require('../assets/owode-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text Content */}
        <Animated.View style={[
          styles.textContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.divider} />
          <Text style={styles.mission}>
            Moving Nigerians into the{'\n'}middle class through savings
          </Text>

          {/* Feature badges */}
          <View style={styles.badges}>
            {['Guaranteed', 'Digital Wallet', 'Community'].map((badge, i) => (
              <View key={i} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <View style={styles.bottomBadges}>
          <Text style={styles.bottomText}>🔒 Secure</Text>
          <Text style={styles.bottomDot}>•</Text>
          <Text style={styles.bottomText}>📊 Transparent</Text>
          <Text style={styles.bottomDot}>•</Text>
          <Text style={styles.bottomText}>🚀 Scalable</Text>
        </View>
        <Text style={styles.version}>v1.0.0 • OWODE Digital Services Limited</Text>
        <Text style={styles.tagline}>ALÀJÒ-ÀGBÁYÉ: THE GLOBAL THRIFT COLLECTOR</Text>
      </Animated.View>

    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 24 },
  logoCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    width: width * 0.78,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 32
  },
  logoImage: { width: width * 0.65, height: 80 },
  textContent: { alignItems: 'center', width: '100%' },
  divider: { width: 60, height: 3, backgroundColor: '#f5a623', marginBottom: 20, borderRadius: 2 },
  mission: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 26, fontWeight: '500', marginBottom: 24 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bottom: { alignItems: 'center', gap: 6 },
  bottomBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  bottomDot: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  version: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  tagline: { fontSize: 10, color: '#f5a623', letterSpacing: 1, marginTop: 2, textAlign: 'center' }
})