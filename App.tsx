import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import SplashScreenComponent from './components/SplashScreenComponent'
import { registerForPushNotifications, setupBackgroundNotifications } from './utils/notifications'

function AppContent() {
  const { user } = useAuth()

  useEffect(() => {
    setupBackgroundNotifications()
  }, [])

  // Register the push token once there is an account to attach it to.
  // Running this before login saved nothing, which is why most users had no token.
  useEffect(() => {
    if (user) registerForPushNotifications()
  }, [user?.id])

  return <AppNavigator />
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  if (showSplash) {
    return <SplashScreenComponent onFinish={() => setShowSplash(false)} />
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
