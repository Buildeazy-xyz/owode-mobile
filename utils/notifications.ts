import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { announcePayment } from './speech'
import messaging from '@react-native-firebase/messaging'

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
    // Request permission
    const authStatus = await messaging().requestPermission()
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    if (!enabled) {
      console.log('Push notification permission denied')
      return null
    }

    // Get FCM token
    const fcmToken = await messaging().getToken()
    console.log('FCM Token:', fcmToken)

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('owode-payments', {
        name: 'OWODE Payment Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        showBadge: true
      })
    }

    return fcmToken
  } catch (error) {
    console.log('Push notification setup:', error)
    return null
  }
}

export const showPaymentNotification = async (data: {
  type: 'CREDIT' | 'DEBIT'
  amount: number
  sender?: string
  balance: number
}) => {
  try {
    const title = data.type === 'CREDIT' ? '💰 Payment Received!' : '💸 Payment Sent'
    const body = data.type === 'CREDIT'
      ? `₦${data.amount.toLocaleString()} received${data.sender ? ` from ${data.sender}` : ''} • Bal: ₦${data.balance.toLocaleString()}`
      : `₦${data.amount.toLocaleString()} sent • Bal: ₦${data.balance.toLocaleString()}`

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX
      },
      trigger: null
    })

    announcePayment({ type: data.type, amount: data.amount, sender: data.sender })
  } catch (error) {
    console.log('Notification error:', error)
    announcePayment({ type: data.type, amount: data.amount, sender: data.sender })
  }
}

// Listen for background messages
export const setupBackgroundNotifications = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background notification:', remoteMessage)
  })

  messaging().onMessage(async remoteMessage => {
    const { title, body } = remoteMessage.notification || {}
    if (title && body) {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: 'default' },
        trigger: null
      })
    }
  })
}