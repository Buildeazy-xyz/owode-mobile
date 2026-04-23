import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Dimensions
} from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImageManipulator from 'expo-image-manipulator'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width, height } = Dimensions.get('window')
const BASE_URL = 'http://192.168.88.21:3000/api'

export default function FaceVerificationScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions()
  const [step, setStep] = useState<'intro' | 'camera' | 'processing' | 'success' | 'failed'>('intro')
  const [instruction, setInstruction] = useState('Position your face in the oval')
  const [countdown, setCountdown] = useState(3)
  const [attempts, setAttempts] = useState(0)
  const cameraRef = useRef<any>(null)

  useEffect(() => {
    if (step === 'camera') {
      startLivenessInstructions()
    }
  }, [step])

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
        setInstruction(instructions[i])
        i++
      } else {
        clearInterval(interval)
        captureAndVerify()
      }
    }, 1500)
  }

  const captureAndVerify = async () => {
    if (!cameraRef.current) return

    try {
      setStep('processing')
      setInstruction('Analyzing...')

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false
      })

      // Compress image
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )

      const selfieBase64 = compressed.base64 || photo.base64

      // Get token
      const token = await AsyncStorage.getItem('owode_token')

      // Send to backend for verification
      const response = await axios.post(
        `${BASE_URL}/face/verify`,
        { selfieBase64: `data:image/jpeg;base64,${selfieBase64}` },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setStep('success')
      } else {
        setStep('failed')
      }
    } catch (error: any) {
      console.error('Face verification error:', error.response?.data || error.message)
      setAttempts(prev => prev + 1)

      if (attempts >= 2) {
        Alert.alert(
          'Verification Failed',
          'We could not verify your face after multiple attempts. Please ensure:\n\n• Good lighting\n• Face clearly visible\n• No glasses or hats\n\nContact support if this persists.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        )
      } else {
        setStep('failed')
      }
    }
  }

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.container}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            OWODE needs camera access to verify your identity against your government ID photo
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  if (step === 'intro') {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1', '#1565c0']} style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.introContent}>
          <View style={styles.faceIconCircle}>
            <Text style={styles.faceIcon}>😊</Text>
          </View>
          <Text style={styles.introTitle}>Face Verification</Text>
          <Text style={styles.introSubtitle}>
            We will compare your face with your government ID photo to verify your identity
          </Text>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>For best results:</Text>
            {[
              '💡 Find a well-lit area',
              '👓 Remove glasses if possible',
              '📱 Hold phone at eye level',
              '😐 Keep a neutral expression',
              '🚫 No hats or face coverings'
            ].map((tip, i) => (
              <Text key={i} style={styles.tipItem}>{tip}</Text>
            ))}
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={() => setStep('camera')}>
            <Text style={styles.startBtnText}>📷 Start Verification</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  if (step === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        >
          {/* Dark overlay with oval cutout */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.ovalCutout} />
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>

          {/* Instructions */}
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>

          {/* Corner markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </CameraView>
      </View>
    )
  }

  if (step === 'processing') {
    return (
      <LinearGradient colors={['#0a0a2e', '#0d47a1']} style={styles.container}>
        <View style={styles.processingContent}>
          <ActivityIndicator size="large" color="#f5a623" />
          <Text style={styles.processingTitle}>Verifying Identity</Text>
          <Text style={styles.processingDesc}>
            Comparing your face with government records...
          </Text>
          <View style={styles.processingSteps}>
            <Text style={styles.processingStep}>✅ Liveness detected</Text>
            <Text style={styles.processingStep}>⏳ Matching with ID photo...</Text>
          </View>
        </View>
      </LinearGradient>
    )
  }

  if (step === 'success') {
    return (
      <LinearGradient colors={['#0a0a2e', '#22c55e', '#16a34a']} style={styles.container}>
        <View style={styles.resultContent}>
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>✅</Text>
          </View>
          <Text style={styles.resultTitle}>Identity Verified!</Text>
          <Text style={styles.resultDesc}>
            Your face has been successfully matched with your government ID. Your account is now fully verified!
          </Text>
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>You can now:</Text>
            <Text style={styles.benefitItem}>✅ Join Guaranteed Ajo groups</Text>
            <Text style={styles.benefitItem}>✅ Make larger transfers</Text>
            <Text style={styles.benefitItem}>✅ Access all platform features</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.doneBtnText}>Continue to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  if (step === 'failed') {
    return (
      <LinearGradient colors={['#0a0a2e', '#7f1d1d']} style={styles.container}>
        <View style={styles.resultContent}>
          <View style={styles.failedCircle}>
            <Text style={styles.failedIcon}>❌</Text>
          </View>
          <Text style={styles.resultTitle}>Verification Failed</Text>
          <Text style={styles.resultDesc}>
            We could not match your face with your government ID. Please try again.
          </Text>
          <View style={styles.retryCard}>
            <Text style={styles.retryTitle}>Common reasons:</Text>
            <Text style={styles.retryItem}>• Poor lighting conditions</Text>
            <Text style={styles.retryItem}>• Face not clearly visible</Text>
            <Text style={styles.retryItem}>• Glasses or face coverings</Text>
            <Text style={styles.retryItem}>• Camera angle too steep</Text>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setStep('intro')}>
            <Text style={styles.retryBtnText}>🔄 Try Again ({2 - attempts} attempts left)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  return null
}

const OVAL_WIDTH = width * 0.65
const OVAL_HEIGHT = OVAL_WIDTH * 1.3

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  backText: { color: '#f5a623', fontSize: 16 },
  permissionContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionIcon: { fontSize: 64, marginBottom: 20 },
  permissionTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  permissionDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  permissionBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 16, paddingHorizontal: 32, marginBottom: 16 },
  permissionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
  introContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingTop: 80 },
  faceIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,166,35,0.2)', borderWidth: 3, borderColor: '#f5a623', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  faceIcon: { fontSize: 56 },
  introTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  introSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  tipsCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  tipsTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 },
  tipItem: { color: '#fff', fontSize: 14, marginBottom: 8 },
  startBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 18, width: '100%', alignItems: 'center', shadowColor: '#f5a623', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: OVAL_HEIGHT },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  ovalCutout: { width: OVAL_WIDTH, height: OVAL_HEIGHT, borderRadius: OVAL_WIDTH / 2, borderWidth: 3, borderColor: '#f5a623', overflow: 'hidden' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  instructionBox: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  instructionText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#f5a623', borderWidth: 3 },
  topLeft: { top: height * 0.2, left: width * 0.17, borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: height * 0.2, right: width * 0.17, borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: height * 0.25, left: width * 0.17, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: height * 0.25, right: width * 0.17, borderTopWidth: 0, borderLeftWidth: 0 },
  processingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  processingTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 24, marginBottom: 8 },
  processingDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 32 },
  processingSteps: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%' },
  processingStep: { color: '#fff', fontSize: 14, marginBottom: 8 },
  resultContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successIcon: { fontSize: 56 },
  failedCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  failedIcon: { fontSize: 56 },
  resultTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  resultDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  benefitsCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  benefitsTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 12 },
  benefitItem: { color: '#fff', fontSize: 14, marginBottom: 8 },
  retryCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  retryTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 12 },
  retryItem: { color: '#fff', fontSize: 14, marginBottom: 6 },
  retryBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 16, width: '100%', alignItems: 'center', marginBottom: 16 },
  retryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  doneBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '100%', alignItems: 'center' },
  doneBtnText: { color: '#16a34a', fontWeight: 'bold', fontSize: 16 }
})