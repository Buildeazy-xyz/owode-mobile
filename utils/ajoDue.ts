// Works out where a user stands in an Ajo group, using the same rotation
// rules the server uses when it pays out (ajo.service / guaranteed-ajo.service).

export type AjoKind = 'standard' | 'guaranteed'

export const ajoMembers = (group: any): any[] =>
  (group?.members || [])
    .filter((m: any) => !m.isAvatar && (!m.status || m.status === 'APPROVED'))
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

// Size of the payout rotation. Guaranteed groups count the Avatar seat in
// totalMembers, so the rotation is one smaller.
export const ajoSize = (group: any, kind: AjoKind) =>
  Math.max(1, kind === 'guaranteed' ? (group?.totalMembers || 1) - 1 : (group?.totalMembers || 1))

// Position (1-based) that collects this cycle.
export const ajoCurrentPosition = (group: any, kind: AjoKind) =>
  ((group?.currentCycle || 0) % ajoSize(group, kind)) + 1

export const ajoPayout = (group: any, kind: AjoKind) =>
  (group?.amount || 0) * ajoSize(group, kind)

export const ajoDueAmount = (group: any, kind: AjoKind) =>
  (group?.amount || 0) + (kind === 'guaranteed' ? (group?.guaranteeFee || 0) : 0)

export const ajoIsFull = (group: any, kind: AjoKind) =>
  ajoMembers(group).length >= ajoSize(group, kind)

export const ajoDueWord = (frequency?: string) => {
  const f = String(frequency || '').toUpperCase()
  if (f === 'DAILY') return 'today'
  if (f === 'WEEKLY') return 'this week'
  if (f === 'MONTHLY') return 'this month'
  return 'now'
}

// "Tunde Adebayo" -> "Tunde A."
export const shortName = (full?: string) => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Member'
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
}

export const initials = (full?: string) => {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Plain comma grouping. Does not depend on the phone's Intl support.
export const commas = (n: number) =>
  String(Math.trunc(Math.abs(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export const naira = (n: number) => (n < 0 ? '−' : '') + '₦' + commas(Math.round(Math.abs(n || 0)))

// 48250.5 -> { whole: '48,250', kobo: '.50' }
export const splitNaira = (n: number) => {
  const v = Math.round(Math.abs(n || 0) * 100)
  return { whole: commas(Math.floor(v / 100)), kobo: '.' + String(v % 100).padStart(2, '0') }
}
