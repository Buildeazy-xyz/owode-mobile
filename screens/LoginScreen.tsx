import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!phone || !pin) {
      Alert.alert('Error', 'Please enter your phone number and PIN')
      return
    }
    try {
      setLoading(true)
      await login(phone, pin)
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.logo}>OWODE</Text>
        <Text style={styles.tagline}>Alajo Platform</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#888"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />

        <TextInput
          style={styles.input}
          placeholder="4-digit PIN"
          placeholderTextColor="#888"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          maxLength={4}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 48, fontWeight: 'bold', color: '#f5a623' },
  tagline: { fontSize: 16, color: '#888', marginTop: 4 },
  form: { flex: 2, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333' },
  button: { backgroundColor: '#f5a623', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', color: '#888', fontSize: 14 },
  linkBold: { color: '#f5a623', fontWeight: 'bold' }
})