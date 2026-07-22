import * as Speech from 'expo-speech'
import AsyncStorage from '@react-native-async-storage/async-storage'

const OWODE = 'Owode'
let speaking = false
const say = (msg: string) => {
  if (speaking) return
  speaking = true
  Speech.stop()
  Speech.speak(msg, { language: 'en-NG', pitch: 1.0, rate: 0.85,
    onDone: () => { speaking = false }, onError: () => { speaking = false } })
}
export const announceNewCredit = async (txId?: string) => {
  try {
    if (!txId) return
    const last = await AsyncStorage.getItem('owode_last_announced_tx')
    if (last === txId) return
    const firstEver = last === null
    await AsyncStorage.setItem('owode_last_announced_tx', txId)
    if (firstEver) return
    say('Payment received in ' + OWODE)
  } catch (e) {}
}
export const speakAlert = (msg: string) => say(msg)
export const announcePayment = (..._args: any[]) => {}
export const announceAjoPayout = (..._args: any[]) => { say('Payment received in ' + OWODE) }
export const announceContribution = (..._args: any[]) => { say('Contribution successful in ' + OWODE) }
