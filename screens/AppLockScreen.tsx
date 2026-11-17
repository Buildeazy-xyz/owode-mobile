import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PinKeypad from '../components/PinKeypad'
import { authAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { authenticateWithBiometrics, isBiometricEnabled, getBiometricType } from '../utils/biometrics'
import OwodeLoader from '../components/OwodeLoader'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F, ds } from '../constants/theme'
import { initials } from '../utils/ajoDue'

export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { logout, user } = useAuth()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricInfo, setBiometricInfo] = useState<any>(null)

  useEffect(() => {
    checkAndTryBiometric()
  }, [])

  const checkAndTryBiometric = async () => {
    const enabled = await isBiometricEnabled()
    const info = await getBiometricType()
    setBiometricAvailable(enabled)
    setBiometricInfo(info)
    if (enabled) {
      tryBiometric(info)
    }
  }

  const tryBiometric = async (info?: any) => {
    const bioInfo = info || biometricInfo
    const success = await authenticateWithBiometrics(
      `Use ${bioInfo?.label || 'biometrics'} to unlock OWODE`
    )
    if (success) onUnlock()
  }

  const handlePinComplete = async (pin: string) => {
    try {
      setLoading(true)
      await authAPI.verifyAppPin(pin)
      onUnlock()
    } catch (error: any) {
      Alert.alert('Wrong PIN', 'Incorrect app PIN. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: ds.hero }}>
        <OwodeLoader size="large" fullscreen color={ds.gold} label="Verifying…" />
      </View>
    )
  }

  // OWODE Alajo Redesign "App lock" board
  const first = user?.fullName?.split(' ')[0] || ''
  return (
    <View style={{ flex: 1, backgroundColor: ds.hero, paddingTop: insets.top + 24 }}>
      <PinKeypad
        title={first ? `Welcome back, ${first}` : 'Welcome back'}
        subtitle="Enter your 6-digit app PIN"
        pinLength={6}
        requireConfirm={false}
        onComplete={handlePinComplete}
        onBiometric={biometricAvailable ? () => tryBiometric() : undefined}
        badge={
          <View style={al.avatar}><Text style={al.avatarText}>{initials(user?.fullName)}</Text></View>
        }
      />
      <View style={[al.bottom, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => Alert.alert(
            'Forgot app PIN?',
            'Log in again with your account password. Then go to Settings → Change app lock PIN to set a new one.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log in with password', onPress: logout }
            ]
          )}
        >
          <Text style={al.forgot}>Forgot app PIN?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={al.password}>Use password</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const al = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, lineHeight: 27, color: ds.hero, fontFamily: F.x },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 4, backgroundColor: ds.hero },
  forgot: { fontSize: 13, lineHeight: 16, color: ds.gold, fontFamily: F.b },
  password: { fontSize: 13, lineHeight: 16, color: ds.onHero, fontFamily: F.b },
})

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingLogo: { width: 260, height: 90 },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  logoContainer: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  logo: { width: 260, height: 90, marginBottom: 12 },
  userBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  userBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bottomActions: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', gap: 12 },
  biometricBtn: { backgroundColor: 'rgba(245,166,35,0.25)', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(245,166,35,0.4)' },
  biometricText: { color: '#f5a623', fontWeight: '700', fontSize: 15 },
  forgotBtn: { marginBottom: 4 },
  forgotText: { color: '#f5a623', fontSize: 14, fontWeight: '600' },
  logoutBtn: { marginTop: 4 },
  logoutText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 }
})