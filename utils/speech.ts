import * as Speech from 'expo-speech'

// OWODE in Yoruba is pronounced "Oh-woh-deh" not spelled out
const OWODE_PRONUNCIATION = 'Owodeh' // Phonetic spelling for TTS

export const speakAlert = (message: string) => {
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
      const message = data.sender
        ? `Payment received in ${OWODE_PRONUNCIATION} from ${data.sender}. Amount: ${data.amount.toLocaleString()} Naira`
        : `Payment of ${data.amount.toLocaleString()} Naira received in your ${OWODE_PRONUNCIATION} wallet`
      speakAlert(message)
    } else {
      speakAlert(`Payment of ${data.amount.toLocaleString()} Naira sent from your ${OWODE_PRONUNCIATION} wallet`)
    }
  } catch (e) {
    console.log('Speech error (non-critical):', e)
  }
}

export const announceAjoPayout = (amount: number, groupName: string) => {
  try {
    speakAlert(`Congratulations! You received your ${OWODE_PRONUNCIATION} Ajo payout of ${amount.toLocaleString()} Naira from ${groupName}`)
  } catch (e) {}
}

export const announceContribution = (amount: number, groupName: string) => {
  try {
    speakAlert(`Your contribution of ${amount.toLocaleString()} Naira to ${groupName} was successful`)
  } catch (e) {}
}