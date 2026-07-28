// Voice alerts are OFF.
//
// Nigerian-English text-to-speech mispronounces "OWODE" (it reads it as
// "Owo"), and no spelling workaround gets it right. Rather than ship a
// robot saying the company name wrong, these are no-ops until we replace
// them with recorded audio played through expo-av.
//
// The push notifications themselves are unaffected - only the speech is off.

export const speakAlert = (_message: string) => {}

export const announcePayment = (_data: {
  type: 'CREDIT' | 'DEBIT'
  amount: number
  sender?: string
}) => {}

export const announceAjoPayout = (_amount: number, _groupName: string) => {}

export const announceContribution = (_amount: number, _groupName: string) => {}

export const announceNewCredit = (_amount?: number, _sender?: string) => {}
