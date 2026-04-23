'use client'
import { useToastStore } from '@/lib/store'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  return (
    <div className="toast-container no-print">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <span>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
