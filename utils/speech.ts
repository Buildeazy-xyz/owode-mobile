import * as Speech from 'expo-speech'

const OWODE_PRONUNCIATION = 'Owode'

let lastSpokenAt = 0
let lastMessage = ''
export const speakAlert = (message: string) => {
  const now = Date.now()
  if (message === lastMessage && now - lastSpokenAt < 6000) return
  lastSpokenAt = now
  lastMessage = message
  Speech.stop()
  Speech.speak(message, {
    language: 'en-NG',
    pitch: 1.0,
    rate: 0.85,
    onDone: () => {},
    onError: () => {}
  })
}

export const announcePayment = (data: {
  type: 'CREDIT' | 'DEBIT'
  amount: number
  sender?: string
}) => {
  try {
    if (data.type === 'CREDIT') {
      speakAlert(`Payment received in ${OWODE_PRONUNCIATION}`)
    }
  } catch (e) {
    console.log('Speech error:', e)
  }
}

export const announceAjoPayout = (amount: number, groupName: string) => {
  try {
    speakAlert(`Payment received in ${OWODE_PRONUNCIATION}`)
  } catch (e) {}
}

export const announceContribution = (amount: number, groupName: string) => {
  try {
    speakAlert(`Contribution successful in ${OWODE_PRONUNCIATION}`)
  } catch (e) {}
}
