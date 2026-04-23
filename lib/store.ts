'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearTokens, setTokens } from './api'

interface Branch {
  id: string
  name: string
  code: string
  is_primary: boolean
}

interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'staff' | 'backoffice'
  branches: Branch[]
}

interface AuthState {
  user: User | null
  activeBranch: Branch | null
  isAuthenticated: boolean
  setUser: (user: User, access: string, refresh: string) => void
  setActiveBranch: (branch: Branch) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeBranch: null,
      isAuthenticated: false,

      setUser: (user, access, refresh) => {
        setTokens(access, refresh)
        const primaryBranch = user.branches.find(b => b.is_primary) || user.branches[0] || null
        set({ user, isAuthenticated: true, activeBranch: primaryBranch })
      },

      setActiveBranch: (branch) => set({ activeBranch: branch }),

      logout: () => {
        clearTokens()
        set({ user: null, activeBranch: null, isAuthenticated: false })
      },
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({
        user: state.user,
        activeBranch: state.activeBranch,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// ─── Toast store ──────────────────────────────────────────────
interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// ─── UI store ─────────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean
  toggleSidebar: (open?: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: (open) => set((s) => ({ sidebarOpen: open !== undefined ? open : !s.sidebarOpen })),
}))
