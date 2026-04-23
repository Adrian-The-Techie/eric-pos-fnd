'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { salesApi, inventoryApi } from '@/lib/api'
import { format, subDays } from 'date-fns'
import { useReactToPrint } from 'react-to-print'
import { useSearchParams } from 'next/navigation'

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') as 'sales' | 'items' | null
  
  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const [activeTab, setActiveTab] = useState<'sales' | 'items'>(typeParam || 'sales')
  const [period, setPeriod] = useState('today')
  const [sales, setSales] = useState<any[]>([])
  const [stockReport, setStockReport] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeParam) setActiveTab(typeParam)
  }, [typeParam])

  const handlePrint = useReactToPrint({ 
    contentRef: reportRef,
    documentTitle: `${activeTab.toUpperCase()}_REPORT_${format(new Date(), 'yyyyMMdd')}`
  })

  const getPeriodDates = () => {
    const today = new Date()
    if (period === 'today') return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    if (period === 'week') return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    if (period === 'month') return { from: format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    if (period === 'custom') return { from: dateFrom, to: dateTo }
    return {}
  }

  const load = async () => {
    if (!activeBranch) return
    setLoading(true)
    const { from, to } = getPeriodDates()
    
    try {
      if (activeTab === 'sales') {
        const res = await salesApi.list({ branch: activeBranch.id, from, to })
        setSales((res as any).results || res)
      } else {
        const res = await inventoryApi.stockReport(activeBranch.id, from, to)
        setStockReport(res)
      }
    } catch (e: any) {
      addToast('Failed to load report data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailReport = async () => {
    if (!emailValue) { addToast('Please enter an email address', 'error'); return }
    if (!activeBranch) return
    setEmailLoading(true)
    try {
      const { from, to } = getPeriodDates()
      await inventoryApi.emailReport({
        report_type: activeTab,
        email: emailValue,
        branch_id: activeBranch.id,
        date_from: from || '',
        date_to: to || ''
      })
      addToast('Report sent successfully!')
      setShowEmailModal(false)
    } catch (e: any) {
      addToast('Failed to send email', 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  useEffect(() => { load() }, [activeBranch, period, activeTab, dateFrom, dateTo])

  // Process Sales Data for Display
  const completedSales = sales.filter(s => s.status === 'completed')
  const revenue = completedSales.reduce((a, s) => a + parseFloat(s.total || 0), 0)
  const productTotals: Record<string, { name: string, qty: number, revenue: number }> = {}
  completedSales.forEach(s => {
    (s.items || []).forEach((item: any) => {
      if (!productTotals[item.product_name]) productTotals[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 }
      productTotals[item.product_name].qty += parseFloat(item.quantity)
      productTotals[item.product_name].revenue += parseFloat(item.line_total)
    })
  })
  const topProducts = Object.values(productTotals).sort((a, b) => b.revenue - a.revenue)
  const payBreakdown: Record<string, number> = {}
  completedSales.forEach(s => { payBreakdown[s.payment_method] = (payBreakdown[s.payment_method] || 0) + parseFloat(s.total || 0) })

  return (
    <div className="reports-page">
      <div className="topbar no-print">
        <div className="flex items-center gap-4">
          <div className="topbar-title">Reports</div>
          <div className="report-tabs">
            <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Sales Report</button>
            <button className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>Items Report</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['today', 'week', 'month', 'custom'].map(p => (
            <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-1">
              <input type="date" className="form-input" style={{ width: 130, padding: '4px 8px', fontSize: 12 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-muted text-xs">to</span>
              <input type="date" className="form-input" style={{ width: 130, padding: '4px 8px', fontSize: 12 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          )}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
          <div className="flex items-center gap-1">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEmailModal(true)}>📧 Email PDF</button>
            <button className="btn btn-primary btn-sm" onClick={() => handlePrint()}>🖨️ Print Report</button>
          </div>
        </div>
      </div>

      <div className="page-content" ref={reportRef}>
        <div className="print-header only-print">
           <h2>{activeBranch?.name} — {activeTab === 'sales' ? 'Sales Summary Report' : 'Items & Stock Valuation Report'}</h2>
           <p>Period: {period.toUpperCase()} ({getPeriodDates().from} to {getPeriodDates().to})</p>
           <hr style={{ margin: '12px 0' }} />
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> : (
          <div className="report-body">
            {activeTab === 'sales' ? (
              <div className="sales-report-content">
                <div className="report-stats-grid">
                   <div className="rep-stat">
                      <label>Total Revenue</label>
                      <div className="value">KSh {revenue.toLocaleString()}</div>
                   </div>
                   <div className="rep-stat">
                      <label>Total Transactions</label>
                      <div className="value">{completedSales.length}</div>
                   </div>
                   <div className="rep-stat">
                      <label>Average Ticket</label>
                      <div className="value">KSh {(completedSales.length ? revenue / completedSales.length : 0).toLocaleString()}</div>
                   </div>
                </div>

                <div className="card mt-6">
                  <div className="card-header"><div className="card-title">Sales by Item</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>#</th><th>Item Name</th><th className="text-center">Qty Sold</th><th className="text-right">Revenue</th></tr></thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr key={p.name}>
                            <td className="text-muted">{i+1}</td>
                            <td className="font-semibold">{p.name}</td>
                            <td className="text-center font-medium">{p.qty}</td>
                            <td className="text-right font-bold text-primary">KSh {p.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card mt-6">
                   <div className="card-header"><div className="card-title">Payment Method Breakdown</div></div>
                   <div className="table-wrap">
                     <table>
                        <thead><tr><th>Method</th><th className="text-right">Total Amount</th><th className="text-right">% of Revenue</th></tr></thead>
                        <tbody>
                          {Object.entries(payBreakdown).map(([method, amount]) => (
                            <tr key={method}>
                              <td style={{ textTransform: 'capitalize' }}>{method}</td>
                              <td className="text-right font-semibold">KSh {amount.toLocaleString()}</td>
                              <td className="text-right text-muted">{((amount / (revenue || 1)) * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                </div>
              </div>
            ) : (
              <div className="items-report-content">
                <div className="report-stats-grid">
                   <div className="rep-stat">
                      <label>Total Inventory Valuation</label>
                      <div className="value text-success">KSh {parseFloat(stockReport?.total_valuation || 0).toLocaleString()}</div>
                   </div>
                   <div className="rep-stat">
                      <label>Tracked Items</label>
                      <div className="value">{stockReport?.items?.length || 0}</div>
                   </div>
                </div>

                <div className="card mt-6">
                   <div className="card-header"><div className="card-title">Stock Movement & Valuation</div></div>
                   <div className="table-wrap">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Item Details</th>
                            <th className="text-center">Opening</th>
                            <th className="text-center">Stock In</th>
                            <th className="text-center">Stock Out</th>
                            <th className="text-center">Closing</th>
                            <th className="text-right">Valuation (Cost)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockReport?.items?.map((item: any) => (
                            <tr key={item.sku}>
                              <td>
                                <div className="font-semibold">{item.product_name}</div>
                                <div className="text-xs text-muted">{item.sku} · {item.category}</div>
                              </td>
                              <td className="text-center font-medium">{item.opening} {item.unit}</td>
                              <td className="text-center text-success font-medium">+{item.stock_in}</td>
                              <td className="text-center text-error font-medium">-{item.stock_out}</td>
                              <td className="text-center font-bold">{item.closing} {item.unit}</td>
                              <td className="text-right font-bold">KSh {parseFloat(item.valuation).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            )}
            
            <div className="print-footer only-print" style={{ marginTop: 40, fontSize: 11, color: '#666', textAlign: 'center' }}>
               Generated on {new Date().toLocaleString()} · Connvo-POS Reporting
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Email Report</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEmailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>The PDF report will be sent directly to the email provided below.</p>
              <div className="form-group">
                <label className="form-label">Recipient Email Address</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. manager@example.com" 
                  value={emailValue} 
                  onChange={e => setEmailValue(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEmailReport} disabled={emailLoading}>
                {emailLoading ? <span className="spinner" /> : '📧 Send Email Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .reports-page { padding-bottom: 40px; }
        .report-tabs {
          display: flex; background: var(--bg); padding: 4px; border-radius: 10px;
        }
        .tab-btn {
          border: none; background: none; padding: 6px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: var(--text-3); cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active { background: white; color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        
        .loading-state { padding: 80px; text-align: center; }
        
        .report-stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;
        }
        .rep-stat {
          background: white; padding: 20px; border-radius: 16px; border: 1px solid var(--border);
        }
        .rep-stat label { font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; }
        .rep-stat .value { font-size: 24px; font-weight: 800; color: var(--text); margin-top: 4px; }
        
        .only-print { display: none; }
        
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .reports-page { padding: 0; background: white; }
          .page-content { padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; }
          .table-wrap { overflow: visible !important; }
          table { width: 100% !important; border-collapse: collapse; }
          th { background: #f0f0f0 !important; color: black !important; }
          td, th { border: 1px solid #ddd; padding: 8px !important; font-size: 10pt !important; }
          .report-stats-grid { display: flex; gap: 20px; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; }
          .rep-stat { border: none; padding: 0; flex: 1; text-align: center; }
          .rep-stat .value { font-size: 16pt; color: black; }
        }
      `}</style>
    </div>
  )
}
