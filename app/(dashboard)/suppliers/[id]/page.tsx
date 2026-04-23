'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { inventoryApi } from '@/lib/api'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'

export default function SupplierDetailPage() {
  const params = useParams()
  const supplierId = params?.id as string

  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const printRef = useRef<HTMLDivElement>(null)

  const [supplier, setSupplier] = useState<any>(null)
  const [statement, setStatement] = useState<any>(null)
  
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingStat, setLoadingStat] = useState(false)

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Statement-${supplier?.name || ''}` })

  const loadSupplier = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/inventory/suppliers/${supplierId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSupplier(data)
    } catch(e) {
      addToast('Failed to load supplier', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStatement = async () => {
    setLoadingStat(true)
    try {
      if (!supplierId) return;
      const res = await inventoryApi.supplierStatement(supplierId, dateFrom, dateTo)
      setStatement(res)
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoadingStat(false)
    }
  }

  useEffect(() => {
    if (!supplierId) return;
    loadSupplier()
    loadStatement()
    // eslint-disable-next-line
  }, [supplierId, activeBranch])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!supplier) return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">🏢</div><div className="empty-state-text">Supplier not found</div></div></div>

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Supplier Details — {supplier.name}</div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.history.back()}>← Back</button>
          <button className="btn btn-primary" onClick={() => handlePrint()}>🖨️ Print Statement</button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid col-2" style={{ gap: 24, marginBottom: 24, gridTemplateColumns: 'minmax(250px, 1fr) 2fr' }}>
          {/* Supplier Info */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 20 }}>{supplier.name[0]}</div>
              <div>
                <div className="font-bold text-lg">{supplier.name}</div>
                <div className="text-muted text-sm">{supplier.phone || 'No phone'}</div>
              </div>
            </div>
            
            <div className="mb-4 border-t pt-4">
              <div className="text-sm text-muted mb-1">Contact Person</div>
              <div className="font-semibold">{supplier.contact_person || '—'}</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-muted mb-1">Email</div>
              <div className="font-semibold">{supplier.email || '—'}</div>
            </div>
            <div className="mb-4 border-t pt-4">
              <div className="text-sm text-muted mb-1">Address</div>
              <div className="font-semibold">{supplier.address || '—'}</div>
            </div>
            <div className="mb-4 bg-green-50 p-3 rounded-lg border border-green-100 dark:bg-green-900/10 dark:border-green-800">
              <div className="text-sm text-green-700 dark:text-green-400 mb-1">Status</div>
              <div className="font-semibold text-green-700 dark:text-green-400">{supplier.is_active ? 'Active Supplier' : 'Inactive'}</div>
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
                <div>Supplier Statement: {supplier.name}</div>
                <div>Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</div>
                {dateFrom || dateTo ? <div>Period: {dateFrom ? format(new Date(dateFrom), 'dd/MM/yyyy') : 'Start'} to {dateTo ? format(new Date(dateTo), 'dd/MM/yyyy') : 'Now'}</div> : null}
                <hr style={{ margin: '10px 0' }} />
              </div>

              <div className="flex gap-4 mb-6 stat-grid">
                <div className="stat-card" style={{ flex: 1, padding: 16 }}>
                  <div className="stat-label">Total Purchases In Period</div>
                  <div className="stat-value text-xl text-primary">KSh {parseFloat(statement?.total_purchases || 0).toLocaleString()}</div>
                </div>
              </div>

              {loadingStat ? (
                <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : statement?.records?.length === 0 ? (
                <div className="empty-state py-8"><div className="empty-state-text">No purchases in this period</div></div>
              ) : (
                <div className="table-wrap">
                  <table style={{ width: '100%', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 8px' }}>Date</th>
                        <th style={{ padding: '10px 8px' }}>GRN Ref</th>
                        <th style={{ padding: '10px 8px' }}>Description Note</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Amount (KSh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement?.records?.map((e: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '10px 8px', color: 'var(--text-3)' }}>{e.date ? format(new Date(e.date), 'dd/MM/yy HH:mm') : ''}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{e.grn_number}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-2)' }}>{e.note || '—'}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 'bold' }}>{parseFloat(e.total_amount).toLocaleString()}</td>
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
