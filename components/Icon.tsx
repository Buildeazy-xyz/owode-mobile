import React from 'react'
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg'

// Line icons copied from the OWODE Alajo Redesign canvas (24x24 grid).
export type IconName =
  | 'home' | 'wallet' | 'savings' | 'ajo' | 'profile'
  | 'help' | 'bell' | 'eye' | 'eyeOff' | 'plus' | 'send' | 'receive'
  | 'shield' | 'shieldCheck' | 'gift' | 'back' | 'checkCircle' | 'copy'
  | 'share' | 'backspace' | 'alert' | 'lock' | 'mail' | 'close' | 'refresh'
  | 'download' | 'search' | 'filter' | 'calendar' | 'chevron' | 'gear' | 'star' | 'user'
  | 'doc' | 'logout' | 'key' | 'finger' | 'trash' | 'mic'
  | 'info' | 'check' | 'chat' | 'phone' | 'trophy' | 'history' | 'grip' | 'sun' | 'camera' | 'clock' | 'up' | 'down'

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
      case 'download': return <>
        <Path {...p} d="M12 3v12" />
        <Polyline {...p} points="7 10 12 15 17 10" />
        <Path {...p} d="M5 21h14" />
      </>
      case 'search': return <>
        <Circle {...p} cx="11" cy="11" r="7" />
        <Line {...p} x1="21" y1="21" x2="16.5" y2="16.5" />
      </>
      case 'filter': return <>
        <Line {...p} x1="4" y1="6" x2="20" y2="6" />
        <Line {...p} x1="7" y1="12" x2="17" y2="12" />
        <Line {...p} x1="10" y1="18" x2="14" y2="18" />
      </>
      case 'calendar': return <>
        <Rect {...p} x="3" y="4" width="18" height="18" rx="2" />
        <Line {...p} x1="16" y1="2" x2="16" y2="6" />
        <Line {...p} x1="8" y1="2" x2="8" y2="6" />
        <Line {...p} x1="3" y1="10" x2="21" y2="10" />
      </>
      case 'chevron': return <Polyline {...p} points="9 18 15 12 9 6" />
      case 'gear': return <>
        <Circle {...p} cx="12" cy="12" r="3" />
        <Path {...p} d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
      case 'star': return <Polygon {...p} points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
      case 'user': return <>
        <Circle {...p} cx="12" cy="8" r="4" />
        <Path {...p} d="M4 21a8 8 0 0 1 16 0" />
      </>
      case 'doc': return <>
        <Path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <Polyline {...p} points="14 2 14 8 20 8" />
        <Line {...p} x1="8" y1="13" x2="16" y2="13" />
        <Line {...p} x1="8" y1="17" x2="13" y2="17" />
      </>
      case 'logout': return <>
        <Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <Polyline {...p} points="16 17 21 12 16 7" />
        <Line {...p} x1="21" y1="12" x2="9" y2="12" />
      </>
      case 'key': return <>
        <Circle {...p} cx="8" cy="15" r="4" />
        <Path {...p} d="M10.8 12.2 20 3" />
        <Path {...p} d="M17 6l3 3" />
      </>
      case 'finger': return <>
        <Path {...p} d="M12 11v4" />
        <Path {...p} d="M8.5 8.5a5 5 0 0 1 8.5 3.5v2" />
        <Path {...p} d="M6 12a6 6 0 0 1 .7-2.8" />
        <Path {...p} d="M9 13v1a7 7 0 0 0 1.5 4.3" />
        <Path {...p} d="M15 15.5a9 9 0 0 1-1 4" />
        <Path {...p} d="M4.5 16A10 10 0 0 1 4 12a8 8 0 0 1 14.6-4.5" />
      </>
      case 'trash': return <>
        <Polyline {...p} points="3 6 5 6 21 6" />
        <Path {...p} d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <Path {...p} d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </>
      case 'mic': return <>
        <Rect {...p} x="9" y="2" width="6" height="12" rx="3" />
        <Path {...p} d="M5 11a7 7 0 0 0 14 0" />
        <Line {...p} x1="12" y1="18" x2="12" y2="22" />
      </>
      case 'info': return <>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Line {...p} x1="12" y1="16" x2="12" y2="12" />
        <Line {...p} x1="12" y1="8" x2="12.01" y2="8" />
      </>
      case 'check': return <Polyline {...p} points="5 12 10 17 19 7" />
      case 'chat': return <Path {...p} d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" />
      case 'phone': return <Path {...p} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      case 'trophy': return <>
        <Path {...p} d="M8 21h8" />
        <Path {...p} d="M12 17v4" />
        <Path {...p} d="M7 4h10v5a5 5 0 0 1-10 0z" />
        <Path {...p} d="M17 5h3v2a3 3 0 0 1-3 3" />
        <Path {...p} d="M7 5H4v2a3 3 0 0 0 3 3" />
      </>
      case 'history': return <>
        <Path {...p} d="M3 3v5h5" />
        <Path {...p} d="M3.1 13a9 9 0 1 0 2.1-7.4L3 8" />
        <Polyline {...p} points="12 7 12 12 15 14" />
      </>
      case 'grip': return <>
        <Circle {...p} cx="9" cy="6" r="1" /><Circle {...p} cx="15" cy="6" r="1" />
        <Circle {...p} cx="9" cy="12" r="1" /><Circle {...p} cx="15" cy="12" r="1" />
        <Circle {...p} cx="9" cy="18" r="1" /><Circle {...p} cx="15" cy="18" r="1" />
      </>
      case 'sun': return <>
        <Circle {...p} cx="12" cy="12" r="4" />
        <Line {...p} x1="12" y1="1" x2="12" y2="3" /><Line {...p} x1="12" y1="21" x2="12" y2="23" />
        <Line {...p} x1="1" y1="12" x2="3" y2="12" /><Line {...p} x1="21" y1="12" x2="23" y2="12" />
      </>
      case 'camera': return <>
        <Path {...p} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <Circle {...p} cx="12" cy="13" r="4" />
      </>
      case 'clock': return <>
        <Circle {...p} cx="12" cy="12" r="10" />
        <Polyline {...p} points="12 6 12 12 16 14" />
      </>
      case 'up': return <Polyline {...p} points="18 15 12 9 6 15" />
      case 'down': return <Polyline {...p} points="6 9 12 15 18 9" />
      case 'refresh': return <>
        <Polyline {...p} points="23 4 23 10 17 10" />
        <Path {...p} d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
      </>
    }
  })()
  return <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>
}
