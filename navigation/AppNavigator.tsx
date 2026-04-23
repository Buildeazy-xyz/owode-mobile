import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import DashboardScreen from '../screens/DashboardScreen'
import WalletScreen from '../screens/WalletScreen'
import AjoScreen from '../screens/AjoScreen'
import ProfileScreen from '../screens/ProfileScreen'
import TransferScreen from '../screens/TransferScreen'
import ReceiptScreen from '../screens/ReceiptScreen'
import SetAppPinScreen from '../screens/SetAppPinScreen'
import SetTransactionPinScreen from '../screens/SetTransactionPinScreen'
import GuaranteedAjoScreen from '../screens/GuaranteedAjoScreen'
import TrustScoreScreen from '../screens/TrustScoreScreen'
import GroupHistoryScreen from '../screens/GroupHistoryScreen'
import BiometricSetupScreen from '../screens/BiometricSetupScreen'
import FaceVerificationScreen from '../screens/FaceVerificationScreen'


const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Ajo" component={AjoScreen} />
            <Stack.Screen name="GuaranteedAjo" component={GuaranteedAjoScreen} />
            <Stack.Screen name="TrustScore" component={TrustScoreScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Transfer" component={TransferScreen} />
            <Stack.Screen name="Receipt" component={ReceiptScreen} />
            <Stack.Screen name="SetAppPin" component={SetAppPinScreen} />
            <Stack.Screen name="SetTransactionPin" component={SetTransactionPinScreen} />
            <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
            <Stack.Screen name="FaceVerification" component={FaceVerificationScreen} />


<Stack.Screen name="GroupHistory" component={GroupHistoryScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}