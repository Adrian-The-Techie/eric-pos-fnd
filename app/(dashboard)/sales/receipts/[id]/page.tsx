'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuthStore, useToastStore } from '@/lib/store'
import { salesApi } from '@/lib/api'
import { format } from 'date-fns'
import ReceiptTemplate from '@/components/pos/ReceiptTemplate'
import { useReactToPrint } from 'react-to-print'

export default function ReceiptDetailPage() {
  const params = useParams()
  const receiptId = params?.id as string

  const { activeBranch, user } = useAuthStore()
  const { addToast } = useToastStore()
  const receiptRef = useRef<HTMLDivElement>(null)
  const [receipt, setReceipt] = useState<any>(null)
  const [branchSettings, setBranchSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)

  const handlePrint = useReactToPrint({ contentRef: receiptRef, documentTitle: `Receipt-${receipt?.receipt_number || ''}` })

  const handleVoid = async () => {
    if (user?.role === 'staff') return;
    if (!receipt?.sale?.id) return;
    if (!confirm('Are you sure you want to return/void this sale?')) return;
    try {
      await salesApi.void(receipt.sale.id);
      addToast('Sale voided successfully');
      setReceipt({ ...receipt, sale: { ...receipt.sale, status: 'voided' } });
    } catch (e: any) {
      addToast(e.message || 'Failed to void sale', 'error');
    }
  }

  useEffect(() => {
    if (!receiptId) return;

    salesApi.getReceipt(receiptId).then(r => {
      setReceipt(r)
      setLoading(false)
    }).catch(() => { addToast('Receipt not found', 'error'); setLoading(false) })

    if (activeBranch) {
      import('@/lib/api').then(({ branchApi }) => {
        branchApi.getSettings(activeBranch.id).then(setBranchSettings).catch(() => {})
      })
    }
  }, [receiptId, activeBranch])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  if (!receipt) return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-text">Receipt not found</div></div></div>

  const { sale } = receipt;
  const items = sale?.items || [];
  const subtotal = parseFloat(sale?.subtotal || 0);
  const discount = parseFloat(sale?.discount_amount || 0);
  const tax = parseFloat(sale?.tax_amount || 0);
  const total = parseFloat(sale?.total || 0);

  return (
    <>
      <div className="topbar no-print">
        <div className="topbar-title">Sale Details — {sale?.sale_number}</div>
        <div className="flex items-center gap-2">
          {sale?.status !== 'voided' && user?.role !== 'staff' && (
            <button className="btn btn-danger" onClick={handleVoid}>↩️ Return (Void)</button>
          )}
          <button className="btn btn-primary" onClick={() => handlePrint()}>🖨️ Print Receipt</button>
        </div>
      </div>
      
      <div className="page-content bg-background">
        <div className="card shadow-md border border-border" style={{ padding: '24px', maxWidth: 900, margin: '0 auto', background: 'var(--surface)' }}>
          {/* Invoice Header */}
          <div className="flex items-start justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--primary)' }}>{branchSettings?.business_name || 'Connvo-POS'}</h1>
              <div className="text-muted" style={{ marginTop: 8 }}>{branchSettings?.address_line}</div>
              <div className="text-muted">{branchSettings?.phone_display}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: 24, margin: 0, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-2)' }}>Receipt</h2>
              <div style={{ marginTop: 8 }}><span className="text-muted">Receipt #:</span> <strong>{receipt.receipt_number}</strong></div>
              <div><span className="text-muted">Sale #:</span> <strong>{sale?.sale_number}</strong></div>
              <div><span className="text-muted">Date:</span> {format(new Date(receipt.printed_at || sale?.created_at), 'dd MMM yyyy, HH:mm')}</div>
              <div style={{ marginTop: 12 }}>
                {(() => {
                  switch (sale?.status) {
                    case 'voided': return <span className="badge badge-red" style={{ fontSize: 13, padding: '6px 12px' }}>VOIDED</span>;
                    case 'credited': return <span className="badge badge-warning" style={{ fontSize: 13, padding: '6px 12px' }}>CREDITED</span>;
                    case 'active': return <span className="badge badge-primary" style={{ fontSize: 13, padding: '6px 12px' }}>ACTIVE</span>;
                    case 'held': return <span className="badge badge-secondary" style={{ fontSize: 13, padding: '6px 12px' }}>HELD</span>;
                    case 'completed': return <span className="badge badge-green" style={{ fontSize: 13, padding: '6px 12px' }}>COMPLETED</span>;
                    default: return <span className="badge" style={{ fontSize: 13, padding: '6px 12px', textTransform: 'uppercase' }}>{sale?.status || 'UNKNOWN'}</span>;
                  }
                })()}
              </div>
            </div>
          </div>

          {/* Customer & Meta Info */}
          <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 40 }}>
              <div>
                <dt className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Billed To</dt>
                <dd className="font-semibold" style={{ margin: 0, fontSize: 15 }}>{sale?.customer_name || 'Walk-in Customer'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Cashier</dt>
                <dd className="font-semibold" style={{ margin: 0, fontSize: 15 }}>{sale?.created_by_name || 'Staff'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Payment Method</dt>
                <dd className="font-semibold" style={{ margin: 0, fontSize: 15, textTransform: 'capitalize' }}>
                  {sale?.payment_method || '—'}
                  {sale?.payment_reference && (
                    <span className="text-xs text-muted block" style={{ fontWeight: 400, marginTop: 2 }}>Ref: {sale.payment_reference}</span>
                  )}
                </dd>
              </div>
            </div>
            
            <div style={{ textAlign: 'right', background: 'var(--surface-2)', padding: '12px 20px', borderRadius: 8 }}>
              <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Amount</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>
                KSh {total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="table-wrap" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            <table style={{ margin: 0, width: '100%' }}>
              <thead style={{ background: 'var(--surface-2)' }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Price</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Discount</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.product_name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{parseFloat(item.unit_price).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: parseFloat(item.discount) > 0 ? 'var(--error)' : 'inherit' }}>
                      {parseFloat(item.discount) > 0 ? `-${parseFloat(item.discount).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{parseFloat(item.line_total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="flex justify-end mt-4">
            <div style={{ width: 300, background: 'var(--surface-2)', padding: 16, borderRadius: 8 }}>
              <div className="flex justify-between" style={{ marginBottom: 8 }}>
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold">KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 8 }}>
                <span className="text-muted">Discount</span>
                <span className="font-semibold" style={{ color: discount > 0 ? 'var(--error)' : 'inherit' }}>
                  {discount > 0 ? `- KSh ${discount.toLocaleString()}` : '0.00'}
                </span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="text-muted">Tax ({branchSettings?.tax_rate || 0}%)</span>
                <span className="font-semibold">KSh {tax.toLocaleString()}</span>
              </div>
              
              <div style={{ borderTop: '2px dashed var(--border)', margin: '12px 0' }} />
              
              <div className="flex justify-between items-center" style={{ marginBottom: sale?.payment_method === 'cash' ? 8 : 0 }}>
                <span className="font-bold" style={{ fontSize: 16 }}>Grand Total</span>
                <span className="font-bold text-primary" style={{ fontSize: 20 }}>KSh {total.toLocaleString()}</span>
              </div>

              {sale?.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between" style={{ marginBottom: 8, fontSize: 13 }}>
                    <span className="text-muted">Cash Tendered</span>
                    <span>KSh {parseFloat(sale?.amount_tendered || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span className="text-muted">Change</span>
                    <span>KSh {parseFloat(sale?.change_amount || 0).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print template - This handles the 80mm generic thermal print */}
      <div style={{ display: 'none' }}>
        <ReceiptTemplate ref={receiptRef} data={{ ...receipt, branchSettings }} />
      </div>
    </>
  )
}
