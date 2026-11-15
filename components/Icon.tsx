import React from 'react'
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg'

// Line icons copied from the OWODE Alajo Redesign canvas (24x24 grid).
export type IconName =
  | 'home' | 'wallet' | 'savings' | 'ajo' | 'profile'
  | 'help' | 'bell' | 'eye' | 'eyeOff' | 'plus' | 'send' | 'receive'
  | 'shield' | 'shieldCheck' | 'gift' | 'back' | 'checkCircle' | 'copy'
  | 'share' | 'backspace' | 'alert' | 'lock' | 'mail' | 'close' | 'refresh'

export default function Icon({
  name, size = 22, color = '#1a2b4a', width: sw = 1.8,
}: { name: IconName; size?: number; color?: string; width?: number }) {
  const p = { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  const body = (() => {
    switch (name) {
      case 'home': return <Path {...p} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      case 'wallet': return <>
        <Rect {...p} x="2" y="5" width="20" height="14" rx="2" />
        <Line {...p} x1="2" y1="10" x2="22" y2="10" />
      </>
      case 'savings': return <>
        <Path {...p} d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        <Path {...p} d="M21 7h-6a3 3 0 0 0 0 6h6z" />
      </>
      case 'ajo': return <>
        <Circle {...p} cx="9" cy="7" r="3" />
        <Circle {...p} cx="17" cy="9" r="2.5" />
        <Path {...p} d="M3 20a6 6 0 0 1 12 0" />
        <Path {...p} d="M15 20a5 5 0 0 1 6-4.8" />
      </>
      case 'profile': return <>
        <Circle {...p} cx="12" cy="8" r="4" />
        <Path {...p} d="M4 21a8 8 0 0 1 16 0" />
      </>
      case 'help': return <>
        <Path {...p} d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <Path {...p} d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z" />
        <Path {...p} d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" />
      </>
      case 'bell': return <>
        <Path {...p} d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <Path {...p} d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
      case 'eye': return <>
        <Path {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle {...p} cx="12" cy="12" r="3" />
      </>
      case 'eyeOff': return <>
        <Path {...p} d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9" />
        <Path {...p} d="M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2" />
        <Line {...p} x1="1" y1="1" x2="23" y2="23" />
      </>
      case 'plus': return <>
        <Line {...p} x1="12" y1="5" x2="12" y2="19" />
        <Line {...p} x1="5" y1="12" x2="19" y2="12" />
      </>
      case 'send': return <>
        <Line {...p} x1="7" y1="17" x2="17" y2="7" />
        <Polyline {...p} points="8 7 17 7 17 16" />
      </>
      case 'receive': return <>
        <Line {...p} x1="17" y1="7" x2="7" y2="17" />
        <Polyline {...p} points="16 17 7 17 7 8" />
      </>
      case 'shield': return <Path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      case 'shieldCheck': return <>
        <Path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <Polyline {...p} points="9 12 11 14 15 10" />
      </>
      case 'gift': return <>
        <Polyline {...p} points="20 12 20 22 4 22 4 12" />
        <Rect {...p} x="2" y="7" width="20" height="5" />
        <Line {...p} x1="12" y1="22" x2="12" y2="7" />
        <Path {...p} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <Path {...p} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </>
      case 'back': return <Polyline {...p} points="15 18 9 12 15 6" />
      case 'checkCircle': return <>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Polyline {...p} points="8 12 11 15 16 9" />
      </>
      case 'copy': return <>
        <Rect {...p} x="9" y="9" width="13" height="13" rx="2" />
        <Path {...p} d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
      case 'share': return <>
        <Circle {...p} cx="18" cy="5" r="3" />
        <Circle {...p} cx="6" cy="12" r="3" />
        <Circle {...p} cx="18" cy="19" r="3" />
        <Line {...p} x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
        <Line {...p} x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
      </>
      case 'backspace': return <>
        <Path {...p} d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <Line {...p} x1="18" y1="9" x2="12" y2="15" />
        <Line {...p} x1="12" y1="9" x2="18" y2="15" />
      </>
      case 'alert': return <>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Line {...p} x1="12" y1="8" x2="12" y2="12" />
        <Line {...p} x1="12" y1="16" x2="12.01" y2="16" />
      </>
      case 'lock': return <>
        <Rect {...p} x="4" y="11" width="16" height="10" rx="2" />
        <Path {...p} d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
      case 'mail': return <>
        <Rect {...p} x="2" y="4" width="20" height="16" rx="2" />
        <Polyline {...p} points="22 6 12 13 2 6" />
      </>
      case 'close': return <>
        <Line {...p} x1="18" y1="6" x2="6" y2="18" />
        <Line {...p} x1="6" y1="6" x2="18" y2="18" />
      </>
      case 'refresh': return <>
        <Polyline {...p} points="23 4 23 10 17 10" />
        <Path {...p} d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
      </>
    }
  })()
  return <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>
}
