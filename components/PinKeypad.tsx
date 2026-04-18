import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface PinKeypadProps {
  onComplete: (pin: string) => void
  title?: string
  subtitle?: string
  pinLength?: number
}

export default function PinKeypad({ onComplete, title = 'Enter PIN', subtitle = 'Enter your PIN', pinLength = 4 }: PinKeypadProps) {
  const [pin, setPin] = useState('')

  const handlePress = (value: string) => {
    if (value === 'del') { setPin(prev => prev.slice(0, -1)); return }
    if (pin.length >= pinLength) return
    const newPin = pin + value
    setPin(newPin)
    if (newPin.length === pinLength) {
      setTimeout(() => { onComplete(newPin); setPin('') }, 200)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.dotsRow}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < pin.length ? '#f5a623' : 'rgba(255,255,255,0.3)' }]} />
        ))}
      </View>
      <View style={styles.keypad}>
        {keys.map((key, index) => (
          <TouchableOpacity key={index} style={[styles.key, key === '' && styles.keyEmpty]} onPress={() => key !== '' && handlePress(key)} disabled={key === ''}>
            <Text style={styles.keyText}>{key === 'del' ? '⌫' : key}</Text>
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
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 16 },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 24, fontWeight: 'bold', color: '#fff' }
})