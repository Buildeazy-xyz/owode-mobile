import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Change this to your Mac's IP address when testing on a real phone
// For emulator use http://localhost:3000
const BASE_URL = 'http://192.168.88.21:3000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})
// Automatically attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('owode_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// API calls
export const authAPI = {
  register: (data: {
    fullName: string
    phone: string
    email?: string
    pin: string
  }) => api.post('/users/register', data),

  login: (data: {
    phone: string
    pin: string
  }) => api.post('/users/login', data)
}

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  credit: (amount: number, description: string) =>
    api.post('/wallet/credit', { amount, description }),
  debit: (amount: number, description: string) =>
    api.post('/wallet/debit', { amount, description })
}

export const ajoAPI = {
  getAllGroups: () => api.get('/ajo/groups'),
  getGroup: (id: string) => api.get(`/ajo/groups/${id}`),
  createGroup: (data: {
    name: string
    amount: number
    frequency: string
    totalMembers: number
  }) => api.post('/ajo/create', data),
  joinGroup: (groupId: string) => api.post('/ajo/join', { groupId }),
  contribute: (groupId: string) => api.post('/ajo/contribute', { groupId })
}

export const kycAPI = {
  submitBVN: (bvn: string) => api.post('/kyc/bvn', { bvn }),
  submitNIN: (nin: string) => api.post('/kyc/nin', { nin }),
  getStatus: () => api.get('/kyc/status')
}

export default api