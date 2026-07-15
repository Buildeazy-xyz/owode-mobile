import * as Speech from 'expo-speech'
import AsyncStorage from '@react-native-async-storage/async-storage'

const OWODE_PRONUNCIATION = 'Owode'
let speaking = false

export const speakAlert = (message: string) => {
  if (speaking) return
  speaking = true
  Speech.speak(message, {
    language: 'en-NG',
    pitch: 1.0,
    rate: 0.85,
    onDone: () => { speaking = false },
    onError: () => { speaking = false }
  })
}

// Announce ONLY when this transaction id has never been announced before
export const announceNewCredit = async (txId: string) => {
  try {
    const last = await AsyncStorage.getItem('owode_last_announced_tx')
    if (last === txId) return
    await AsyncStorage.setItem('owode_last_announced_tx', txId)
    if (last === null) return // first ever load: remember silently, do not replay history
    speakAlert(`Payment received in ${OWODE_PRONUNCIATION}`)
  } catch (e) {}
}

export const announcePayment = (data: { type: 'CREDIT' | 'DEBIT'; amount: number; sender?: string }) => {
  try { if (data.type === 'CREDIT') speakAlert(`Payment received in ${OWODE_PRONUNCIATION}`) } catch (e) {}
}

export const announceAjoPayout = (amount: number, groupName: string) => {
  try { speakAlert(`Payment received in ${OWODE_PRONUNCIATION}`) } catch (e) {}
}

export const announceContribution = (amount: number, groupName: string) => {
  try { speakAlert(`Contribution successful in ${OWODE_PRONUNCIATION}`) } catch (e) {}
}
