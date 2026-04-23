'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { salesApi } from '@/lib/api'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SalesPage() {
  const { activeBranch, user } = useAuthStore()
  const { addToast } = useToastStore()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  const load = () => {
    if (!activeBranch) return
    setLoading(true)
    const params: Record<string, string> = { branch: activeBranch.id }
    if (statusFilter) params.status = statusFilter
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    salesApi.list(params).then(r => {
      setSales((r.results || r) as any[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [activeBranch, statusFilter, dateFrom, dateTo])

  const filtered = sales.filter(s =>
    !search || s.sale_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.customer_name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleVoid = async (id: string) => {
    if (user?.role === 'staff') return
    if (!confirm('Void this sale?')) return
    try {
      await salesApi.void(id)
      addToast('Sale voided')
      load()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const router = useRouter()

  const handleViewReceipt = async (sale: any) => {
    let receiptId = null;
    
    // Safely extract from receipts array if it's properly formed
    if (sale.receipts && Array.isArray(sale.receipts) && sale.receipts.length > 0) {
      receiptId = sale.receipts[0].id || (typeof sale.receipts[0] === 'string' ? sale.receipts[0] : null);
    }
    
    // If not found, create a new receipt on demand
    if (!receiptId) {
      try {
        const rcpt = await salesApi.createReceipt(sale.id);
        receiptId = rcpt?.id || (typeof rcpt === 'string' ? rcpt : null);
      } catch (e: any) {
        addToast(e.message || 'Failed to generate receipt', 'error');
        return;
      }
    }

    if (!receiptId) {
      addToast('Error: Could not retrieve Receipt ID from server.', 'error');
      return;
    }

    router.push(`/sales/receipts/${receiptId}`);
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { completed: 'badge-green', credited: 'badge-orange', held: 'badge-blue', voided: 'badge-red', active: 'badge-gray' }
    return map[s] || 'badge-gray'
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Sales History</div>
      </div>
      <div className="page-content">
        <div className="card">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <span className="search-icon">🔍</span>
              <input placeholder="Search sale # or customer…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="credited">Credited</option>
              <option value="held">Held</option>
              <option value="voided">Voided</option>
            </select>
            <input type="date" className="form-input" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" className="form-input" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <div className="text-muted text-xs mt-4">Loading sales history...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 0' }}>
              <div className="empty-state-icon" style={{ opacity: 0.3 }}>🧾</div>
              <div className="empty-state-text">No recent activity</div>
              <div className="empty-state-sub">Transactions matching your filters will appear here</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sale #</th><th>Customer</th><th>Branch</th><th>Items</th>
                    <th>Subtotal</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><span className="font-semibold text-primary">{s.sale_number}</span></td>
                      <td>{s.customer_name || '—'}</td>
                      <td className="text-muted">{s.branch}</td>
                      <td>{s.items?.length || 0}</td>
                      <td>KSh {parseFloat(s.subtotal || 0).toLocaleString()}</td>
                      <td className="font-bold">KSh {parseFloat(s.total || 0).toLocaleString()}</td>
                      <td style={{ textTransform: 'capitalize' }}>{s.payment_method || '—'}</td>
                      <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                      <td className="text-muted text-sm">{s.created_at ? format(new Date(s.created_at), 'dd/MM/yy HH:mm') : ''}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewReceipt(s)} className="btn btn-secondary btn-sm">🧾 Receipt</button>
                          {s.status !== 'voided' && user?.role !== 'staff' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleVoid(s.id)}>Void</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
