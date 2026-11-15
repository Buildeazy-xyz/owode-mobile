import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppNavigator from './navigation/AppNavigator'
import SplashScreenComponent from './components/SplashScreenComponent'
import { registerForPushNotifications, setupBackgroundNotifications } from './utils/notifications'
import {
  useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'

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
  // Fonts load from the app bundle while the splash plays. If they ever fail,
  // carry on with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
    Manrope_700Bold, Manrope_800ExtraBold,
  })
  if (showSplash || (!fontsLoaded && !fontError)) {
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
