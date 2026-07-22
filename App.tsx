import React, { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import SplashScreenComponent from './components/SplashScreenComponent'
import { registerForPushNotifications, setupBackgroundNotifications } from './utils/notifications'

function AppContent() {
  useEffect(() => {
    registerForPushNotifications()
    setupBackgroundNotifications()
  }, [])
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
