import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'http://192.168.88.21:3000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('owode_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authAPI = {
  register: (data: { fullName: string; phone: string; email?: string; password: string }) =>
    api.post('/users/register', data),
  login: (data: { phone: string; password: string }) =>
    api.post('/users/login', data),
  setTransactionPin: (transactionPin: string) =>
    api.post('/users/transaction-pin/set', { transactionPin }),
  setAppPin: (appPin: string) =>
    api.post('/users/app-pin/set', { appPin }),
  verifyAppPin: (appPin: string) =>
    api.post('/users/app-pin/verify', { appPin })
}

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  credit: (amount: number, description: string) =>
    api.post('/wallet/credit', { amount, description }),
  debit: (amount: number, description: string) =>
    api.post('/wallet/debit', { amount, description }),
  transfer: (recipientPhone: string, amount: number, description: string, transactionPin: string) =>
    api.post('/wallet/transfer', { recipientPhone, amount, description, transactionPin })
}

export const ajoAPI = {
  getAllGroups: () => api.get('/ajo/groups'),
  getGroup: (id: string) => api.get(`/ajo/groups/${id}`),
  createGroup: (data: { name: string; amount: number; frequency: string; totalMembers: number }) =>
    api.post('/ajo/create', data),
  joinGroup: (groupId: string) => api.post('/ajo/join', { groupId }),
  contribute: (groupId: string) => api.post('/ajo/contribute', { groupId })
}

export const kycAPI = {
  submitBVN: (bvn: string) => api.post('/kyc/bvn', { bvn }),
  submitNIN: (nin: string) => api.post('/kyc/nin', { nin }),
  getStatus: () => api.get('/kyc/status')
}

export default api