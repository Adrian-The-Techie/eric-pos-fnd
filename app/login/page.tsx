'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login(username, password)
      setUser(res.user, res.access, res.refresh)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
               <img src="/assets/logo.png" alt="Connvo-POS Logo" style={{ width: 140, height: 140, objectFit: 'contain' }} />
            </div>
            <h1 className="login-title">Connvo-POS</h1>
            <p className="login-subtitle">Cloud Point of Sale Management</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email or Phone Number</label>
              <div className="input-with-icon">
                <span className="input-icon">👤</span>
                <input
                  id="login-username"
                  type="text"
                  className="form-input"
                  placeholder="name@business.com or 07..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-block btn-lg login-btn"
              disabled={loading}
            >
              {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} /> : 'Continue to Dashboard'}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <span className="text-primary font-semibold cursor-pointer">Contact Support</span></p>
            <div className="powered-by">Powered by <span className="font-bold">Connvo-POS</span></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .login-bg-shapes {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .shape-1 {
          width: 400px; height: 400px;
          background: var(--primary);
          top: -100px; right: -100px;
        }

        .shape-2 {
          width: 300px; height: 300px;
          background: #60a5fa;
          bottom: -50px; left: -50px;
        }

        .shape-3 {
          width: 250px; height: 250px;
          background: #a5b4fc;
          top: 20%; left: 10%;
        }

        .login-container {
          width: 100%;
          max-width: 460px;
          position: relative;
          z-index: 10;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          padding: 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .login-logo {
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-title {
          font-size: 28px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -1px;
          margin: 0;
        }

        .login-subtitle {
          font-size: 14px;
          color: #64748b;
          margin-top: 6px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          opacity: 0.6;
        }

        .input-with-icon .form-input {
          padding-left: 42px;
          background: #f1f5f9;
          border-color: transparent;
          height: 48px;
          font-size: 14px;
        }

        .input-with-icon .form-input:focus {
          background: #fff;
          border-color: var(--primary);
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 10px;
          padding: 12px 14px;
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 24px;
          animation: shake 0.4s ease;
        }

        .login-btn {
          height: 52px;
          font-size: 15px;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(43, 127, 255, 0.25);
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
        }

        .powered-by {
          margin-top: 24px;
          font-size: 11px;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        @media (max-width: 480px) {
          .login-card { padding: 32px 24px; }
        }
      `}</style>
    </div>
  )
}
