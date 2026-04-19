import React, { useEffect, useRef } from 'react'
import { Animated, DimensionValue } from 'react-native'

interface SkeletonProps {
  width: DimensionValue
  height: number
  borderRadius?: number
}

export default function Skeleton({ width, height, borderRadius = 8 }: SkeletonProps) {
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
    <Animated.View style={{ width, height, borderRadius, backgroundColor: '#e0e0e0', opacity }} />
  )
}