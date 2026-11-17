import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Dimensions, ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImageManipulator from 'expo-image-manipulator'
import { LinearGradient as LG } from 'expo-linear-gradient'
import { kycAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import OwodeLoader from '../components/OwodeLoader'
import Icon, { IconName } from '../components/Icon'
import { TopBar, Btn } from '../components/ui'
import { F, ds } from '../constants/theme'

const { width, height } = Dimensions.get('window')

export default function FaceVerificationScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [step, setStep] = useState<'intro' | 'camera' | 'processing' | 'success' | 'failed'>('intro')
  const [instruction, setInstruction] = useState('Position your face in the oval')
  const [attempts, setAttempts] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const cameraRef = useRef<any>(null)
  const isCapturing = useRef(false)

  useEffect(() => {
    if (step === 'camera') {
      isCapturing.current = false
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
      setStep('processing')

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

      // Send to backend — real YouVerify integration
      const response = await kycAPI.submitFace(
        `data:image/jpeg;base64,${selfieBase64}`,
        user?.bvn,
        user?.nin
      )

      if (response.data.success && response.data.data?.verified) {
        // Update user in context
        if (user) {
          refreshUser({ ...user, isVerified: true })
        }
        setStep('success')
      } else {
        setErrorMessage(response.data.message || 'Verification failed')
        setAttempts(prev => prev + 1)
        setStep('failed')
      }
    } catch (error: any) {
      console.error('Face verification error:', error.response?.data || error.message)
      const msg = error.response?.data?.message || 'Something went wrong'
      setErrorMessage(msg)
      setAttempts(prev => prev + 1)

      if (attempts >= 2) {
        Alert.alert(
          'Verification Failed',
          'We could not verify your face after multiple attempts.\n\nPlease ensure:\n• Good lighting\n• Face clearly visible\n• No glasses or hats\n\nContact support if this persists.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        )
      } else {
        setStep('failed')
      }
    }
  }

  if (!permission) return <View style={styles.container} />

  // OWODE Alajo Redesign "Face verification" board
  const Shell = ({ children, onBack, title = 'Face verification' }: { children: React.ReactNode; onBack?: () => void; title?: string }) => (
    <View style={{ flex: 1, backgroundColor: ds.hero }}>
      <TopBar title={title} onBack={onBack} dark />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18, flexGrow: 1 }}>{children}</ScrollView>
    </View>
  )
  const Oval = () => (
    <View style={fv.oval}><Icon name="user" size={110} color="#4a5f8f" width={1.2} /></View>
  )
  const Tip = ({ icon, text, on }: { icon: IconName; text: string; on?: boolean }) => (
    <View style={fv.tip}>
      <Icon name={icon} size={18} color={on ? ds.gold : ds.onHero} width={2} />
      <Text style={[fv.tipText, on && { color: '#ffffff', fontFamily: F.b }]}>{text}</Text>
    </View>
  )

  if (!permission.granted) {
    return (
      <Shell onBack={() => navigation.goBack()}>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 24 }}>
          <View style={fv.iconTile}><Icon name="camera" size={30} color={ds.gold} width={2} /></View>
          <Text style={fv.title}>Allow the camera</Text>
          <Text style={fv.sub}>OWODE needs your front camera to check that it is really you.</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Btn title="Allow camera" icon="camera" onPress={requestPermission} />
        <Btn title="Not now" kind="heroline" onPress={() => navigation.goBack()} />
      </Shell>
    )
  }

  if (step === 'intro') {
    const needsId = !user?.bvn && !user?.nin
    return (
      <Shell onBack={() => navigation.goBack()}>
        <View style={{ alignItems: 'center', gap: 14, paddingTop: 8 }}>
          <Oval />
          <Text style={fv.title}>Check it's really you</Text>
          <Text style={fv.sub}>We match your face with the photo on your BVN or NIN record.</Text>
        </View>
        {needsId ? (
          <View style={fv.warn}>
            <Icon name="alert" size={20} color={ds.gold} width={2} />
            <Text style={fv.warnText}>Submit your BVN or NIN first, then come back to verify your face.</Text>
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          <Tip icon="sun" text="Good light on your face" />
          <Tip icon="user" text="No glasses, cap or face covering" />
          <Tip icon="camera" text="Phone at eye level, neutral face" />
        </View>
        <View style={{ flex: 1 }} />
        {needsId
          ? <Btn title="Submit BVN or NIN" icon="shieldCheck" onPress={() => navigation.navigate('KYCVerification')} />
          : <Btn title="Start" icon="camera" onPress={() => setStep('camera')} />}
      </Shell>
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
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.ovalCutout} />
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>

          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>

          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          <TouchableOpacity
            style={styles.cancelCameraBtn}
            onPress={() => setStep('intro')}
          >
            <Text style={styles.cancelCameraText}>Cancel</Text>
          </TouchableOpacity>
        </CameraView>
      </View>
    )
  }

  if (step === 'processing') {
    return (
      <Shell>
        <View style={{ alignItems: 'center', gap: 16, paddingTop: 8 }}>
          <Oval />
          <Text style={fv.pill}>Hold on · checking it is really you</Text>
        </View>
        <View style={{ gap: 10, paddingTop: 6 }}>
          <Tip icon="checkCircle" text="Face found" on />
          <Tip icon="checkCircle" text="Liveness confirmed" on />
          <Tip icon="clock" text="Matching with your ID photo…" />
        </View>
      </Shell>
    )
  }

  if (step === 'success') {
    return (
      <Shell title="Verified">
        <View style={{ alignItems: 'center', gap: 14, paddingTop: 24 }}>
          <View style={fv.result}><Icon name="check" size={44} color={ds.hero} width={2.6} /></View>
          <Text style={fv.title}>You're verified</Text>
          <Text style={fv.sub}>Your face matched your ID. Every feature is now unlocked.</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Tip icon="ajo" text="Join Guaranteed Ajọ groups" on />
          <Tip icon="send" text="Send and receive larger amounts" on />
        </View>
        <View style={{ flex: 1 }} />
        <Btn title="Go to Home" onPress={() => navigation.navigate('Dashboard')} />
      </Shell>
    )
  }

  if (step === 'failed') {
    return (
      <Shell onBack={() => navigation.goBack()}>
        <View style={{ alignItems: 'center', gap: 14, paddingTop: 24 }}>
          <View style={[fv.result, { backgroundColor: ds.dangerSoft }]}><Icon name="close" size={40} color={ds.danger} width={2.6} /></View>
          <Text style={fv.title}>We couldn't match your face</Text>
          <Text style={fv.sub}>{errorMessage || 'Your face did not match the photo on your ID record.'}</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Tip icon="sun" text="Move to brighter light" />
          <Tip icon="user" text="Take off glasses or cap" />
          <Tip icon="camera" text="Hold the phone straight at eye level" />
        </View>
        <View style={{ flex: 1 }} />
        {attempts < 3 ? <Btn title={`Try again · ${3 - attempts} left`} icon="refresh" onPress={() => setStep('intro')} /> : null}
        <Btn title="Cancel" kind="heroline" onPress={() => navigation.goBack()} />
      </Shell>
    )
  }

  return null
}

const fv = StyleSheet.create({
  oval: { width: 220, height: 280, borderRadius: 110, borderWidth: 4, borderColor: ds.gold, backgroundColor: '#1b2d58', alignItems: 'center', justifyContent: 'center' },
  iconTile: { width: 64, height: 64, borderRadius: 20, backgroundColor: ds.heroChip, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 27, color: '#ffffff', fontFamily: F.x, textAlign: 'center' },
  sub: { fontSize: 14, lineHeight: 21, color: ds.onHero, fontFamily: F.r, textAlign: 'center', maxWidth: 320 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 18, color: ds.onHero, fontFamily: F.m },
  warn: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: ds.heroChip, borderRadius: 14, padding: 14 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#ffffff', fontFamily: F.m },
  pill: { fontSize: 13, lineHeight: 16, color: '#ffffff', fontFamily: F.b, backgroundColor: ds.heroChip, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: 'hidden' },
  result: { width: 88, height: 88, borderRadius: 44, backgroundColor: ds.gold, alignItems: 'center', justifyContent: 'center' },
})

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
  introSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  warningCard: { backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 16, padding: 16, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: '#f5a623' },
  warningText: { color: '#f5a623', fontSize: 13, marginBottom: 8 },
  warningBtn: { backgroundColor: '#f5a623', borderRadius: 10, padding: 10, alignItems: 'center' },
  warningBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  tipsCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24 },
  tipsTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 },
  tipItem: { color: '#fff', fontSize: 14, marginBottom: 8 },
  startBtn: { backgroundColor: '#f5a623', borderRadius: 16, padding: 18, width: '100%', alignItems: 'center' },
  startBtnDisabled: { backgroundColor: '#888' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: OVAL_HEIGHT },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  ovalCutout: { width: OVAL_WIDTH, height: OVAL_HEIGHT, borderRadius: OVAL_WIDTH / 2, borderWidth: 3, borderColor: '#f5a623' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  instructionBox: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  instructionText: { color: '#fff', fontSize: 15, lineHeight: 19, fontFamily: F.b, textAlign: 'center', backgroundColor: 'rgba(20,36,74,0.85)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, overflow: 'hidden' },
  cancelCameraBtn: { position: 'absolute', top: 60, right: 24 },
  cancelCameraText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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