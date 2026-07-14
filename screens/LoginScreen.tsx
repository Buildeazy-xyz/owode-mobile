import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'

const { width } = Dimensions.get('window')

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        {/* Logo Card */}
        <View style={styles.logoCard}>
          <Image
            source={require('../assets/owode-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.tagline}>ALÀJÒ-ÀGBÁYÉ: THE GLOBAL THRIFT COLLECTOR</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your OWODE account</Text>

        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="08012345678"
          placeholderTextColor="#888"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityBadges}>
          <View style={styles.badge}><Text style={styles.badgeText}>Encrypted</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>🛡️ Secure</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>Bank-grade</Text></View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login →</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>
            Don't have an account? <Text style={styles.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d47a1' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  logoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: width * 0.72,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 12
  },
  logoImage: { width: width * 0.60, height: 70 },
  tagline: { fontSize: 9, color: '#f5a623', letterSpacing: 1, textAlign: 'center', paddingHorizontal: 20 },
  form: { flex: 2, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 6 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#333' },
  eyeBtn: { padding: 16 },
  eyeIcon: { fontSize: 18 },
  securityBadges: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: { backgroundColor: '#e3f2fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, color: '#0d47a1', fontWeight: '600' },
  button: { backgroundColor: '#f5a623', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },
  linkBold: { color: '#f5a623', fontWeight: 'bold' }
})