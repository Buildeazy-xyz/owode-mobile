import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image, Dimensions, Animated, FlatList, Modal
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { authAPI, kycAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import PinKeypad from '../components/PinKeypad'
import AsyncStorage from '@react-native-async-storage/async-storage'
const { width, height } = Dimensions.get('window')
const TOTAL_STEPS = 9

// ⚠️ TESTING ONLY — set back to false once Termii SMS is approved
const SKIP_OTP_FOR_TESTING = false

const COUNTRIES = [
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬', digits: 11 },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '🇬🇭', digits: 10 },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '🇰🇪', digits: 10 },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦', digits: 10 },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧', digits: 10 },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸', digits: 10 },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦', digits: 10 },
  { name: 'Tanzania', code: 'TZ', dial: '+255', flag: '🇹🇿', digits: 10 },
  { name: 'Uganda', code: 'UG', dial: '+256', flag: '🇺🇬', digits: 10 },
  { name: 'Cameroon', code: 'CM', dial: '+237', flag: '🇨🇲', digits: 9 },
]

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const progressAnim = useRef(new Animated.Value(1)).current

  // Step 1
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Step 2
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  // Step 3
  const [email, setEmail] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [phone, setPhone] = useState('')
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // Step 4
  const [otp, setOtp] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const otpInputRef = useRef<TextInput>(null)

  // Step 5
  const [idType, setIdType] = useState<'bvn' | 'nin'>('bvn')
  const [idNumber, setIdNumber] = useState('')

  // Step 6
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 9 - Face
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [faceStep, setFaceStep] = useState<'intro' | 'camera' | 'processing' | 'success'>('intro')
  const [faceInstruction, setFaceInstruction] = useState('Position your face in the oval')
  const cameraRef = useRef<any>(null)
  const isCapturing = useRef(false)

  const [registeredPhone, setRegisteredPhone] = useState('')
  const [registeredPassword, setRegisteredPassword] = useState('')

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
    if (step === 1) { navigation.navigate('Login'); return }
    animateProgress(step - 1)
  }

  // Focus OTP input when step 4 loads
  useEffect(() => {
    if (step === 4) {
      setTimeout(() => otpInputRef.current?.focus(), 500)
    }
  }, [step])

  const startResendTimer = () => {
    setResendTimer(60)
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendOTP = async () => {
  try {
    setLoading(true)
    const fullPhone = '0' + phone // add leading zero back for backend
    await authAPI.sendOTP(fullPhone, selectedCountry.dial, email.trim() || undefined)
    startResendTimer()
    Alert.alert('OTP Sent!', `A 6-digit code has been sent to ${selectedCountry.dial}${phone}`)
  } catch (error: any) {
    Alert.alert('Error', error.response?.data?.message || 'Could not send OTP')
  } finally {
    setLoading(false)
  }
}

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
      Alert.alert('Wrong OTP ❌', error.response?.data?.message || 'Invalid OTP. Try again.')
      setOtp('')
      otpInputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

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
    const fullPhone = '0' + phone

    const response = await authAPI.register({
      fullName,
      phone: fullPhone,
        email: email.trim() || undefined,
      password,
      dateOfBirth,
      country: selectedCountry.name
    })

    const { token } = response.data.data

    // ✅ Save token to AsyncStorage immediately so next steps work!
    await AsyncStorage.setItem('owode_token', token)

    setRegisteredPhone(fullPhone)
    setRegisteredPassword(password)

    // Submit BVN/NIN if provided
    if (idNumber) {
      try {
        if (idType === 'bvn') await kycAPI.submitBVN(idNumber)
        else await kycAPI.submitNIN(idNumber)
      } catch (e) {
        console.log('KYC error:', e)
      }
    }

    goNext()
  } catch (error: any) {
    Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong')
  } finally {
    setLoading(false)
  }
}

  const handleSetAppPin = async (pin: string) => {
    try {
      setLoading(true)
      await authAPI.setAppPin(pin)
      goNext()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not set App PIN')
    } finally {
      setLoading(false)
    }
  }

  const handleSetTransactionPin = async (pin: string) => {
    try {
      setLoading(true)
      await authAPI.setTransactionPin(pin)
      goNext()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not set Transaction PIN')
    } finally {
      setLoading(false)
    }
  }

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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true })
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
        'You can complete this later from your profile.',
        [{ text: 'Skip for now', onPress: finishRegistration }]
      )
    }
  }

  const finishRegistration = async () => {
    try {
      await login(phone, registeredPassword)
    } catch {
      navigation.navigate('Login')
    }
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [1, TOTAL_STEPS],
    outputRange: ['11%', '100%']
  })

  const stepTitles = [
    'YOUR NAME', 'DATE OF BIRTH', 'PHONE NUMBER', 'VERIFY PHONE',
    'IDENTITY', 'PASSWORD', 'APP PIN', 'TRANSACTION PIN', 'FACE VERIFY'
  ]

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const OVAL_WIDTH = width * 0.65
  const OVAL_HEIGHT = OVAL_WIDTH * 1.3

  const renderHeader = () => (
    <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.logoCard}>
          <Image source={require('../assets/owode-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.stepCount}>{step}/{TOTAL_STEPS}</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepTitle}>{stepTitles[step - 1]}</Text>
      </View>
    </LinearGradient>
  )

  // Step 7 & 8 — full screen PIN (no header needed)
  if (step === 7) {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
        <PinKeypad
          title="Set App Lock PIN 🔐"
          subtitle="Create a 6-digit PIN to lock your app"
          pinLength={6}
          onComplete={handleSetAppPin}
        />
        <TouchableOpacity onPress={goBack} style={styles.pinBack}>
          <Text style={styles.pinBackText}>← Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  if (step === 8) {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
        <PinKeypad
          title="Set Transaction PIN"
          subtitle="Create a 4-digit PIN for all transactions"
          pinLength={4}
          onComplete={handleSetTransactionPin}
        />
        <TouchableOpacity onPress={goBack} style={styles.pinBack}>
          <Text style={styles.pinBackText}>← Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  // Step 9 — Face Verification
  if (step === 9) {
    if (faceStep === 'camera') {
      return (
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
            <TouchableOpacity
              style={{ position: 'absolute', top: 60, right: 24 }}
              onPress={() => setFaceStep('intro')}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>✕ Cancel</Text>
            </TouchableOpacity>
          </CameraView>
        </View>
      )
    }

    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={{ flex: 1 }}>
        {faceStep === 'processing' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#f5a623" />
            <Text style={styles.faceTitle}>Verifying Identity...</Text>
            <Text style={styles.faceSubtitle}>Comparing with government records</Text>
          </View>
        ) : faceStep === 'success' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 80, marginBottom: 20 }}>✅</Text>
            <Text style={styles.faceTitle}>Identity Verified!</Text>
            <Text style={styles.faceSubtitle}>Welcome to OWODE! Your account is fully set up.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}>
            <View style={styles.faceIconCircle}>
              <Text style={styles.faceIcon}></Text>
            </View>
            <Text style={styles.faceTitle}>Face Verification</Text>
            <Text style={styles.faceSubtitle}>
              Final step! We'll verify your face against your BVN/NIN records via YouVerify
            </Text>
            <View style={styles.faceTips}>
              <Text style={styles.faceTipsTitle}>For best results:</Text>
              {['💡 Find a well-lit area', '👓 Remove glasses if possible', 'Hold phone at eye level', '😐 Keep neutral expression'].map((tip, i) => (
                <Text key={i} style={styles.faceTip}>{tip}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.faceStartBtn}
              onPress={() => {
                if (!cameraPermission?.granted) requestCameraPermission()
                isCapturing.current = false
                setFaceStep('camera')
                setTimeout(startLivenessInstructions, 1000)
              }}
            >
              <Text style={styles.faceStartBtnText}>📷 Start Face Verification</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={finishRegistration} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now — do it later from profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goBack} style={{ alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>← Back</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </LinearGradient>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}

      {/* Step 1 - Name */}
      {step === 1 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>What's your name?</Text>
          <Text style={styles.stepSubheading}>Enter your full legal name as it appears on your ID</Text>

          <Text style={styles.inputLabel}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Olusegun"
            placeholderTextColor="#aaa"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoFocus
          />

          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Olurin"
            placeholderTextColor="#aaa"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>📋 Use your legal name exactly as on your government ID</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!firstName || !lastName) && styles.buttonDisabled]}
            onPress={() => {
              if (!firstName.trim() || !lastName.trim()) {
                Alert.alert('Error', 'Please enter your first and last name')
                return
              }
              goNext()
            }}
            disabled={!firstName || !lastName}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Login</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 2 - DOB */}
      {step === 2 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Date of Birth 🎂</Text>
          <Text style={styles.stepSubheading}>You must be at least 18 years old to use OWODE</Text>

          <View style={styles.dobRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Day</Text>
              <TextInput
                style={styles.input}
                placeholder="DD"
                placeholderTextColor="#aaa"
                value={day}
                onChangeText={setDay}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Month</Text>
              <TextInput
                style={styles.input}
                placeholder="MM"
                placeholderTextColor="#aaa"
                value={month}
                onChangeText={setMonth}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.inputLabel}>Year</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY"
                placeholderTextColor="#aaa"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Your date of birth is kept private and used only for age verification</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (!day || !month || !year) && styles.buttonDisabled]}
            onPress={() => {
              if (!day || !month || !year) {
                Alert.alert('Error', 'Please enter your complete date of birth')
                return
              }
              const age = new Date().getFullYear() - parseInt(year)
              if (age < 18) {
                Alert.alert('Too Young ❌', 'You must be at least 18 years old to use OWODE')
                return
              }
              if (age > 100) {
                Alert.alert('Invalid Year', 'Please enter a valid birth year')
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

      {/* Step 3 - Phone + Country */}
      {step === 3 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Phone Number</Text>
          <Text style={styles.stepSubheading}>Select your country and enter your phone number</Text>

          <Text style={styles.inputLabel}>Country *</Text>
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryPicker(true)}
          >
            <Text style={styles.countrySelectorFlag}>{selectedCountry.flag}</Text>
            <Text style={styles.countrySelectorName}>{selectedCountry.name}</Text>
            <Text style={styles.countrySelectorDial}>{selectedCountry.dial}</Text>
            <Text style={styles.countrySelectorArrow}>▼</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Phone Number *</Text>
          <View style={styles.phoneRow}>
            <View style={styles.dialCode}>
              <Text style={styles.dialCodeText}>{selectedCountry.flag} {selectedCountry.dial}</Text>
            </View>
          <TextInput
  style={[styles.input, { flex: 1, marginBottom: 0 }]}
  placeholder={selectedCountry.code === 'NG' ? '8012345678' : '712345678'}
  placeholderTextColor="#aaa"
  value={phone}
  onChangeText={v => {
    // Remove all leading zeros automatically
    const cleaned = v.replace(/[^0-9]/g, '').replace(/^0+/, '')
    setPhone(cleaned)
  }}
  keyboardType="phone-pad"
  maxLength={selectedCountry.digits - 1}
  autoFocus
/>
          </View>
          <Text style={styles.phoneHint}>
            {selectedCountry.digits}-digit number for {selectedCountry.name}
          </Text>

          <Text style={styles.inputLabel}>Email Address (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>A 6-digit code will be sent by SMS. Add email for backup delivery.</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (phone.length < selectedCountry.digits - 1) && styles.buttonDisabled]}
            onPress={async () => {
              if (phone.length < selectedCountry.digits - 1) {
                Alert.alert('Error', `Enter a valid ${selectedCountry.digits}-digit phone number`)
                return
              }
              if (email.trim() && (!email.includes('@') || !email.includes('.'))) {
                Alert.alert('Invalid Email', 'Please enter a valid email address, or leave it blank.')
                return
              }
              await handleSendOTP()
              if (!loading) goNext()
            }}
            disabled={phone.length < selectedCountry.digits - 1 || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Send OTP →</Text>
            }
          </TouchableOpacity>

          {/* Country Picker Modal */}
          <Modal visible={showCountryPicker} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Country</Text>
                  <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.countrySearch}
                  placeholder="Search country..."
                  placeholderTextColor="#aaa"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />
                <FlatList
                  data={filteredCountries}
                  keyExtractor={item => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.countryItem, selectedCountry.code === item.code && styles.countryItemSelected]}
                      onPress={() => {
                        setSelectedCountry(item)
                        setPhone('')
                        setShowCountryPicker(false)
                        setCountrySearch('')
                      }}
                    >
                      <Text style={styles.countryItemFlag}>{item.flag}</Text>
                      <Text style={styles.countryItemName}>{item.name}</Text>
                      <Text style={styles.countryItemDial}>{item.dial}</Text>
                      {selectedCountry.code === item.code && <Text style={styles.countryItemCheck}>✅</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </ScrollView>
      )}

      {/* Step 4 - OTP */}
      {step === 4 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Verify Phone 🔐</Text>
          <Text style={styles.stepSubheading}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={{ color: '#0d47a1', fontWeight: 'bold' }}>
              {selectedCountry.dial} {phone}
            </Text>
          </Text>

          {/* OTP Boxes - tap to focus */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => otpInputRef.current?.focus()}
          >
            <View style={styles.otpContainer}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View key={i} style={[
                  styles.otpBox,
                  otp.length === i && styles.otpBoxActive,
                  otp.length > i && styles.otpBoxFilled
                ]}>
                  <Text style={styles.otpText}>{otp[i] || ''}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Hidden real input */}
          <TextInput
            ref={otpInputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={v => setOtp(v.replace(/[^0-9]/g, '').substring(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            caretHidden
          />

          <TouchableOpacity
            style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={otp.length !== 6 || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Verify OTP</Text>
            }
          </TouchableOpacity>

          {SKIP_OTP_FOR_TESTING && (
            <TouchableOpacity
              style={{ marginTop: 14, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => goNext()}
            >
              <Text style={{ color: '#f5a623', fontWeight: '700', fontSize: 15 }}>
                Skip verification (testing) →
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={resendTimer > 0 || loading}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
              {resendTimer > 0 ? `⏱ Resend in ${resendTimer}s` : '🔄 Resend OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>💡 Tap the boxes above to bring up your keyboard</Text>
          </View>
        </ScrollView>
      )}

      {/* Step 5 - BVN/NIN */}
      {step === 5 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Identity Verification 🪪</Text>
          <Text style={styles.stepSubheading}>Verify your identity with your BVN or NIN for security</Text>

          <View style={styles.idTypeRow}>
            {(['bvn', 'nin'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.idTypeBtn, idType === type && styles.idTypeBtnActive]}
                onPress={() => { setIdType(type); setIdNumber('') }}
              >
                <Text style={styles.idTypeIcon}>{type === 'bvn' ? '' : '🪪'}</Text>
                <Text style={[styles.idTypeBtnText, idType === type && styles.idTypeBtnTextActive]}>
                  {type.toUpperCase()}
                </Text>
                <Text style={[styles.idTypeDesc, idType === type && { color: '#0d47a1' }]}>
                  {type === 'bvn' ? 'Bank Verification' : 'National ID'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>
            {idType === 'bvn' ? 'Bank Verification Number (BVN)' : 'National Identification Number (NIN)'} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter your 11-digit ${idType.toUpperCase()}`}
            placeholderTextColor="#aaa"
            value={idNumber}
            onChangeText={setIdNumber}
            keyboardType="numeric"
            maxLength={11}
            autoFocus
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Your {idType.toUpperCase()} is encrypted with bank-grade security and used only for identity verification via YouVerify
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
            <Text style={styles.skipText}>Skip for now — verify later</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 6 - Password */}
      {step === 6 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Set Password 🔑</Text>
          <Text style={styles.stepSubheading}>Create a strong password to protect your account</Text>

          <Text style={styles.inputLabel}>Password *</Text>
          <Text style={styles.inputHint}>At least 6 characters with letters and numbers</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="e.g. owode123"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoFocus
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
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          {password && confirmPassword && (
            <View style={password === confirmPassword ? styles.successCard : styles.errorCard}>
              <Text style={password === confirmPassword ? styles.successText : styles.errorText}>
                {password === confirmPassword ? '✅ Passwords match!' : '❌ Passwords do not match'}
              </Text>
            </View>
          )}

          {/* Password strength */}
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <Text style={styles.strengthLabel}>Password strength:</Text>
              <View style={styles.strengthBar}>
                <View style={[
                  styles.strengthFill,
                  {
                    width: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                      ? '100%' : password.length >= 6 && /[0-9]/.test(password)
                      ? '60%' : '30%',
                    backgroundColor: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                      ? '#22c55e' : password.length >= 6 && /[0-9]/.test(password)
                      ? '#f5a623' : '#ef4444'
                  }
                ]} />
              </View>
              <Text style={styles.strengthText}>
                {password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                  ? 'Strong' : password.length >= 6 && /[0-9]/.test(password)
                  ? '👍 Good' : '⚠️ Weak'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!password || !confirmPassword) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!password || !confirmPassword || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: { paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 4 },
  backBtnText: { color: '#f5a623', fontSize: 15, fontWeight: '600' },
  logoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 6, alignItems: 'center' },
  logoImage: { width: width * 0.32, height: 32 },
  stepCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  progressContainer: { gap: 6 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: '#f5a623', borderRadius: 3 },
  stepTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  form: { flex: 1, backgroundColor: '#fff' },
  formContent: { padding: 24, paddingBottom: 40, flexGrow: 1 },
  stepHeading: { fontSize: 26, fontWeight: 'bold', color: '#0d47a1', marginBottom: 8, marginTop: 4 },
  stepSubheading: { fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 22 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#0d47a1', marginBottom: 6 },
  inputHint: { fontSize: 11, color: '#888', marginBottom: 8 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: '#333', borderWidth: 1, borderColor: '#eee' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#333' },
  eyeBtn: { padding: 16 },
  eyeIcon: { fontSize: 18 },
  button: { backgroundColor: '#0d47a1', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 16, shadowColor: '#0d47a1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { backgroundColor: '#ccc', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dobRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countrySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#eee', gap: 8 },
  countrySelectorFlag: { fontSize: 22 },
  countrySelectorName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '600' },
  countrySelectorDial: { fontSize: 14, color: '#0d47a1', fontWeight: '700' },
  countrySelectorArrow: { fontSize: 12, color: '#888' },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  dialCode: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#bbdefb' },
  dialCodeText: { fontSize: 14, color: '#0d47a1', fontWeight: '700' },
  phoneHint: { fontSize: 11, color: '#888', marginBottom: 16 },
  infoCard: { backgroundColor: '#e3f2fd', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#bbdefb' },
  infoText: { fontSize: 13, color: '#0d47a1', lineHeight: 20 },
  errorCard: { backgroundColor: '#ffebee', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ffcdd2' },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  successCard: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#c8e6c9' },
  successText: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  strengthLabel: { fontSize: 12, color: '#888' },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#eee', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: '600' },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 28 },
  otpBox: { width: 50, height: 60, borderRadius: 14, backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  otpBoxActive: { borderColor: '#0d47a1', borderWidth: 2.5, backgroundColor: '#e3f2fd' },
  otpBoxFilled: { borderColor: '#0d47a1', backgroundColor: '#e3f2fd' },
  otpText: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  resendBtn: { alignItems: 'center', marginTop: 4, marginBottom: 16, padding: 8 },
  resendText: { color: '#0d47a1', fontSize: 14, fontWeight: '600' },
  resendTextDisabled: { color: '#aaa' },
  idTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  idTypeBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', gap: 4 },
  idTypeBtnActive: { backgroundColor: '#e3f2fd', borderColor: '#0d47a1' },
  idTypeIcon: { fontSize: 28 },
  idTypeBtnText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
  idTypeBtnTextActive: { color: '#0d47a1' },
  idTypeDesc: { fontSize: 11, color: '#aaa', textAlign: 'center' },
  skipBtn: { alignItems: 'center', marginTop: 4, padding: 12 },
  skipText: { color: '#888', fontSize: 13 },
  loginLink: { alignItems: 'center', marginTop: 8 },
  loginLinkText: { color: '#888', fontSize: 14 },
  loginLinkBold: { color: '#f5a623', fontWeight: 'bold' },
  pinBack: { position: 'absolute', top: 60, left: 24 },
  pinBackText: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.7, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
  modalClose: { fontSize: 20, color: '#888', padding: 4 },
  countrySearch: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
  countryItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4, gap: 10 },
  countryItemSelected: { backgroundColor: '#e3f2fd' },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  countryItemDial: { fontSize: 14, color: '#0d47a1', fontWeight: '700' },
  countryItemCheck: { fontSize: 16 },
  faceIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,166,35,0.2)', borderWidth: 3, borderColor: '#f5a623', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  faceIcon: { fontSize: 56 },
  faceTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  faceSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  faceTips: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 28 },
  faceTipsTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 },
  faceTip: { color: '#fff', fontSize: 13, marginBottom: 6 },
  faceStartBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  faceStartBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})