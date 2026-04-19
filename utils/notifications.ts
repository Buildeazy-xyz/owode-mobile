import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { announcePayment } from './speech'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export const registerForPushNotifications = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('owode-alerts', {
        name: 'OWODE Payment Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default'
      })
    }

    return true
  } catch (error) {
    console.log('Push notification setup failed:', error)
    return null
  }
}

export const showPaymentNotification = async (data: {
  type: 'CREDIT' | 'DEBIT'
  amount: number
  sender?: string
  balance: number
}) => {
  const title = data.type === 'CREDIT' ? '💰 Payment Received!' : '💸 Payment Sent'
  const body = data.type === 'CREDIT'
    ? `₦${data.amount.toLocaleString()} received${data.sender ? ` from ${data.sender}` : ''} • Balance: ₦${data.balance.toLocaleString()}`
    : `₦${data.amount.toLocaleString()} sent from your wallet • Balance: ₦${data.balance.toLocaleString()}`

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null
  })

  // Also speak it out loud
  announcePayment({ type: data.type, amount: data.amount, sender: data.sender })
}