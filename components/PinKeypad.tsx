import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration, Image, Dimensions
} from 'react-native'

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
          onComplete(newPin)
          setPin('')
        }
      }
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCard}>
          <Image
            source={require('../assets/owode-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Step indicator */}
        {requireConfirm && (
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, !isConfirming && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, isConfirming && styles.stepDotActive]} />
          </View>
        )}

        <Text style={styles.title}>
          {isConfirming ? `Confirm ${title}` : title}
        </Text>
        <Text style={styles.subtitle}>
          {isConfirming
            ? `Re-enter your ${pinLength}-digit PIN to confirm`
            : subtitle
          }
        </Text>

        {/* Error message */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        ) : null}

        {/* PIN Dots */}
        <Animated.View style={[
          styles.dotsRow,
          { transform: [{ translateX: shakeAnim }] }
        ]}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < currentPin.length ? styles.dotFilled : styles.dotEmpty
              ]}
            >
              {i < currentPin.length && <View style={styles.dotInner} />}
            </View>
          ))}
        </Animated.View>

        <Text style={styles.hint}>
          {isConfirming
            ? '🔐 Re-enter to confirm your PIN'
            : `Enter ${pinLength} digits`
          }
        </Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypadContainer}>
        <View style={styles.keypad}>
          {keys.map((key, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.key,
                key === '' && styles.keyEmpty,
                key === 'del' && styles.keyDel,
              ]}
              onPress={() => key !== '' && handlePress(key)}
              disabled={key === ''}
              activeOpacity={0.6}
            >
              {key === 'del' ? (
                <Text style={styles.keyDelText}>⌫</Text>
              ) : key !== '' ? (
                <>
                  <Text style={styles.keyText}>{key}</Text>
                  <Text style={styles.keySubText}>
                    {key === '2' ? 'ABC' :
                     key === '3' ? 'DEF' :
                     key === '4' ? 'GHI' :
                     key === '5' ? 'JKL' :
                     key === '6' ? 'MNO' :
                     key === '7' ? 'PQRS' :
                     key === '8' ? 'TUV' :
                     key === '9' ? 'WXYZ' : ''}
                  </Text>
                </>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Secure badge */}
      <View style={styles.secureBadge}>
        <Text style={styles.secureBadgeText}>🔒 256-bit encrypted • OWODE Security</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    backgroundColor: '#0d47a1',
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  logoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: { width: width * 0.45, height: 45 },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e6eaf2',
  },
  stepDotActive: {
    backgroundColor: '#0d47a1',
    width: 28,
    borderRadius: 5,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e6eaf2',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0d47a1',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#7c8aa5',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 20,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotEmpty: {
    borderWidth: 2,
    borderColor: '#e6eaf2',
    backgroundColor: '#f4f6fb',
  },
  dotFilled: {
    backgroundColor: '#0d47a1',
    shadowColor: '#0d47a1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
  keypadContainer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width * 0.85,
    gap: 12,
    justifyContent: 'center',
  },
  key: {
    width: (width * 0.85 - 36) / 3,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#f0f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  keyDel: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '400',
    color: '#1a2b4a',
    lineHeight: 30,
  },
  keySubText: {
    fontSize: 9,
    color: '#9aa5b8',
    letterSpacing: 1,
    marginTop: 2,
  },
  keyDelText: {
    fontSize: 22,
    color: '#f5a623',
  },
  secureBadge: {
    marginBottom: 32,
    backgroundColor: '#f4f6fb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  secureBadgeText: {
    color: '#7c8aa5',
    fontSize: 11,
  },
})