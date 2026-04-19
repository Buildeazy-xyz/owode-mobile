import React, { useState, useEffect } from 'react'
import { AppState } from 'react-native'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import SplashScreenComponent from './components/SplashScreenComponent'
import AppLockScreen from './screens/AppLockScreen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { registerForPushNotifications } from './utils/notifications'

function AppContent() {
  const { user } = useAuth()
  const [isLocked, setIsLocked] = useState(false)
  const [hasAppPin, setHasAppPin] = useState(false)

  useEffect(() => {
    registerForPushNotifications()
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
      if (nextState === 'background' && hasAppPin && user) {
        setIsLocked(true)
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