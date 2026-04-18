import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authAPI } from '../utils/api'

interface User {
  id: string
  fullName: string
  phone: string
  email: string | null
  role: string
  isVerified: boolean
  hasTransactionPin: boolean
  wallet: {
    id: string
    balance: number
    totalSaved: number
    totalPayout: number
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (data: { fullName: string; phone: string; email?: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: (updatedUser: User) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('owode_token')
        const savedUser = await AsyncStorage.getItem('owode_user')
        if (savedToken && savedUser) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [])

  const login = async (phone: string, password: string) => {
    const response = await authAPI.login({ phone, password })
    const { user, token } = response.data.data
    await AsyncStorage.setItem('owode_token', token)
    await AsyncStorage.setItem('owode_user', JSON.stringify(user))
    setUser(user)
    setToken(token)
  }

  const register = async (data: { fullName: string; phone: string; email?: string; password: string }) => {
    const response = await authAPI.register(data)
    const { user, token } = response.data.data
    await AsyncStorage.setItem('owode_token', token)
    await AsyncStorage.setItem('owode_user', JSON.stringify(user))
    setUser(user)
    setToken(token)
  }

  const logout = async () => {
    await AsyncStorage.removeItem('owode_token')
    await AsyncStorage.removeItem('owode_user')
    await AsyncStorage.removeItem('has_app_pin')
    setUser(null)
    setToken(null)
  }

  const refreshUser = (updatedUser: User) => {
    setUser(updatedUser)
    AsyncStorage.setItem('owode_user', JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}