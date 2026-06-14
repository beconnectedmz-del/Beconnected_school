import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

export type Role = 'student' | 'teacher' | 'admin'

interface User {
  id: string
  email: string
  role: Role
  full_name?: string
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        Cookies.set('token', token, { expires: 1, sameSite: 'strict' })
        set({ user, token })
      },
      logout: () => {
        Cookies.remove('token')
        set({ user: null, token: null })
        window.location.href = '/login'
      },
    }),
    { name: 'eduhub-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)
