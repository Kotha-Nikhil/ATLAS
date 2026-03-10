import { create } from 'zustand'
import type { ApiUser } from '@/lib/api'

interface AuthStore {
  user: ApiUser | null
  isAuthenticated: boolean
  tokenExpiresAt: number | null
  setAuth: (user: ApiUser, expiresAt: number) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('atlas_token'),
  tokenExpiresAt: null,

  setAuth: (user, expiresAt) =>
    set({ user, isAuthenticated: true, tokenExpiresAt: expiresAt }),

  clearAuth: () => {
    localStorage.removeItem('atlas_token')
    set({ user: null, isAuthenticated: false, tokenExpiresAt: null })
  },
}))
