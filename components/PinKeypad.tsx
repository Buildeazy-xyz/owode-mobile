import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'

interface PinKeypadProps {
  onComplete: (pin: string) => void
  title?: string
  subtitle?: string
}

export default function PinKeypad({ onComplete, title = 'Enter PIN', subtitle = 'Enter your 4-digit PIN' }: PinKeypadProps) {
  const [pin, setPin] = useState('')

  const handlePress = (value: string) => {
    if (value === 'del') {
      setPin(prev => prev.slice(0, -1))
      return
    }
    if (pin.length >= 4) return
    const newPin = pin + value
    setPin(newPin)
    if (newPin.length === 4) {
      setTimeout(() => {
        onComplete(newPin)
        setPin('')
      }, 200)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* PIN Dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, { backgroundColor: i < pin.length ? '#f5a623' : 'rgba(255,255,255,0.3)' }]} />
        ))}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {keys.map((key, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => key !== '' && handlePress(key)}
            disabled={key === ''}
          >
            {key === 'del' ? (
              <Text style={styles.keyText}>⌫</Text>
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 40 },
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 16 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 24, fontWeight: 'bold', color: '#fff' }
})