import React from 'react'
import { View, Image, StyleSheet } from 'react-native'

export default function OwodeLoader({ size = 'large', fullscreen = false, style }: any) {
  const shieldH = typeof size === 'number' ? size : size === 'small' ? 34 : 76
  const shieldW = Math.round(shieldH * 0.7321)
  const pad = size === 'small' ? 9 : 14

  return (
    <View style={[fullscreen ? styles.fullscreen : styles.wrap, style]}>
      <View style={[styles.card, { width: shieldW + pad * 2, height: shieldH + pad * 2, borderRadius: 18 }]}>
        <Image
          source={require('../assets/owode-shield.png')}
          style={{ width: shieldW, height: shieldH }}
          resizeMode="contain"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  fullscreen: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  card: {
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e6ebf4',
    shadowColor: '#25427a', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 16, elevation: 8
  }
})
