import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image, Dimensions, Animated
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { authAPI, kycAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import PinKeypad from '../components/PinKeypad'

const { width } = Dimensions.get('window')
const TOTAL_STEPS = 9

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const progressAnim = useRef(new Animated.Value(1)).current

  // Step 1 - Name
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Step 2 - Date of Birth
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  // Step 3 - Phone
  const [phone, setPhone] = useState('')

  // Step 4 - OTP
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Step 5 - BVN/NIN
  const [idType, setIdType] = useState<'bvn' | 'nin'>('bvn')
  const [idNumber, setIdNumber] = useState('')

  // Step 6 - Password
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 7 - App PIN
  const [appPin, setAppPin] = useState('')

  // Step 8 - Transaction PIN
  const [transactionPin, setTransactionPin] = useState('')

  // Step 9 - Face Verification
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [faceStep, setFaceStep] = useState<'intro' | 'camera' | 'processing' | 'success'>('intro')
  const [faceInstruction, setFaceInstruction] = useState('Position your face in the oval')
  const cameraRef = useRef<any>(null)
  const isCapturing = useRef(false)

  // Registered user token (after step 6)
  const [registeredToken, setRegisteredToken] = useState('')
  const [registeredUserId, setRegisteredUserId] = useState('')

  const animateProgress = (nextStep: number) => {
    Animated.timing(progressAnim, {
      toValue: nextStep,
      duration: 300,
      useNativeDriver: false
    }).start()
    setStep(nextStep)
  }

  const goNext = () => animateProgress(step + 1)
  const goBack = () => {
    if (step === 1) {
      navigation.navigate('Login')
      return
    }
    animateProgress(step - 1)
  }

  // Send OTP
  const handleSendOTP = async () => {
    try {
      setLoading(true)
      await authAPI.sendOTP(phone)
      setOtpSent(true)
      setResendTimer(60)
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) { clearInterval(interval); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit OTP sent to your phone')
      return
    }
    try {
      setLoading(true)
      await authAPI.verifyOTP(phone, otp)
      goNext()
    } catch (error: any) {
      Alert.alert('Wrong OTP', error.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  // Register user after password step
  const handleRegister = async () => {
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
      const fullName = `${firstName} ${lastName}`
      const dateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      const response = await authAPI.register({ fullName, phone, password, dateOfBirth })
      const { token, user } = response.data.data
      setRegisteredToken(token)
      setRegisteredUserId(user.id)

      // Submit BVN/NIN
      if (idNumber) {
        try {
          if (idType === 'bvn') await kycAPI.submitBVN(idNumber)
          else await kycAPI.submitNIN(idNumber)
        } catch (e) {
          console.log('KYC submit error:', e)
        }
      }

      goNext()
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Set App PIN
  const handleSetAppPin = async (pin: string) => {
    try {
      setLoading(true)
      await authAPI.setAppPin(pin)
      setAppPin(pin)
      goNext()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not set App PIN')
    } finally {
      setLoading(false)
    }
  }

  // Set Transaction PIN
  const handleSetTransactionPin = async (pin: string) => {
    try {
      setLoading(true)
      await authAPI.setTransactionPin(pin)
      setTransactionPin(pin)
      goNext()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not set Transaction PIN')
    } finally {
      setLoading(false)
    }
  }

  // Face Verification
  const startLivenessInstructions = () => {
    const instructions = [
      'Look straight at the camera',
      'Slowly turn your head left',
      'Now turn your head right',
      'Look straight again',
      'Smile naturally',
      'Hold still...'
    ]
    let i = 0
    const interval = setInterval(() => {
      if (i < instructions.length) {
        setFaceInstruction(instructions[i])
        i++
      } else {
        clearInterval(interval)
        if (!isCapturing.current) {
          isCapturing.current = true
          captureAndVerify()
        }
      }
    }, 1500)
  }

  const captureAndVerify = async () => {
    if (!cameraRef.current) return
    try {
      setFaceStep('processing')
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true
      })
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )
      await kycAPI.submitFace(`data:image/jpeg;base64,${compressed.base64}`)
      setFaceStep('success')
      setTimeout(() => finishRegistration(), 2000)
    } catch (error: any) {
      Alert.alert(
        'Face Verification Failed',
        'Could not verify your face. You can complete this later from your profile.',
        [{ text: 'Skip for now', onPress: finishRegistration }]
      )
    }
  }

  const finishRegistration = async () => {
    try {
      await login(phone, password)
    } catch (error) {
      navigation.navigate('Login')
    }
  }

  // Progress bar width
  const progressWidth = progressAnim.interpolate({
    inputRange: [1, TOTAL_STEPS],
    outputRange: ['11%', '100%']
  })

  const stepTitles = [
    'Your Name',
    'Date of Birth',
    'Phone Number',
    'Verify Phone',
    'Identity Verification',
    'Set Password',
    'App Lock PIN',
    'Transaction PIN',
    'Face Verification'
  ]

  const OVAL_WIDTH = width * 0.65
  const OVAL_HEIGHT = OVAL_WIDTH * 1.3

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoCard}>
            <Image
              source={require('../assets/owode-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.stepCount}>{step}/{TOTAL_STEPS}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.stepTitle}>{stepTitles[step - 1]}</Text>
        </View>
      </LinearGradient>

      {/* Step 1 - Name */}
      {step === 1 && (
        <ScrollView style={styles.form}>
          <Text style={styles.stepHeading}>What's your name? 👋</Text>
          <Text style={styles.stepSubheading}>Enter your full legal name as it appears on your ID</Text>

          <Text style={styles.inputLabel}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Olusegun"
            placeholderTextColor="#888"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Olurin"
            placeholderTextColor="#888"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, (!firstName || !lastName) && styles.buttonDisabled]}
            onPress={() => {
              if (!firstName || !lastName) {
                Alert.alert('Error', 'Please enter your first and last name')
                return
              }
              goNext()
            }}
            disabled={!firstName || !lastName}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 2 - Date of Birth */}
      {step === 2 && (
        <ScrollView style={styles.form}>
          <Text style={styles.stepHeading}>Date of Birth 🎂</Text>
          <Text style={styles.stepSubheading}>You must be at least 18 years old to use OWODE</Text>

          <View style={styles.dobRow}>
            <View style={styles.dobField}>
              <Text style={styles.inputLabel}>Day</Text>
              <TextInput
                style={styles.input}
                placeholder="DD"
                placeholderTextColor="#888"
                value={day}
                onChangeText={setDay}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.dobField}>
              <Text style={styles.inputLabel}>Month</Text>
              <TextInput
                style={styles.input}
                placeholder="MM"
                placeholderTextColor="#888"
                value={month}
                onChangeText={setMonth}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={[styles.dobField, { flex: 1.5 }]}>
              <Text style={styles.inputLabel}>Year</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY"
                placeholderTextColor="#888"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              📋 Your date of birth is used for identity verification and is kept private
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!day || !month || !year) && styles.buttonDisabled]}
            onPress={() => {
              if (!day || !month || !year) {
                Alert.alert('Error', 'Please enter your date of birth')
                return
              }
              const age = new Date().getFullYear() - parseInt(year)
              if (age < 18) {
                Alert.alert('Too Young', 'You must be at least 18 years old to use OWODE')
                return
              }
              goNext()
            }}
            disabled={!day || !month || !year}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 3 - Phone */}
      {step === 3 && (
        <ScrollView style={styles.form}>
          <Text style={styles.stepHeading}>Phone Number 📱</Text>
          <Text style={styles.stepSubheading}>Enter your Nigerian phone number — we'll send you a verification code</Text>

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇳🇬 +234</Text>
            </View>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="08012345678"
              placeholderTextColor="#888"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              📨 A 6-digit OTP will be sent to this number via SMS
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, phone.length !== 11 && styles.buttonDisabled]}
            onPress={async () => {
              if (phone.length !== 11) {
                Alert.alert('Error', 'Enter a valid 11-digit phone number')
                return
              }
              await handleSendOTP()
              goNext()
            }}
            disabled={phone.length !== 11 || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Send OTP →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 4 - OTP */}
      {step === 4 && (
        <ScrollView style={styles.form}>
          <Text style={styles.stepHeading}>Verify Phone 🔐</Text>
          <Text style={styles.stepSubheading}>Enter the 6-digit code sent to {phone}</Text>

          <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled]}>
                <Text style={styles.otpText}>{otp[i] || ''}</Text>
              </View>
            ))}
          </View>

          <TextInput
            style={styles.hiddenInput}
            value={otp}
            onChangeText={v => setOtp(v.replace(/[^0-9]/g, '').substring(0, 6))}
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={otp.length !== 6 || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Verify OTP →</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={resendTimer > 0 || loading}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : '🔄 Resend OTP'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 5 - BVN/NIN */}
      {step === 5 && (
        <ScrollView style={styles.form}>
          <Text style={styles.stepHeading}>Identity Verification 🪪</Text>
          <Text style={styles.stepSubheading}>Verify your identity with your BVN or NIN</Text>

          <View style={styles.idTypeRow}>
            {(['bvn', 'nin'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.idTypeBtn, idType === type && styles.idTypeBtnActive]}
                onPress={() => { setIdType(type); setIdNumber('') }}
              >
                <Text style={[styles.idTypeBtnText, idType === type && styles.idTypeBtnTextActive]}>
                  {type === 'bvn' ? '🏦 BVN' : '🪪 NIN'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>
            {idType === 'bvn' ? 'Bank Verification Number (BVN)' : 'National Identification Number (NIN)'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={idType === 'bvn' ? 'Enter your 11-digit BVN' : 'Enter your 11-digit NIN'}
            placeholderTextColor="#888"
            value={idNumber}
            onChangeText={setIdNumber}
            keyboardType="numeric"
            maxLength={11}
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              🔒 Your {idType.toUpperCase()} is encrypted and used only for identity verification
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, idNumber.length !== 11 && styles.buttonDisabled]}
            onPress={() => {
              if (idNumber.length !== 11) {
                Alert.alert('Error', `Enter a valid 11-digit ${idType.toUpperCase()}`)
                return
              }
              goNext()
            }}
            disabled={idNumber.length !== 11}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goNext} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 6 - Password */}
      {step === 6 && (
        <ScrollView style={styles.form}>
          <Text style={styles.stepHeading}>Set Password 🔑</Text>
          <Text style={styles.stepSubheading}>Create a strong password for your account</Text>

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
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repeat your password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          {password && confirmPassword && password !== confirmPassword && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>❌ Passwords do not match</Text>
            </View>
          )}

          {password && confirmPassword && password === confirmPassword && (
            <View style={styles.successCard}>
              <Text style={styles.successText}>✅ Passwords match!</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!password || !confirmPassword) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!password || !confirmPassword || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account →</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 7 - App PIN */}
      {step === 7 && (
        <View style={{ flex: 1 }}>
          <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
            <PinKeypad
              title="Set App Lock PIN"
              subtitle="Create a 6-digit PIN to lock your app"
              pinLength={6}
              onComplete={handleSetAppPin}
            />
          </LinearGradient>
        </View>
      )}

      {/* Step 8 - Transaction PIN */}
      {step === 8 && (
        <View style={{ flex: 1 }}>
          <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
            <PinKeypad
              title="Set Transaction PIN"
              subtitle="Create a 4-digit PIN for all transactions"
              pinLength={4}
              onComplete={handleSetTransactionPin}
            />
          </LinearGradient>
        </View>
      )}

      {/* Step 9 - Face Verification */}
      {step === 9 && (
        <View style={{ flex: 1 }}>
          {faceStep === 'intro' && (
            <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.faceIntro}>
              <View style={styles.faceIconCircle}>
                <Text style={styles.faceIcon}>😊</Text>
              </View>
              <Text style={styles.faceTitle}>Face Verification</Text>
              <Text style={styles.faceSubtitle}>
                Final step! We'll verify your face against your BVN/NIN records
              </Text>
              <View style={styles.faceTips}>
                <Text style={styles.faceTipsTitle}>For best results:</Text>
                {['💡 Find a well-lit area', '👓 Remove glasses if possible', '📱 Hold phone at eye level', '😐 Keep a neutral expression'].map((tip, i) => (
                  <Text key={i} style={styles.faceTip}>{tip}</Text>
                ))}
              </View>
              <TouchableOpacity
                style={styles.faceStartBtn}
                onPress={() => {
                  if (!cameraPermission?.granted) {
                    requestCameraPermission()
                  }
                  setFaceStep('camera')
                  isCapturing.current = false
                  setTimeout(startLivenessInstructions, 1000)
                }}
              >
                <Text style={styles.faceStartBtnText}>📷 Start Face Verification</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={finishRegistration} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip for now — do it later</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}

          {faceStep === 'camera' && (
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
                <View style={StyleSheet.absoluteFillObject}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                  <View style={{ flexDirection: 'row', height: OVAL_HEIGHT }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                    <View style={{ width: OVAL_WIDTH, height: OVAL_HEIGHT, borderRadius: OVAL_WIDTH / 2, borderWidth: 3, borderColor: '#f5a623' }} />
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                </View>
                <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, textAlign: 'center' }}>
                    {faceInstruction}
                  </Text>
                </View>
              </CameraView>
            </View>
          )}

          {faceStep === 'processing' && (
            <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.faceIntro}>
              <ActivityIndicator size="large" color="#f5a623" />
              <Text style={styles.faceTitle}>Verifying Identity</Text>
              <Text style={styles.faceSubtitle}>Comparing your face with government records...</Text>
            </LinearGradient>
          )}

          {faceStep === 'success' && (
            <LinearGradient colors={['#0a0a2e', '#22c55e', '#16a34a']} style={styles.faceIntro}>
              <Text style={{ fontSize: 80, marginBottom: 20 }}>✅</Text>
              <Text style={styles.faceTitle}>Identity Verified!</Text>
              <Text style={styles.faceSubtitle}>Welcome to OWODE! Your account is fully verified.</Text>
            </LinearGradient>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  logoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 8, alignItems: 'center' },
  logoImage: { width: width * 0.35, height: 35 },
  stepCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  progressContainer: { gap: 8 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#f5a623', borderRadius: 3 },
  stepTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  form: { flex: 1, backgroundColor: '#fff', padding: 24 },
  stepHeading: { fontSize: 26, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8, marginTop: 8 },
  stepSubheading: { fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 22 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 6 },
  inputHint: { fontSize: 11, color: '#888', marginBottom: 8 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#333' },
  eyeBtn: { padding: 16 },
  eyeIcon: { fontSize: 18 },
  button: { backgroundColor: '#0d47a1', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dobRow: { flexDirection: 'row', gap: 12 },
  dobField: { flex: 1 },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 16 },
  countryCode: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, justifyContent: 'center' },
  countryCodeText: { fontSize: 14, color: '#333', fontWeight: '600' },
  infoCard: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 13, color: '#0d47a1', lineHeight: 20 },
  errorCard: { backgroundColor: '#ffebee', borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#ef4444' },
  successCard: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, marginBottom: 16 },
  successText: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 24 },
  otpBox: { width: 48, height: 56, borderRadius: 12, backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  otpBoxFilled: { borderColor: '#0d47a1', backgroundColor: '#e3f2fd' },
  otpText: { fontSize: 22, fontWeight: 'bold', color: '#0d47a1' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
  resendBtn: { alignItems: 'center', marginTop: 8 },
  resendText: { color: '#0d47a1', fontSize: 14, fontWeight: '600' },
  resendTextDisabled: { color: '#888' },
  idTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  idTypeBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  idTypeBtnActive: { backgroundColor: '#e3f2fd', borderColor: '#0d47a1' },
  idTypeBtnText: { fontSize: 15, fontWeight: '600', color: '#888' },
  idTypeBtnTextActive: { color: '#0d47a1' },
  skipBtn: { alignItems: 'center', marginTop: 8, padding: 12 },
  skipText: { color: '#888', fontSize: 14 },
  faceIntro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  faceIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,166,35,0.2)', borderWidth: 3, borderColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  faceIcon: { fontSize: 56 },
  faceTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  faceSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  faceTips: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 28 },
  faceTipsTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 },
  faceTip: { color: '#fff', fontSize: 13, marginBottom: 6 },
  faceStartBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  faceStartBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})