import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon, { IconName } from './Icon'
import { F, ds } from '../constants/theme'

type TabKey = 'home' | 'wallet' | 'savings' | 'ajo' | 'profile'

const TABS: { key: TabKey; label: string; route: string; icon: IconName }[] = [
  { key: 'home',    label: 'Home',    route: 'Dashboard', icon: 'home' },
  { key: 'wallet',  label: 'Wallet',  route: 'Wallet',    icon: 'wallet' },
  { key: 'savings', label: 'Savings', route: 'Savings',   icon: 'savings' },
  { key: 'ajo',     label: 'Ajọ',     route: 'Ajo',       icon: 'ajo' },
  { key: 'profile', label: 'Profile', route: 'Profile',   icon: 'profile' },
]

export default function BottomNav({ navigation, active }: { navigation: any; active: TabKey }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      {TABS.map(tab => {
        const on = tab.key === active
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => { if (!on) navigation.navigate(tab.route) }}
          >
            <Icon name={tab.icon} size={22} color={on ? ds.hero : ds.muted} width={on ? 2 : 1.8} />
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', backgroundColor: ds.card,
    borderTopWidth: 1, borderTopColor: ds.border,
    paddingTop: 8, paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56 },
  label: { fontSize: 11, lineHeight: 13, color: ds.muted, fontFamily: F.s },
  labelOn: { color: ds.hero, fontFamily: F.x },
})
