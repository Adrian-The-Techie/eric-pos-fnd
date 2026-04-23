'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { inventoryApi } from '@/lib/api'
import { format } from 'date-fns'

export default function StockMovementsPage() {
  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  
  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  const [statement, setStatement] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeBranch) return
    inventoryApi.products({ branch: activeBranch.id }).then((res: any) => {
      setProducts(res.results || res)
    }).catch(() => {})
  }, [activeBranch])

  const loadStatement = async () => {
    if (!selectedProduct) return addToast('Please select a product', 'error')
    if (!activeBranch) return
    
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.append('branch', activeBranch.id.toString())
      qs.append('product', selectedProduct)
      if (dateFrom) qs.append('from', dateFrom)
      if (dateTo) qs.append('to', dateTo)
      
      const token = useAuthStore.getState().token
      const res = await fetch(`http://127.0.0.1:8000/api/v1/inventory/stock/statement/?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      
      if (!res.ok) throw new Error('Failed to load statement')
      const data = await res.json()
      setStatement(data)
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailStatement = async () => {
    if (!emailValue) { addToast('Enter email', 'error'); return }
    if (!activeBranch || !selectedProduct) return
    setEmailLoading(true)
    try {
      await inventoryApi.emailReport({
        report_type: 'statement',
        email: emailValue,
        branch_id: activeBranch.id,
        date_from: dateFrom,
        date_to: dateTo,
        // @ts-ignore
        product_id: selectedProduct
      })
      addToast('Statement sent successfully!')
      setShowEmailModal(false)
    } catch (e: any) {
      addToast('Failed to send email', 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Stock Movements & Statements</div>
      </div>
      
      <div className="page-content">
        <div className="card mb-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="form-group mb-0" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Product</label>
              <select className="form-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                <option value="">— Select Product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0" style={{ width: 150 }}>
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group mb-0" style={{ width: 150 }}>
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={loadStatement} disabled={loading || !selectedProduct}>
              {loading ? 'Loading...' : 'Generate'}
            </button>
          </div>
        </div>

        {statement && (
          <div className="card" ref={reportRef}>
            <div className="card-header border-b pb-4 mb-4 flex justify-between items-center">
              <div className="card-title">Movement Statement</div>
              <div className="flex gap-2 no-print">
                 <button className="btn btn-secondary btn-sm" onClick={() => setShowEmailModal(true)}>📧 Email PDF</button>
                 <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print Statement</button>
              </div>
            </div>

            <div className="only-print" style={{ marginBottom: 20 }}>
               <h2>{activeBranch?.name} — Product Movement Statement</h2>
               <h4>Product: {products.find(p => p.id === selectedProduct)?.name}</h4>
               <p>Period: {dateFrom || 'Start'} to {dateTo || 'End'}</p>
               <hr />
            </div>
            
            <div className="stat-grid mb-6">
              <div className="stat-card">
                <div className="stat-icon gray">⏳</div>
                <div className="stat-value">{parseFloat(statement.opening_stock).toLocaleString()}</div>
                <div className="stat-label">Opening Stock</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">📥</div>
                <div className="stat-value">{parseFloat(statement.stock_in).toLocaleString()}</div>
                <div className="stat-label">Stock In</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">📤</div>
                <div className="stat-value">{parseFloat(statement.stock_out).toLocaleString()}</div>
                <div className="stat-label">Stock Out</div>
              </div>
              <div className="stat-card bg-primary-light">
                <div className="stat-icon primary">📦</div>
                <div className="stat-value">{parseFloat(statement.closing_stock).toLocaleString()}</div>
                <div className="stat-label font-bold">Closing Stock</div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Quantity</th>
                    <th>Balance Before</th>
                    <th>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.movements.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>No movements found for this period.</td></tr>
                  ) : (
                    statement.movements.map((m: any) => (
                      <tr key={m.id}>
                        <td className="text-muted">{format(new Date(m.created_at), 'dd MMM yyyy HH:mm')}</td>
                        <td>
                          <span className={`badge ${['in', 'return'].includes(m.movement_type) ? 'badge-green' : m.movement_type === 'adjustment' ? 'badge-orange' : 'badge-red'}`}>
                            {m.movement_type.toUpperCase()}
                          </span>
                        </td>
                        <td>{m.reference || '—'}</td>
                        <td className="font-semibold">{parseFloat(m.quantity).toLocaleString()}</td>
                        <td className="text-muted">{parseFloat(m.quantity_before).toLocaleString()}</td>
                        <td className="font-bold">{parseFloat(m.quantity_after).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Email Statement</div><button className="btn btn-ghost btn-sm" onClick={() => setShowEmailModal(false)}>✕</button></div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-4">Send this stock statement as a PDF attachment.</p>
              <div className="form-group">
                <label className="form-label">Recipient Email</label>
                <input className="form-input" placeholder="manager@example.com" value={emailValue} onChange={e => setEmailValue(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEmailStatement} disabled={emailLoading}>
                {emailLoading ? <span className="spinner" /> : '📧 Send Statement'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .only-print { display: none; }
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .card { border: none !important; box-shadow: none !important; }
          .topbar, .form-group, .btn, .search-bar { display: none !important; }
        }
      `}</style>
    </>
  )
}
