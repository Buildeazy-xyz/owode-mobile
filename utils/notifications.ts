import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { announcePayment } from './speech'
import api from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require physical device')
      return null
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied')
      return null
    }

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

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '9a3481c5-e161-47e5-844e-d608cbe23738'
    })

    console.log('Expo Push Token:', token.data)

    // Save token to backend
    try {
      await api.post('/users/push-token', { pushToken: token.data })
      console.log('Push token saved to backend!')
    } catch (error) {
      console.log('Could not save push token:', error)
    }

    return token.data
  } catch (error) {
    console.log('Push notification setup error:', error)
    return null
  }
}

export const setupBackgroundNotifications = () => {
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification)
  })

  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response)
  })
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