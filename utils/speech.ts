import * as Speech from 'expo-speech'

export const speakAlert = (message: string) => {
  Speech.speak(message, {
    language: 'en-NG',
    pitch: 1.0,
    rate: 0.9
  })
}

export const announcePayment = (data: {
  type: 'CREDIT' | 'DEBIT'
  amount: number
  sender?: string
}) => {
  if (data.type === 'CREDIT') {
    const message = data.sender
      ? `Payment received in OWODE from ${data.sender}. Amount: ${data.amount.toLocaleString()} Naira`
      : `Payment of ${data.amount.toLocaleString()} Naira received in your OWODE wallet`
    speakAlert(message)
  } else {
    speakAlert(`Payment of ${data.amount.toLocaleString()} Naira sent from your OWODE wallet`)
  }
}