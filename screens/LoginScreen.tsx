import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!phone || !password) { Alert.alert('Error', 'Phone and password are required'); return }
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>O</Text>
        </View>
        <Text style={styles.logo}>OWODE</Text>
        <Text style={styles.tagline}>Alajo Platform</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your account</Text>

        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput style={styles.input} placeholder="08012345678" placeholderTextColor="#888" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d47a1' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#f5a623', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 },
  logoLetter: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 6 },
  tagline: { fontSize: 14, color: '#f5a623', marginTop: 4, letterSpacing: 3 },
  form: { flex: 2, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 6 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333' },
 button: { backgroundColor: '#f5a623', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, marginTop: 8 },
buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
link: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 16 },
linkBold: { color: '#f5a623', fontWeight: 'bold' }
})