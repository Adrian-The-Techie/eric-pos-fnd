'use client'
import { forwardRef } from 'react'
import { format } from 'date-fns'

interface ReceiptTemplateProps {
  data: any
}

const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(({ data }, ref) => {
  if (!data) return null
  const { sale, receipt_number, printed_at, branchSettings } = data
  const bs = branchSettings || {}
  const items = sale?.items || []
  const subtotal = parseFloat(sale?.subtotal || 0)
  const discount = parseFloat(sale?.discount_amount || 0)
  const tax = parseFloat(sale?.tax_amount || 0)
  const total = parseFloat(sale?.total || 0)

  return (
    <div ref={ref} className="receipt-wrap" style={{ maxWidth: 310, margin: '0 auto' }}>
      {/* Header */}
      <div className="receipt-header">
        <div style={{ fontSize: 16, fontWeight: 700 }}>{bs.business_name || 'Connvo-POS'}</div>
        {bs.address_line && <div style={{ fontSize: 11 }}>{bs.address_line}</div>}
        {bs.phone_display && <div style={{ fontSize: 11 }}>Tel: {bs.phone_display}</div>}
        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }}>RECEIPT</div>
      </div>

      <hr className="receipt-divider" />

      {/* Meta */}
      <div className="receipt-row"><span>Receipt #</span><span>{receipt_number}</span></div>
      <div className="receipt-row"><span>Sale #</span><span>{sale?.sale_number}</span></div>
      <div className="receipt-row"><span>Date</span><span>{printed_at ? format(new Date(printed_at), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
      <div className="receipt-row"><span>Cashier</span><span>{sale?.created_by_name || 'Staff'}</span></div>
      <div className="receipt-row"><span>Customer</span><span>{sale?.customer_name || 'Walk-in'}</span></div>
      <div className="receipt-row"><span>Payment</span><span style={{ textTransform: 'capitalize' }}>{sale?.payment_method || '—'}</span></div>
      {sale?.payment_reference && (
        <div className="receipt-row"><span style={{ fontSize: 10 }}>Ref #</span><span style={{ fontSize: 10 }}>{sale.payment_reference}</span></div>
      )}

      <hr className="receipt-divider" />

      {/* Items */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 8px', fontWeight: 700, fontSize: 11 }}>
          <span>Item</span><span>Qty</span><span style={{ textAlign: 'right' }}>Amount</span>
        </div>
        <hr className="receipt-divider" />
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '2px 8px', fontSize: 11 }}>
            <span>{item.product_name}</span>
            <span>{item.quantity}</span>
            <span style={{ textAlign: 'right' }}>
              {bs.currency_symbol || 'KSh'} {parseFloat(item.line_total).toLocaleString()}
            </span>
            <span style={{ color: '#666', fontSize: 10 }}>@ {bs.currency_symbol || 'KSh'}{parseFloat(item.unit_price).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <hr className="receipt-divider" />

      {/* Totals */}
      <div className="receipt-row"><span>Subtotal</span><span>{bs.currency_symbol || 'KSh'} {subtotal.toLocaleString()}</span></div>
      {discount > 0 && <div className="receipt-row"><span>Discount</span><span>- {bs.currency_symbol || 'KSh'} {discount.toLocaleString()}</span></div>}
      {tax > 0 && <div className="receipt-row"><span>{bs.tax_name || 'Tax'} ({bs.tax_rate || 0}%)</span><span>{bs.currency_symbol || 'KSh'} {tax.toLocaleString()}</span></div>}
      <hr className="receipt-divider" />
      <div className="receipt-row receipt-total">
        <span>TOTAL</span>
        <span>{bs.currency_symbol || 'KSh'} {total.toLocaleString()}</span>
      </div>
      {sale?.payment_method === 'cash' && (
        <>
          <div className="receipt-row"><span>Cash Tendered</span><span>{bs.currency_symbol || 'KSh'} {parseFloat(sale?.amount_tendered || 0).toLocaleString()}</span></div>
          <div className="receipt-row"><span>Change</span><span>{bs.currency_symbol || 'KSh'} {parseFloat(sale?.change_amount || 0).toLocaleString()}</span></div>
        </>
      )}

      {/* Footer */}
      <div className="receipt-footer">
        <hr className="receipt-divider" />
        <div>{bs.receipt_footer || 'Thank you for your business!'}</div>
        <div style={{ marginTop: 4, fontSize: 10 }}>Powered by Connvo-POS</div>
      </div>
    </div>
  )
})

ReceiptTemplate.displayName = 'ReceiptTemplate'
export default ReceiptTemplate
