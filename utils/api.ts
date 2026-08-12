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

// A dead session must log the user out, never leave a phantom account on screen.
let onSessionExpired: (() => void) | null = null
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn }

api.interceptors.response.use(
  r => r,
  async (error) => {
    const status = error.response?.status
    const msg = String(error.response?.data?.message || '')
    if (status === 401 || /user not found/i.test(msg)) {
      await AsyncStorage.multiRemove(['owode_token', 'owode_user'])
      if (onSessionExpired) onSessionExpired()
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data: { fullName: string; phone: string; email?: string; password: string; dateOfBirth?: string; country?: string }) =>
    api.post('/users/register', data),
  login: (data: { phone: string; password: string }) =>
    api.post('/users/login', data),
 getMe: () => api.get('/users/me'),
  getReferral: () => api.get('/users/referral'),
  updateEmail: (email: string) => api.put('/users/update-email', { email }),
  sendOTP: (phone: string, dialCode?: string, email?: string) =>
    api.post('/users/send-otp', { phone, dialCode, email }),
  forgotPassword: (phone: string) =>
    api.post('/users/forgot-password', { phone }),
  resetPassword: (phone: string, otp: string, newPassword: string) =>
    api.post('/users/reset-password', { phone, otp, newPassword }),
  verifyOTP: (phone: string, otp: string) =>
    api.post('/users/verify-otp', { phone, otp }),
  setTransactionPin: (transactionPin: string, currentPin?: string) =>
    api.post('/users/transaction-pin/set', { transactionPin, currentPin }),
  resetTransactionPin: (otp: string, newPin: string) =>
    api.post('/users/transaction-pin/reset', { otp, newPin }),
  setAppPin: (appPin: string, currentPin?: string) =>
    api.post('/users/app-pin/set', { appPin, currentPin }),
  verifyAppPin: (appPin: string) =>
    api.post('/users/app-pin/verify', { appPin }),
  lookupRecipient: (phone: string) =>
    api.post('/users/lookup', { phone })
}

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params?: { from?: string; to?: string; type?: string }) =>
    api.get('/wallet/transactions', { params }),
  credit: (amount: number, description: string) =>
    api.post('/wallet/credit', { amount, description }),
  debit: (amount: number, description: string) =>
    api.post('/wallet/debit', { amount, description }),
  transfer: (recipientPhone: string, amount: number, description: string, transactionPin: string, location?: { latitude: number; longitude: number } | null) =>
    api.post('/wallet/transfer', { recipientPhone, amount, description, transactionPin, location })
}

export const ajoAPI = {
  getAllGroups: () => api.get('/ajo/groups'),
  getGroup: (id: string) => api.get(`/ajo/groups/${id}`),
  joinGroup: (groupId: string) => api.post('/ajo/join', { groupId }),
  contribute: (groupId: string, transactionPin: string) =>
    api.post('/ajo/contribute', { groupId, transactionPin })
}

export const userAjoAPI = {
  create: (data: { name: string; amount: number; frequency: string; totalMembers: number }) =>
    api.post('/user-ajo/create', data),
  preview: (code: string) => api.get(`/user-ajo/preview/${code}`),
  join: (code: string) => api.post('/user-ajo/join', { code }),
  setOrder: (groupId: string, order: string[]) =>
    api.post('/user-ajo/order', { groupId, order }),
  mine: () => api.get('/user-ajo/mine'),
  getRequests: (groupId: string) => api.get(`/user-ajo/requests/${groupId}`),
  respondToRequest: (memberId: string, accept: boolean) =>
    api.post(`/user-ajo/requests/${memberId}/respond`, { accept }),
  removeMember: (memberId: string) => api.delete(`/user-ajo/member/${memberId}`)
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
  submitFace: (image: string, bvn?: string, nin?: string) =>
    api.post('/kyc/face', { image, bvn, nin }),
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
  deposit: (goalId: string, amount: number, transactionPin: string) =>
    api.post('/savings/deposit', { goalId, amount, transactionPin }),
  withdraw: (goalId: string, transactionPin: string) =>
    api.post('/savings/withdraw', { goalId, transactionPin }),
  getGoals: () => api.get('/savings/goals'),
  getGoal: (id: string) => api.get(`/savings/goals/${id}`)
}

export default api