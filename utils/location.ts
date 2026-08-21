import * as Location from 'expo-location'
import { Alert } from 'react-native'

export type TxLocation = { latitude: number; longitude: number } | null

// Ask once, at the moment it matters, and explain what the customer gets.
// Returns coordinates when available. Never blocks a transaction.
export const getTransactionLocation = async (): Promise<TxLocation> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync()

    if (status !== 'granted') {
      const asked = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Turn on location to help protect your transactions',
          'We record where a transaction was made so we can help you if a payment is ever disputed.',
          [
            { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Turn on', onPress: () => resolve(true) }
          ]
        )
      })
      if (!asked) return null

      const req = await Location.requestForegroundPermissionsAsync()
      if (req.status !== 'granted') return null
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    })
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  } catch (err: any) {
    // Location is a bonus, never a blocker.
    return null
  }
}
