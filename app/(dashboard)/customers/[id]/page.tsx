'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { customerApi } from '@/lib/api'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params?.id as string

  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const printRef = useRef<HTMLDivElement>(null)

  const [customer, setCustomer] = useState<any>(null)
  const [statement, setStatement] = useState<any>(null)
  
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingStat, setLoadingStat] = useState(false)

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Statement-${customer?.name || ''}` })

  const loadCustomer = async () => {
    try {
      if (!activeBranch) return
      const res = await customerApi.list({ branch: activeBranch.id })
      const data = (res.results || res).find((c: any) => c.id === customerId)
      if (data) setCustomer(data)
      else addToast('Customer not found', 'error')
    } catch(e) {
      addToast('Failed to load customer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStatement = async () => {
    setLoadingStat(true)
    try {
      if (!customerId) return;
      const res = await customerApi.statement(customerId, dateFrom, dateTo)
      setStatement(res)
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoadingStat(false)
    }
  }

  useEffect(() => {
    if (!customerId) return;
    loadCustomer()
    loadStatement()
    // eslint-disable-next-line
  }, [customerId, activeBranch])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!customer) return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">Customer not found</div></div></div>

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Customer Details — {customer.name}</div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.history.back()}>← Back</button>
          <button className="btn btn-primary" onClick={() => handlePrint()}>🖨️ Print Statement</button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid col-2" style={{ gap: 24, marginBottom: 24, gridTemplateColumns: 'minmax(250px, 1fr) 2fr' }}>
          {/* Customer Info */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 20 }}>{customer.name[0]}</div>
              <div>
                <div className="font-bold text-lg">{customer.name}</div>
                <div className="text-muted text-sm">{customer.phone || 'No phone'}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-muted mb-1">Email</div>
              <div className="font-semibold">{customer.email || '—'}</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-muted mb-1">Address</div>
              <div className="font-semibold">{customer.address || '—'}</div>
            </div>
            <div className="mb-4 border-t pt-4">
              <div className="text-sm text-muted mb-1">Credit Limit</div>
              <div className="font-semibold text-primary">KSh {parseFloat(customer.credit_limit || 0).toLocaleString()}</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-muted mb-1">Available Credit</div>
              <div className="font-semibold text-green-600">KSh {parseFloat(customer.available_credit || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Statement View */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-3 border-b p-4" style={{ background: 'var(--surface-2)' }}>
              <input type="date" className="form-input" style={{ width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-muted text-sm">to</span>
              <input type="date" className="form-input" style={{ width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              <button className="btn btn-secondary btn-sm" onClick={loadStatement} disabled={loadingStat}>{loadingStat ? '...' : 'Filter'}</button>
            </div>

            <div style={{ padding: 24 }} ref={printRef} className="print-container">
              <div style={{ display: 'none' }} className="print-header">
                <h2>{activeBranch?.name}</h2>
                <div>Customer Statement: {customer.name}</div>
                <div>Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</div>
                {dateFrom || dateTo ? <div>Period: {dateFrom ? format(new Date(dateFrom), 'dd/MM/yyyy') : 'Start'} to {dateTo ? format(new Date(dateTo), 'dd/MM/yyyy') : 'Now'}</div> : null}
                <hr style={{ margin: '10px 0' }} />
              </div>

              <div className="flex gap-4 mb-6 stat-grid">
                <div className="stat-card" style={{ flex: 1, padding: 16 }}>
                  <div className="stat-label">Opening Balance</div>
                  <div className="stat-value text-xl">KSh {parseFloat(statement?.opening_balance || 0).toLocaleString()}</div>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: 16 }}>
                  <div className="stat-label">Closing Balance</div>
                  <div className="stat-value text-xl text-primary">KSh {parseFloat(statement?.closing_balance || 0).toLocaleString()}</div>
                </div>
              </div>

              {loadingStat ? (
                <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : statement?.statement?.length === 0 ? (
                <div className="empty-state py-8"><div className="empty-state-text">No records in this period</div></div>
              ) : (
                <div className="table-wrap">
                  <table style={{ width: '100%', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 8px' }}>Date</th>
                        <th style={{ padding: '10px 8px' }}>Ref</th>
                        <th style={{ padding: '10px 8px' }}>Description</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Debit (KSh)</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Credit (KSh)</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement?.statement?.map((e: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '10px 8px', color: 'var(--text-3)' }}>{e.date ? format(new Date(e.date), 'dd/MM/yy HH:mm') : ''}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{e.reference}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-2)' }}>{e.description}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--error)' }}>{parseFloat(e.debit) > 0 ? parseFloat(e.debit).toLocaleString() : ''}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--success)' }}>{parseFloat(e.credit) > 0 ? parseFloat(e.credit).toLocaleString() : ''}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(e.balance).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .print-header { display: block !important; margin-bottom: 20px; }
          .print-header h2 { margin: 0 0 5px 0; font-size: 20px; }
          table { width: 100% !important; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #ddd; padding: 8px; }
          .stat-grid { display: flex !important; gap: 20px; }
          .stat-card { border: 1px solid #ddd !important; border-radius: 4px; padding: 10px; }
        }
      `}} />
    </>
  )
}
