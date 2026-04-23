'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useUIStore } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/layout/ToastContainer'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check if token exists synchronously outside of Zustand's slow hydration wave
    const token = localStorage.getItem('access_token')
    if (!token && !isAuthenticated) {
      router.replace('/login')
    }
    setMounted(true)
  }, [isAuthenticated, router])

  // Automatically close sidebar on navigation (mobile)
  useEffect(() => {
    toggleSidebar(false)
  }, [pathname])

  if (!mounted) return null
  if (!isAuthenticated && !localStorage.getItem('access_token')) return null

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-visible' : ''}`}>
      <div className="mobile-overlay" onClick={() => toggleSidebar(false)} />
      <Sidebar />
      <div className="main-area">
        <header className="mobile-navbar">
          <button className="burger-btn" onClick={() => toggleSidebar()}>☰</button>
          <div className="mobile-branding">Connvo-POS</div>
          <div style={{ width: 40 }} /> {/* balance */}
        </header>
        {children}
      </div>
      <ToastContainer />
    </div>
  )
}
