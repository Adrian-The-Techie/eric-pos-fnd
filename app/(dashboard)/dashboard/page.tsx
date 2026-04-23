'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { salesApi, inventoryApi, customerApi } from '@/lib/api'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const router = useRouter()
  
  const [stats, setStats] = useState({ sales: 0, revenue: 0, customers: 0, lowStock: 0 })
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!activeBranch) return
    const today = format(new Date(), 'yyyy-MM-dd')
    Promise.all([
      salesApi.list({ branch: activeBranch.id, status: 'completed', from: today, to: today }),
      customerApi.list({ branch: activeBranch.id }),
      inventoryApi.branchProducts(activeBranch.id),
      salesApi.list({ branch: activeBranch.id, ordering: '-created_at' }),
    ]).then(([todaySales, customers, bps, allSales]) => {
      const salesArr = (todaySales as any).results || todaySales
      const rev = (salesArr as any[]).reduce((a: number, s: any) => a + parseFloat(s.total || 0), 0)
      const bpsArr = (bps as any).results || bps
      const lowStock = bpsArr.filter((b: any) => b.is_low_stock).length
      
      setStats({
        sales: salesArr.length,
        revenue: rev,
        customers: ((customers as any).results || customers).length,
        lowStock,
      })
      setRecentSales(((allSales as any).results || allSales).slice(0, 8))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [activeBranch])

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      completed: 'badge-green', credited: 'badge-orange',
      held: 'badge-blue', voided: 'badge-red', active: 'badge-gray'
    }
    return map[s] || 'badge-gray'
  }

  return (
    <>
      <div className="topbar no-print">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="text-xs text-muted">{format(new Date(), 'EEEE, MMMM d yyyy')} · {activeBranch?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge badge-primary">👋 {user?.full_name?.split(' ')[0]}</div>
        </div>
      </div>

      <div className="page-content">
        {/* Stat cards */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon green">💰</div>
            <div className="stat-value">KSh {stats.revenue.toLocaleString()}</div>
            <div className="stat-label">Today's Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">🧾</div>
            <div className="stat-value">{stats.sales}</div>
            <div className="stat-label">Sales Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">👥</div>
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-label">Customers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">📦</div>
            <div className="stat-value">{stats.lowStock}</div>
            <div className="stat-label">Low Stock Items</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Transactions</div>
              <div className="card-subtitle">Latest sales activity</div>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : recentSales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <div className="empty-state-text">No sales yet today</div>
              <div className="empty-state-sub">Head to Point of Sale to create a sale</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(sale => (
                    <tr key={sale.id}>
                      <td><span className="font-semibold text-primary">{sale.sale_number}</span></td>
                      <td>{sale.customer_name || '—'}</td>
                      <td>{sale.items?.length || 0}</td>
                      <td style={{ textTransform: 'capitalize' }}>{sale.payment_method || '—'}</td>
                      <td className="font-bold">KSh {parseFloat(sale.total).toLocaleString()}</td>
                      <td><span className={`badge ${statusBadge(sale.status)}`}>{sale.status}</span></td>
                      <td className="text-muted">{sale.created_at ? format(new Date(sale.created_at), 'HH:mm') : ''}</td>
                      <td>
                        <button onClick={() => handleViewReceipt(sale)} className="btn btn-secondary btn-sm">🧾</button>
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
