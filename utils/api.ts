import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'https://owode-platform.onrender.com/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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
  joinGroup: (groupId: string) => api.post('/ajo/join', { groupId }),
  contribute: (groupId: string) => api.post('/ajo/contribute', { groupId })
}

export const guaranteedAjoAPI = {
  getAllGroups: () => api.get('/guaranteed-ajo/groups'),
  getGroup: (id: string) => api.get(`/guaranteed-ajo/groups/${id}`),
  joinGroup: (groupId: string) => api.post('/guaranteed-ajo/join', { groupId }),
  contribute: (groupId: string, transactionPin: string) =>
    api.post('/guaranteed-ajo/contribute', { groupId, transactionPin })
}

export const kycAPI = {
  submitBVN: (bvn: string) => api.post('/kyc/bvn', { bvn }),
  submitNIN: (nin: string) => api.post('/kyc/nin', { nin }),
  getStatus: () => api.get('/kyc/status')
}

export const trustAPI = {
  getMyScore: () => api.get('/trust/my-score')
}

export const savingsAPI = {
  createGoal: (data: {
    title: string
    description?: string
    goalAmount: number
    autoDebitAmount?: number
    autoDebitFreq?: string
    targetDate: string
    initialDeposit?: number
  }) => api.post('/savings/create', data),
  deposit: (goalId: string, amount: number) =>
    api.post('/savings/deposit', { goalId, amount }),
  withdraw: (goalId: string) =>
    api.post('/savings/withdraw', { goalId }),
  getGoals: () => api.get('/savings/goals'),
  getGoal: (id: string) => api.get(`/savings/goals/${id}`)
}

export default api