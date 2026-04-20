import * as LocalAuthentication from 'expo-local-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'

export const getBiometricType = async () => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    if (!compatible) return { hasFaceID: false, hasFingerprint: false, hasAny: false, label: 'None', icon: '🔒' }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    const hasFaceID = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)

    return {
      hasFaceID,
      hasFingerprint,
      hasAny: hasFaceID || hasFingerprint,
      label: hasFaceID ? 'Face ID' : hasFingerprint ? 'Fingerprint' : 'None',
      icon: hasFaceID ? '😊' : hasFingerprint ? '👆' : '🔒'
    }
  } catch {
    return { hasFaceID: false, hasFingerprint: false, hasAny: false, label: 'None', icon: '🔒' }
  }
}

export const authenticateWithBiometrics = async (reason?: string): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    if (!compatible) return false

    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!enrolled) {
      Alert.alert(
        'No Biometrics Found',
        'Please set up fingerprint or face ID in your phone settings first.',
        [{ text: 'OK' }]
      )
      return false
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason || 'Verify your identity',
      fallbackLabel: 'Use PIN instead',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false
    })

    return result.success
  } catch (error) {
    console.log('Biometric auth error:', error)
    return false
  }
}

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem('biometric_enabled')
    if (!enabled) return false
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return enrolled
  } catch {
    return false
  }
}

export const isBiometricEnrolled = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    if (!compatible) return false
    return await LocalAuthentication.isEnrolledAsync()
  } catch {
    return false
  }
}