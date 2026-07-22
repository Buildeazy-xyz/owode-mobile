import React, { useState, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import SplashScreenComponent from './components/SplashScreenComponent'
import AppLockScreen from './screens/AppLockScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { registerForPushNotifications, setupBackgroundNotifications } from './utils/notifications'

const LOCK_AFTER_MS = 3 * 60 * 1000 // 3 minutes

function AppContent() {
  const { user } = useAuth()
  const [isLocked, setIsLocked] = useState(false)
  const [hasAppPin, setHasAppPin] = useState(false)
  const backgroundedAt = useRef<number | null>(null)

  useEffect(() => {
    registerForPushNotifications()
    setupBackgroundNotifications()
  }, [])

  useEffect(() => {
    const checkAppPin = async () => {
      const pin = await AsyncStorage.getItem('has_app_pin')
      setHasAppPin(!!pin)
    }
    if (user) checkAppPin()
  }, [user])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!hasAppPin || !user) return

      if (nextState === 'background' || nextState === 'inactive') {
        // remember when the app went to background
        backgroundedAt.current = Date.now()
      }

      if (nextState === 'active') {
        // lock if it's been in background longer than the threshold
        if (backgroundedAt.current && Date.now() - backgroundedAt.current >= LOCK_AFTER_MS) {
          setIsLocked(true)
        }
        backgroundedAt.current = null
      }
    })
    return () => subscription?.remove()
  }, [hasAppPin, user])

  if (user && hasAppPin && isLocked) {
    return <AppLockScreen onUnlock={() => setIsLocked(false)} />
  }

  return <AppNavigator />
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreenComponent onFinish={() => setShowSplash(false)} />
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
