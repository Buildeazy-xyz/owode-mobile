import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
   Alert, KeyboardAvoidingView, Platform,
  ScrollView, Image, Dimensions, Animated, FlatList, Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { authAPI, kycAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import PinKeypad from '../components/PinKeypad'
import AsyncStorage from '@react-native-async-storage/async-storage'
const { width, height } = Dimensions.get('window')
const TOTAL_STEPS = 7

// ⚠️ TESTING ONLY — set back to false once Termii SMS is approved
const SKIP_OTP_FOR_TESTING = false

import { COUNTRIES } from '../utils/countries'
import OwodeLoader from '../components/OwodeLoader'
import Icon from '../components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F, ds } from '../constants/theme'

export default function RegisterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
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
      Alert.alert('Wrong OTP', error.response?.data?.message || 'Invalid OTP. Try again.')
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
      Alert.alert('Account Ready', 'Your account is set up. You can verify your face later from Profile.',
        [{ text: 'Login Now', onPress: () => navigation.navigate('Login') }])
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

  // OWODE Alajo Redesign "Create account" board header
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityLabel="Back">
          <Icon name="back" size={20} color={ds.ink} width={2} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>Create account</Text>
        <Text style={styles.stepCount}>{step} of {TOTAL_STEPS}</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressBg, { flex: 1 }, i < step && { backgroundColor: ds.navy }]} />
          ))}
        </View>
        <Text style={styles.stepTitle}>STEP {step} OF {TOTAL_STEPS} · {stepTitles[step - 1]}</Text>
      </View>
    </View>
  )

  // Step 7 — Transaction PIN (App Lock removed from registration)
  if (step === 7) {
    return (
      <View style={{ flex: 1, backgroundColor: ds.hero }}>
        <PinKeypad
          title="Set Transaction PIN"
          subtitle="Create a 4-digit PIN for all transactions"
          pinLength={4}
          onComplete={handleSetTransactionPin}
        />
        <TouchableOpacity onPress={goBack} style={[styles.pinBack, { top: insets.top + 18 }]} accessibilityLabel="Back">
          <Icon name="back" size={20} color="#ffffff" width={2} />
        </TouchableOpacity>
      </View>
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
            placeholderTextColor="#9aa5b8"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoFocus
          />

          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Olurin"
            placeholderTextColor="#9aa5b8"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Use your legal name exactly as on your government ID</Text>
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
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Login</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 2 - DOB */}
      {step === 2 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Date of Birth</Text>
          <Text style={styles.stepSubheading}>You must be at least 18 years old to use OWODE</Text>

          <View style={styles.dobRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Day</Text>
              <TextInput
                style={styles.input}
                placeholder="DD"
                placeholderTextColor="#9aa5b8"
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
                placeholderTextColor="#9aa5b8"
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
                placeholderTextColor="#9aa5b8"
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
                Alert.alert('Too Young', 'You must be at least 18 years old to use OWODE')
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
            <Text style={styles.buttonText}>Continue</Text>
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
  placeholderTextColor="#9aa5b8"
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
            placeholderTextColor="#9aa5b8"
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
              ? <OwodeLoader color="#fff" />
              : <Text style={styles.buttonText}>Send OTP</Text>
            }
          </TouchableOpacity>

          {/* Country Picker Modal */}
          <Modal visible={showCountryPicker} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Country</Text>
                  <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                    <Ionicons name="close" size={22} color="#7c8aa5" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.countrySearch}
                  placeholder="Search country..."
                  placeholderTextColor="#9aa5b8"
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
                      {selectedCountry.code === item.code && <Ionicons name="checkmark" size={16} color="#22c55e" />}
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
          <Text style={styles.stepHeading}>Verify Phone</Text>
          <Text style={styles.stepSubheading}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={{ color: '#25427a', fontWeight: 'bold' }}>
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
              ? <OwodeLoader color="#fff" />
              : <Text style={styles.buttonText}>Verify OTP</Text>
            }
          </TouchableOpacity>

          {SKIP_OTP_FOR_TESTING && (
            <TouchableOpacity
              style={{ marginTop: 14, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => goNext()}
            >
              <Text style={{ color: '#f5a623', fontWeight: '700', fontSize: 15 }}>
                Skip verification (testing)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={resendTimer > 0 || loading}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
              {resendTimer > 0 ? `⏱ Resend in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Tap the boxes above to bring up your keyboard</Text>
          </View>
        </ScrollView>
      )}

      {/* Step 5 - BVN/NIN */}
      {step === 5 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Identity Verification</Text>
          <Text style={styles.stepSubheading}>Verify your identity with your BVN or NIN for security</Text>

          <View style={styles.idTypeRow}>
            {(['bvn', 'nin'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.idTypeBtn, idType === type && styles.idTypeBtnActive]}
                onPress={() => { setIdType(type); setIdNumber('') }}
              >
                {type === 'bvn' ? null : <Ionicons name="card-outline" size={28} color="#25427a" />}
                <Text style={[styles.idTypeBtnText, idType === type && styles.idTypeBtnTextActive]}>
                  {type.toUpperCase()}
                </Text>
                <Text style={[styles.idTypeDesc, idType === type && { color: '#25427a' }]}>
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
            placeholderTextColor="#9aa5b8"
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
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goNext} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now — verify later</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 6 - Password */}
      {step === 6 && (
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <Text style={styles.stepHeading}>Set Password</Text>
          <Text style={styles.stepSubheading}>Create a strong password to protect your account</Text>

          <Text style={styles.inputLabel}>Password *</Text>
          <Text style={styles.inputHint}>At least 6 characters with letters and numbers</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="e.g. owode123"
              placeholderTextColor="#9aa5b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoFocus
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#7c8aa5" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repeat your password"
              placeholderTextColor="#9aa5b8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={18} color="#7c8aa5" />
            </TouchableOpacity>
          </View>

          {password && confirmPassword && (
            <View style={password === confirmPassword ? styles.successCard : styles.errorCard}>
              <Text style={password === confirmPassword ? styles.successText : styles.errorText}>
                {password === confirmPassword ? 'Passwords match!' : 'Passwords do not match'}
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
                  ? 'Good' : 'Weak'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!password || !confirmPassword) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!password || !confirmPassword || loading}
          >
            {loading
              ? <OwodeLoader color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  headTitle: { flex: 1, fontSize: 20, lineHeight: 24, color: ds.ink, fontFamily: F.x },
  header: { backgroundColor: ds.bg, paddingBottom: 12, paddingHorizontal: 20, gap: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ds.card, borderWidth: 1, borderColor: ds.border, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#f5a623', fontSize: 15, fontWeight: '600' },
  logoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 6, alignItems: 'center' },
  logoImage: { width: width * 0.32, height: 32 },
  stepCount: { color: ds.muted, fontSize: 13, lineHeight: 16, fontFamily: F.b },
  progressContainer: { gap: 10 },
  progressBg: { height: 4, backgroundColor: '#dbe2ee', borderRadius: 2 },
  progressFill: { height: 5, backgroundColor: '#f5a623', borderRadius: 3 },
  stepTitle: { color: ds.muted, fontSize: 12, lineHeight: 15, fontFamily: F.b, letterSpacing: 0.6 },
  form: { flex: 1, backgroundColor: ds.bg },
  formContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },
  stepHeading: { fontSize: 24, lineHeight: 29, fontFamily: F.x, color: ds.ink, marginBottom: 6 },
  stepSubheading: { fontSize: 14, lineHeight: 21, fontFamily: F.r, color: ds.muted, marginBottom: 22 },
  inputLabel: { fontSize: 12, lineHeight: 15, fontFamily: F.b, color: ds.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  inputHint: { fontSize: 12, lineHeight: 16, fontFamily: F.r, color: ds.muted, marginBottom: 8 },
  input: { backgroundColor: '#ffffff', borderRadius: 14, height: 52, paddingHorizontal: 16, fontSize: 16, fontFamily: F.b, marginBottom: 16, color: ds.ink, borderWidth: 1.5, borderColor: ds.border },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, height: 52, marginBottom: 16, borderWidth: 1.5, borderColor: ds.border },
  passwordInput: { flex: 1, paddingHorizontal: 16, fontSize: 16, fontFamily: F.b, color: ds.ink },
  eyeBtn: { padding: 16 },
  eyeIcon: { fontSize: 18 },
  button: { backgroundColor: ds.gold, borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  buttonDisabled: { backgroundColor: ds.gold, opacity: 0.45 },
  buttonText: { color: ds.hero, fontSize: 16, lineHeight: 20, fontFamily: F.x },
  dobRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countrySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, height: 52, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1.5, borderColor: ds.border, gap: 8 },
  countrySelectorFlag: { fontSize: 22 },
  countrySelectorName: { flex: 1, fontSize: 15, color: ds.ink, fontFamily: F.b },
  countrySelectorDial: { fontSize: 14, color: ds.navy, fontFamily: F.x },
  countrySelectorArrow: { fontSize: 12, color: '#7c8aa5' },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  dialCode: { backgroundColor: ds.blueSoft, borderRadius: 14, height: 52, paddingHorizontal: 14, justifyContent: 'center' },
  dialCodeText: { fontSize: 15, color: ds.navy, fontFamily: F.x },
  phoneHint: { fontSize: 12, lineHeight: 16, color: ds.muted, fontFamily: F.r, marginBottom: 16 },
  infoCard: { backgroundColor: ds.blueSoft, borderRadius: 14, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 13, color: ds.inkSoft, lineHeight: 19, fontFamily: F.r },
  errorCard: { backgroundColor: ds.dangerSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  errorText: { fontSize: 13, lineHeight: 18, color: ds.danger, fontFamily: F.b },
  successCard: { backgroundColor: ds.blueSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  successText: { fontSize: 13, lineHeight: 18, color: ds.navy, fontFamily: F.b },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  strengthLabel: { fontSize: 12, color: '#7c8aa5' },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#f0f2f7', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: '600' },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 24 },
  otpBox: { width: 48, height: 56, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: ds.border, justifyContent: 'center', alignItems: 'center' },
  otpBoxActive: { borderColor: ds.navy, borderWidth: 2 },
  otpBoxFilled: { borderColor: ds.navy },
  otpText: { fontSize: 22, lineHeight: 27, fontFamily: F.x, color: ds.ink },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  resendBtn: { alignItems: 'center', marginTop: 4, marginBottom: 16, padding: 8 },
  resendText: { color: ds.navy, fontSize: 14, lineHeight: 17, fontFamily: F.b },
  resendTextDisabled: { color: '#9aa5b8' },
  idTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  idTypeBtn: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: ds.border, gap: 4 },
  idTypeBtnActive: { backgroundColor: ds.blueSoft, borderColor: ds.navy },
  idTypeIcon: { fontSize: 28 },
  idTypeBtnText: { fontSize: 16, lineHeight: 20, fontFamily: F.x, color: ds.muted },
  idTypeBtnTextActive: { color: ds.navy },
  idTypeDesc: { fontSize: 11, lineHeight: 15, color: ds.muted, fontFamily: F.r, textAlign: 'center' },
  skipBtn: { alignItems: 'center', marginTop: 4, padding: 12 },
  skipText: { color: ds.muted, fontSize: 13, lineHeight: 16, fontFamily: F.b },
  loginLink: { alignItems: 'center', marginTop: 8 },
  loginLinkText: { color: ds.muted, fontSize: 14, lineHeight: 18, fontFamily: F.r },
  loginLinkBold: { color: ds.navy, fontFamily: F.x },
  pinBack: { position: 'absolute', left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  pinBackText: { color: '#f5a623', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.7, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, lineHeight: 22, fontFamily: F.x, color: ds.ink },
  modalClose: { fontSize: 20, color: '#7c8aa5', padding: 4 },
  countrySearch: { backgroundColor: ds.bg, borderRadius: 14, height: 46, paddingHorizontal: 14, fontSize: 15, fontFamily: F.s, marginBottom: 12, color: ds.ink },
  countryItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4, gap: 10 },
  countryItemSelected: { backgroundColor: ds.blueSoft },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { flex: 1, fontSize: 15, color: '#1a2b4a', fontWeight: '500' },
  countryItemDial: { fontSize: 14, color: '#25427a', fontWeight: '700' },
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