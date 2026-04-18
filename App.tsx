import React, { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import SplashScreenComponent from './components/SplashScreenComponent'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreenComponent onFinish={() => setShowSplash(false)} />
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  )
}