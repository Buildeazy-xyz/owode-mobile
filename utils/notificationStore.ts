import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'owode_notifications'
const MAX = 100

export type OwodeNotification = {
  id: string
  kind: 'CREDIT' | 'DEBIT' | 'REWARD' | 'INFO'
  title: string
  body: string
  createdAt: string
  read: boolean
}

export const maskAccount = (acct?: string | null): string => {
  const d = (acct || '').replace(/\D/g, '')
  if (d.length < 7) return d
  return d.slice(0, 3) + '****' + d.slice(-3)
}

export const getNotifications = async (): Promise<OwodeNotification[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const addNotification = async (
  n: { kind: OwodeNotification['kind']; title: string; body: string }
) => {
  try {
    const list = await getNotifications()
    list.unshift({
      ...n,
      id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      read: false,
    })
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {}
}

export const markAllRead = async () => {
  try {
    const list = await getNotifications()
    await AsyncStorage.setItem(KEY, JSON.stringify(list.map(x => ({ ...x, read: true }))))
  } catch {}
}

export const clearNotifications = async () => {
  try { await AsyncStorage.removeItem(KEY) } catch {}
}

export const unreadCount = async (): Promise<number> => {
  const list = await getNotifications()
  return list.filter(x => !x.read).length
}
