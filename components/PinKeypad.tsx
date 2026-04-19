import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface PinKeypadProps {
  onComplete: (pin: string) => void
  title?: string
  subtitle?: string
  pinLength?: number
}

export default function PinKeypad({
  onComplete,
  title = 'Enter PIN',
  subtitle = 'Enter your PIN',
  pinLength = 4
}: PinKeypadProps) {
  const [pin, setPin] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = () => {
    Vibration.vibrate(200)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  const handlePress = (value: string) => {
    if (value === 'del') {
      setPin(prev => prev.slice(0, -1))
      return
    }
    if (pin.length >= pinLength) return
    const newPin = pin + value
    setPin(newPin)
    if (newPin.length === pinLength) {
      setTimeout(() => {
        onComplete(newPin)
        setPin('')
      }, 150)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <LinearGradient
      colors={['#0a0a2e', '#0d47a1', '#1a237e']}
      style={styles.container}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>O</Text>
        </View>
        <Text style={styles.logoName}>OWODE</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* PIN Dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length
                ? styles.dotFilled
                : styles.dotEmpty
            ]}
          >
            {i < pin.length && <View style={styles.dotInner} />}
          </View>
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {keys.map((key, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.key,
              key === '' && styles.keyEmpty,
              key === 'del' && styles.keyDel
            ]}
            onPress={() => key !== '' && handlePress(key)}
            disabled={key === ''}
            activeOpacity={0.7}
          >
            {key === 'del' ? (
              <Text style={styles.keyDelText}>⌫</Text>
            ) : key !== '' ? (
              <Text style={styles.keyText}>{key}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Secure badge */}
      <View style={styles.secureBadge}>
        <Text style={styles.secureBadgeText}>🔒 Secured by OWODE</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5a623',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  logoName: { color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 4 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
    textAlign: 'center'
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 48
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dotEmpty: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  dotFilled: {
    backgroundColor: '#f5a623',
    borderWidth: 0,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff'
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    gap: 16,
    justifyContent: 'center'
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent'
  },
  keyDel: {
    backgroundColor: 'rgba(245,166,35,0.2)',
    borderColor: 'rgba(245,166,35,0.3)'
  },
  keyText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff'
  },
  keyDelText: {
    fontSize: 24,
    color: '#f5a623'
  },
  secureBadge: {
    marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  secureBadgeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12
  }
})