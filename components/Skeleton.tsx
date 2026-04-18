import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'

export default function Skeleton({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start()
  }, [])

  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#e0e0e0', opacity }]} />
  )
}