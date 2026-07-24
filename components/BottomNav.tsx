import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type TabKey = 'home' | 'wallet' | 'savings' | 'ajo' | 'profile'

const TABS: { key: TabKey; label: string; route: string; icon: any; iconActive: any }[] = [
  { key: 'home',    label: 'Home',    route: 'Dashboard', icon: 'home-outline',        iconActive: 'home' },
  { key: 'wallet',  label: 'Wallet',  route: 'Wallet',    icon: 'wallet-outline',      iconActive: 'wallet' },
  { key: 'savings', label: 'Savings', route: 'Savings',   icon: 'trending-up-outline', iconActive: 'trending-up' },
  { key: 'ajo',     label: 'Ajo',     route: 'Ajo',       icon: 'people-outline',      iconActive: 'people' },
  { key: 'profile', label: 'Profile', route: 'Profile',   icon: 'person-outline',      iconActive: 'person' },
]

export default function BottomNav({ navigation, active }: { navigation: any; active: TabKey }) {
  return (
    <View style={styles.bar}>
      {TABS.map(tab => {
        const isActive = tab.key === active
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => { if (!isActive) navigation.navigate(tab.route) }}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={22}
              color={isActive ? '#0d47a1' : '#9aa5b8'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0f2f7',
    paddingTop: 10, paddingBottom: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 11, color: '#9aa5b8', fontWeight: '500' },
  labelActive: { color: '#0d47a1', fontWeight: '700' },
})
