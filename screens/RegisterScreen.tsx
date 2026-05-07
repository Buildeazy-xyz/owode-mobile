import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !phone || !password) {
      Alert.alert('Error', 'Full name, phone and password are required')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/
    if (!passwordRegex.test(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters with letters and numbers')
      return
    }
    try {
      setLoading(true)
      await register({ fullName, phone, email, password })
      // Navigate to Set App PIN after registration
      navigation.navigate('SetAppPin', { fromRegister: true })
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong')
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
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>O</Text>
        </View>
        <Text style={styles.logo}>OWODE</Text>
        <Text style={styles.tagline}>Alajo Platform</Text>
      </LinearGradient>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join millions saving with OWODE 🇳🇬</Text>

        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          placeholderTextColor="#888"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="08012345678"
          placeholderTextColor="#888"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />

        <Text style={styles.inputLabel}>Email (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="john@email.com"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Password *</Text>
        <Text style={styles.inputHint}>At least 6 characters with letters and numbers</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="e.g. owode123"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Confirm Password *</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Repeat password"
            placeholderTextColor="#888"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Text style={styles.securityInfoTitle}>🔐 After registration you will:</Text>
          <Text style={styles.securityInfoItem}>1. Set a 6-digit App Lock PIN</Text>
          <Text style={styles.securityInfoItem}>2. Set a 4-digit Transaction PIN</Text>
          <Text style={styles.securityInfoItem}>3. Login to your account</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Create Account →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Login</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d47a1' },
  header: { paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  logoCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#f5a623', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  logoLetter: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 6 },
  tagline: { fontSize: 13, color: '#f5a623', marginTop: 4, letterSpacing: 3 },
  form: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 6 },
  inputHint: { fontSize: 11, color: '#888', marginBottom: 6 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#333' },
  eyeBtn: { padding: 16 },
  eyeIcon: { fontSize: 18 },
  securityInfo: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 16, marginBottom: 20 },
  securityInfoTitle: { fontSize: 13, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8 },
  securityInfoItem: { fontSize: 12, color: '#0d47a1', marginBottom: 4 },
  button: { backgroundColor: '#0d47a1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 40 },
  linkBold: { color: '#f5a623', fontWeight: 'bold' }
})