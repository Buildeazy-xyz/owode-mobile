import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { F, ds, tnum } from '../constants/theme'

// OWODE Alajo Redesign — "Log in" board
export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth()
  const insets = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()
  // The logo file is 1106 x 312. Fixed numbers keep it sharp on every phone.
  const logoW = Math.min(screenW * 0.86, 320) - 32
  const logoH = Math.round(logoW * 312 / 1106)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focus, setFocus] = useState<'phone' | 'password' | null>(null)

  // 08031234567 -> "0803 123 4567"; only the digits are sent to the server
  const spacedPhone = (d: string) =>
    [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(' ')

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Phone and password are required')
      return
    }
    try {
      setLoading(true)
      await login(phone, password)
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.hero, { paddingTop: insets.top + 40 }]}>
          <View style={s.logoCard}>
            <Image source={require('../assets/owode-logo.png')} style={{ width: logoW, height: logoH }} resizeMode="contain" accessibilityLabel="OWODE Digital Services Limited" />
          </View>
        </View>

        <View style={s.card}>
          <View style={{ gap: 4 }}>
            <Text style={s.h1}>Welcome back</Text>
            <Text style={s.sub}>Log in to your OWODE account</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={s.eyebrow}>PHONE NUMBER</Text>
            <TextInput
              style={[s.input, focus === 'phone' && s.inputOn]}
              placeholder="0801 234 5678"
              placeholderTextColor="#9aa5b8"
              value={spacedPhone(phone)}
              onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 11))}
              onFocus={() => setFocus('phone')}
              onBlur={() => setFocus(null)}
              keyboardType="phone-pad"
              maxLength={13}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={s.eyebrow}>PASSWORD</Text>
            <View>
              <TextInput
                style={[s.input, { paddingRight: 52 }, focus === 'password' && s.inputOn]}
                placeholder="Enter your password"
                placeholderTextColor="#9aa5b8"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocus('password')}
                onBlur={() => setFocus(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                autoComplete="password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                style={s.eye}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} color={ds.muted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', paddingVertical: 4 }}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={s.link}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.cta} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={ds.hero} /> : <Text style={s.ctaText}>Log in</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <TouchableOpacity style={s.register} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
            <Text style={s.registerMuted}>New to OWODE?</Text>
            <Text style={s.registerBold}>Create account</Text>
          </TouchableOpacity>
          <View style={s.note}>
            <Icon name="lock" size={18} color={ds.muted} width={2} />
            <Text style={s.noteText}>OWODE will never ask for your password or PIN by phone, SMS or WhatsApp.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.bg },
  hero: { backgroundColor: ds.hero, paddingHorizontal: 24, paddingBottom: 64, alignItems: 'center' },
  logoCard: { backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  card: { marginTop: -36, marginHorizontal: 16, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, gap: 16 },
  h1: { fontSize: 24, lineHeight: 29, color: ds.ink, fontFamily: F.x },
  sub: { fontSize: 14, lineHeight: 17, color: ds.muted, fontFamily: F.r },
  eyebrow: { fontSize: 12, lineHeight: 15, color: ds.muted, fontFamily: F.b, letterSpacing: 0.6 },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: ds.border, paddingHorizontal: 16, fontSize: 17, color: ds.ink, fontFamily: F.b, backgroundColor: '#ffffff', ...tnum },
  inputOn: { borderColor: ds.navy },
  eye: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: 13, lineHeight: 16, color: ds.navy, fontFamily: F.b },
  cta: { height: 54, borderRadius: 16, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 20, color: ds.hero, fontFamily: F.x },
  bottom: { paddingHorizontal: 24, alignItems: 'center', gap: 18 },
  register: { height: 52, alignSelf: 'stretch', borderRadius: 16, borderWidth: 1, borderColor: ds.border, backgroundColor: ds.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  registerMuted: { fontSize: 15, lineHeight: 18, color: ds.muted, fontFamily: F.m },
  registerBold: { fontSize: 15, lineHeight: 18, color: ds.navy, fontFamily: F.x },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: ds.muted, fontFamily: F.r },
})
