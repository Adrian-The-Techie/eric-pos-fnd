'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { inventoryApi, salesApi, customerApi } from '@/lib/api'
import { useReactToPrint } from 'react-to-print'
import ReceiptTemplate from '@/components/pos/ReceiptTemplate'

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  discount: number
  line_total: number
  unit: string
}

export default function POSPage() {
  const { activeBranch, user } = useAuthStore()
  const { addToast } = useToastStore()
  const receiptRef = useRef<HTMLDivElement>(null)

  // Product data
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [branchProducts, setBranchProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [walkinCustomer, setWalkinCustomer] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [note, setNote] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [printReceipt, setPrintReceipt] = useState<any>(null)
  const [showHeldModal, setShowHeldModal] = useState(false)
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [holdLabel, setHoldLabel] = useState('')
  const [heldSales, setHeldSales] = useState<any[]>([])
  const [creditDueDate, setCreditDueDate] = useState('')
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null)
  const [branchSettings, setBranchSettings] = useState<any>({})
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)

  // Load data
  useEffect(() => {
    if (!activeBranch) return
    Promise.all([
      inventoryApi.categories(),
      inventoryApi.branchProducts(activeBranch.id),
      customerApi.list({ branch: activeBranch.id }),
    ]).then(([cats, bps, custs]) => {
      setCategories((cats as unknown as any).results || cats)
      const bpsArray = (bps as unknown as any).results || bps
      setBranchProducts(bpsArray)
      const allProducts = bpsArray.map((bp: any) => ({
        ...bp.product,
        stock_quantity: bp.stock_quantity,
        effective_price: bp.effective_price,
        is_low_stock: bp.is_low_stock,
        is_available: bp.is_available,
        bp_id: bp.id,
      }))
      setProducts(allProducts)
      const cusList = (custs as any).results || custs
      setCustomers(cusList)
      const walkin = cusList.find((c: any) => c.is_walkin)
      setWalkinCustomer(walkin || null)
      setSelectedCustomer(walkin || null)
    })
    // Load branch settings for receipt
    import('@/lib/api').then(({ branchApi }) => {
      branchApi.getSettings(activeBranch.id).then(setBranchSettings).catch(() => {})
    })
  }, [activeBranch])

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${printReceipt?.receipt_number || ''}`,
  })

  // Filtered products
  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch && p.is_available !== false
  })

  // Cart helpers
  const addToCart = (product: any) => {
    if (!product.is_service && product.stock_quantity <= 0) {
      addToast('Out of stock', 'error'); return
    }
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id)
      if (idx >= 0) {
        const updated = [...prev]
        const item = { ...updated[idx] }
        item.quantity += 1
        item.line_total = item.unit_price * item.quantity - item.discount
        updated[idx] = item
        return updated
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: parseFloat(product.effective_price || product.price),
        quantity: 1,
        discount: 0,
        line_total: parseFloat(product.effective_price || product.price),
        unit: product.unit,
      }]
    })
  }

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev]
      const item = { ...updated[idx] }
      item.quantity = Math.max(1, item.quantity + delta)
      item.line_total = item.unit_price * item.quantity - item.discount
      updated[idx] = item
      return updated
    })
  }

  const setQty = (idx: number, val: string) => {
    const qty = Math.max(1, parseFloat(val) || 1)
    setCart(prev => {
      const updated = [...prev]
      const item = { ...updated[idx] }
      item.quantity = qty
      item.line_total = item.unit_price * item.quantity - item.discount
      updated[idx] = item
      return updated
    })
  }

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx))

  const subtotal = cart.reduce((a, i) => a + i.line_total, 0)
  const total = Math.max(0, subtotal - discountAmount)
  const change = Math.max(0, parseFloat(amountTendered || '0') - total)

  // Build sale payload
  const buildSalePayload = (status: string, payMethod?: string) => ({
    branch: activeBranch!.id,
    customer: selectedCustomer?.id || walkinCustomer?.id,
    status,
    payment_method: payMethod || paymentMethod,
    discount_amount: discountAmount,
    amount_tendered: parseFloat(amountTendered || '0'),
    payment_reference: paymentReference,
    note,
    items: cart.map(i => ({
      product: i.product_id,
      unit_price: i.unit_price,
      quantity: i.quantity,
      discount: i.discount,
    })),
  })

  const clearCart = () => {
    setCart([]); setDiscountAmount(0); setAmountTendered(''); setNote('')
    setSelectedCustomer(walkinCustomer); setCurrentSaleId(null)
    setPaymentMethod('cash'); setPaymentReference('')
  }

  // Save sale
  const handleSave = async (andPrint = false) => {
    if (!cart.length) { addToast('Cart is empty', 'error'); return }
    if (!activeBranch) { addToast('No branch selected', 'error'); return }
    if ((paymentMethod === 'card' || paymentMethod === 'mobile') && !paymentReference) {
      addToast(`Reference number is required for ${paymentMethod} payments`, 'error'); return
    }
    setLoading(true)
    try {
      const sale = await salesApi.create(buildSalePayload('completed'))
      setCurrentSaleId(sale.id)
      addToast(`Sale ${sale.sale_number} saved!`)
      if (andPrint) {
        const receipt = await salesApi.createReceipt(sale.id)
        setPrintReceipt({ ...receipt, sale, branchSettings })
        setTimeout(() => handlePrint(), 300)
      }
      clearCart()
    } catch (err: any) {
      addToast(err.message || 'Failed to save sale', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Hold sale
  const handleHold = async () => {
    if (!cart.length) { addToast('Cart is empty', 'error'); return }
    setLoading(true)
    try {
      const sale = await salesApi.create(buildSalePayload('active'))
      await salesApi.hold(sale.id, holdLabel || 'Held Order')
      addToast('Sale held successfully')
      setShowHoldModal(false); setHoldLabel('')
      clearCart()
    } catch (err: any) {
      addToast(err.message || 'Failed to hold sale', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load held sales
  const loadHeld = async () => {
    if (!activeBranch) return
    const held = await salesApi.heldList(activeBranch.id)
    setHeldSales((held as any).results || held)
    setShowHeldModal(true)
  }

  // Retrieve held sale
  const retrieveHeld = async (heldId: number) => {
    const sale = await salesApi.retrieveHeld(heldId)
    setCart(sale.items.map((i: any) => ({
      product_id: i.product,
      product_name: i.product_name,
      unit_price: parseFloat(i.unit_price),
      quantity: parseFloat(i.quantity),
      discount: parseFloat(i.discount),
      line_total: parseFloat(i.line_total),
      unit: 'pcs',
    })))
    setCurrentSaleId(sale.id)
    setShowHeldModal(false)
    addToast('Held sale retrieved')
  }

  // Credit sale
  const handleCredit = async () => {
    if (!selectedCustomer || selectedCustomer.is_walkin) {
      addToast('Select a named customer for credit sales', 'error'); return
    }
    if (!cart.length) { addToast('Cart is empty', 'error'); return }
    setLoading(true)
    try {
      const sale = await salesApi.create(buildSalePayload('active', 'credit'))
      await salesApi.createCredit({ sale_id: sale.id, due_date: creditDueDate || null })
      addToast('Credit sale created')
      setShowCreditModal(false); setCreditDueDate('')
      clearCart()
    } catch (err: any) {
      addToast(err.message || 'Failed to create credit sale', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="topbar no-print">
        <div className="topbar-title">Point of Sale</div>
        <div className="flex items-center gap-2">
          <span className="badge badge-primary">{activeBranch?.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={loadHeld}>📋 Held Orders</button>
        </div>
      </div>

      <div className="pos-layout" style={{ height: 'calc(100vh - var(--header-height))' }}>
        {/* LEFT: Product grid */}
        <div className="pos-left">
          {/* Search + category tabs */}
          <div className="search-bar" style={{ marginBottom: 14 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="cat-tabs" style={{ marginBottom: 14 }}>
            <button className={`cat-tab ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>All</button>
            {categories.map(c => (
              <button key={c.id} className={`cat-tab ${activeCategory === c.id ? 'active' : ''}`} onClick={() => setActiveCategory(c.id)}>{c.icon} {c.name}</button>
            ))}
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-text">No products found</div>
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map(p => (
                <div
                  key={p.id}
                  className={`product-card ${!p.is_service && p.stock_quantity <= 0 ? 'out-of-stock' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  <div className="product-img-placeholder">
                    <img src="/assets/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.3 }} />
                  </div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-price">KSh {parseFloat(p.effective_price || p.price).toLocaleString()}</div>
                  {!p.is_service && (
                    <div className="product-category" style={{ color: p.stock_quantity <= 5 ? 'var(--error)' : 'var(--text-4)' }}>
                      Stock: {p.stock_quantity}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div className="pos-right">
          <div className="cart-header">
            <div className="cart-title">Current Order</div>
            {/* Customer selector */}
            <select
              className="form-select" style={{ marginTop: 8, fontSize: 12 }}
              value={selectedCustomer?.id || ''}
              onChange={e => {
                const c = customers.find(c => c.id === e.target.value)
                setSelectedCustomer(c || walkinCustomer)
              }}
            >
              <option value="">— Select Customer —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.is_walkin ? ' (Walk-in)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Cart items */}
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>🛒</div>
                <div className="empty-state-text">Cart is empty</div>
                <div className="empty-state-sub">Click a product to add</div>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cart-item-name truncate">{item.product_name}</div>
                    <div className="cart-item-price">KSh {item.unit_price.toLocaleString()} × {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="qty-btn" onClick={() => updateQty(idx, -1)}>−</button>
                    <input 
                      type="number" 
                      className="qty-input" 
                      value={item.quantity} 
                      onChange={e => setQty(idx, e.target.value)}
                      onFocus={e => e.target.select()}
                    />
                    <button className="qty-btn" onClick={() => updateQty(idx, 1)}>+</button>
                    <button className="btn-ghost btn-icon" style={{ padding: 4, fontSize: 14, color: 'var(--error)' }} onClick={() => removeItem(idx)}>🗑</button>
                  </div>
                  <div style={{ minWidth: 70, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                    KSh {item.line_total.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop/Tab Totals & Actions (Hidden on small mobile via CSS) */}
          <div className="pos-actions-desktop">
            <div className="cart-totals">
              <div className="totals-row">
                <span className="totals-label">Subtotal</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="totals-row">
                <span className="totals-label">Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0"
                    className="form-input"
                    style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                    value={discountAmount}
                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="totals-row total">
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>KSh {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="cart-actions">
              <div className="payment-methods">
                {['cash', 'card', 'mobile', 'credit'].map(m => (
                  <button key={m} className={`pay-btn ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
                    {m === 'cash' ? '💵' : m === 'card' ? '💳' : m === 'mobile' ? '📱' : '📒'} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <input
                    type="number" placeholder="Amount tendered"
                    className="form-input" style={{ flex: 1, fontSize: 12 }}
                    value={amountTendered}
                    onChange={e => setAmountTendered(e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    Change: <b style={{ color: 'var(--primary)' }}>KSh {change.toLocaleString()}</b>
                  </span>
                </div>
              )}

              {(paymentMethod === 'card' || paymentMethod === 'mobile') && (
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <input
                    type="text" placeholder="Trans. Reference (Required)"
                    className="form-input" style={{ flex: 1, fontSize: 13, border: !paymentReference ? '1px solid var(--error-light)' : '' }}
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                  />
                </div>
              )}
              <div className="action-grid">
                <button className="btn btn-secondary" onClick={() => setShowHoldModal(true)} disabled={!cart.length}>⏸ Hold</button>
                <button className="btn btn-secondary" onClick={() => setShowCreditModal(true)} disabled={!cart.length}>📒 Credit</button>
              </div>
              <div className="action-grid" style={{ marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={loading || !cart.length}>
                  {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '💾'} Save
                </button>
                <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={loading || !cart.length} style={{ background: 'var(--primary-dark)' }}>
                  🖨️ Save & Print
                </button>
              </div>
              {cart.length > 0 && <button className="btn btn-danger btn-block btn-sm" style={{ marginTop: 8 }} onClick={clearCart}>🗑 Clear Cart</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Checkout Trigger */}
      <div className="mobile-checkout-bar only-mobile">
        <div className="flex-col">
          <span className="text-xs text-muted" style={{ fontWeight: 600 }}>{cart.length} Items</span>
          <span className="font-bold text-primary" style={{ fontSize: 18 }}>KSh {total.toLocaleString()}</span>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowCheckoutModal(true)} disabled={!cart.length}>
          Checkout & Pay ➔
        </button>
      </div>

      {/* Checkout Modal (Mobile Only UI) */}
      {showCheckoutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ marginTop: 'auto', borderRadius: '24px 24px 0 0', maxWidth: '100%' }}>
            <div className="modal-header">
              <div className="modal-title">Payment Summary</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCheckoutModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
               <div className="totals-row" style={{ marginBottom: 8 }}>
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold">KSh {subtotal.toLocaleString()}</span>
               </div>
               <div className="totals-row" style={{ marginBottom: 16 }}>
                  <span className="text-muted">Discount</span>
                  <input
                    type="number" className="form-input" style={{ width: 100, textAlign: 'right' }}
                    value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
               </div>
               <div className="flex justify-between items-center" style={{ background: 'var(--primary-light)', padding: '12px 16px', borderRadius: 12, marginBottom: 20 }}>
                  <span className="font-bold">Total Amount</span>
                  <span className="font-bold" style={{ fontSize: 24, color: 'var(--primary)' }}>KSh {total.toLocaleString()}</span>
               </div>

               <label className="form-label">Payment Method</label>
               <div className="payment-methods" style={{ marginBottom: 16 }}>
                  {['cash', 'card', 'mobile', 'credit'].map(m => (
                    <button key={m} className={`pay-btn ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)} style={{ padding: '10px' }}>
                      {m === 'cash' ? '💵' : m === 'card' ? '💳' : m === 'mobile' ? '📱' : '📒'} <br/> {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
               </div>

               {paymentMethod === 'cash' && (
                  <div className="form-group">
                    <label className="form-label">Amount Tendered</label>
                    <input type="number" className="form-input" style={{ fontSize: 18, fontWeight: 700 }} value={amountTendered} onChange={e => setAmountTendered(e.target.value)} autoFocus />
                    <div style={{ marginTop: 8, textAlign: 'right' }}>Change: <b className="text-primary">KSh {change.toLocaleString()}</b></div>
                  </div>
               )}

               {(paymentMethod === 'card' || paymentMethod === 'mobile') && (
                  <div className="form-group">
                    <label className="form-label">Reference Number</label>
                    <input type="text" className="form-input" placeholder="e.g. MPESA-ABC..." value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
                  </div>
               )}
            </div>
            <div className="modal-footer" style={{ flexDirection: 'column', gap: 10 }}>
                 <div className="action-grid" style={{ width: '100%' }}>
                    <button className="btn btn-secondary" onClick={() => { setShowCheckoutModal(false); setShowHoldModal(true); }}>⏸ Hold</button>
                    <button className="btn btn-secondary" onClick={() => { setShowCheckoutModal(false); setShowCreditModal(true); }}>📒 Credit</button>
                 </div>
                 <div className="action-grid" style={{ width: '100%', marginTop: 4 }}>
                    <button className="btn btn-primary btn-lg" onClick={() => { handleSave(false); setShowCheckoutModal(false); }} disabled={loading}>
                      {loading ? <span className="spinner" /> : '💾 Save Only'}
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={() => { handleSave(true); setShowCheckoutModal(false); }} disabled={loading} style={{ background: 'var(--primary-dark)' }}>
                      {loading ? <span className="spinner" /> : '🖨️ Save & Print'}
                    </button>
                 </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden receipt for printing */}
      <div style={{ display: 'none' }}>
        <ReceiptTemplate ref={receiptRef} data={printReceipt} />
      </div>

      {/* Hold modal */}
      {showHoldModal && (
        <div className="modal-overlay" onClick={() => setShowHoldModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Hold Order</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowHoldModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Add a label to identify this held order (e.g., "Table 5" or a customer name).</p>
              <div className="form-group">
                <label className="form-label">Label (optional)</label>
                <input className="form-input" placeholder="e.g. Table 5" value={holdLabel} onChange={e => setHoldLabel(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHoldModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleHold} disabled={loading}>⏸ Hold Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Held orders modal */}
      {showHeldModal && (
        <div className="modal-overlay" onClick={() => setShowHeldModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Held Orders</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowHeldModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {heldSales.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">⏸</div><div className="empty-state-text">No held orders</div></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Label</th><th>Sale #</th><th>Items</th><th>Total</th><th>Held At</th><th></th></tr></thead>
                    <tbody>
                      {heldSales.map(h => (
                        <tr key={h.id}>
                          <td className="font-semibold">{h.label || 'Unnamed'}</td>
                          <td className="text-primary">{h.sale?.sale_number}</td>
                          <td>{h.sale?.items?.length || 0}</td>
                          <td className="font-bold">KSh {parseFloat(h.sale?.total || 0).toLocaleString()}</td>
                          <td className="text-muted text-sm">{h.held_at ? new Date(h.held_at).toLocaleTimeString() : ''}</td>
                          <td><button className="btn btn-primary btn-sm" onClick={() => retrieveHeld(h.id)}>Retrieve</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit modal */}
      {showCreditModal && (
        <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Credit Sale</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {(!selectedCustomer || selectedCustomer.is_walkin) && (
                <div style={{ background: 'var(--warning-light)', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                  ⚠️ Please select a named customer above before creating a credit sale.
                </div>
              )}
              <div className="totals-row total" style={{ marginBottom: 16 }}>
                <span>Total to Credit</span>
                <span style={{ color: 'var(--primary)' }}>KSh {total.toLocaleString()}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date (optional)</label>
                <input type="date" className="form-input" value={creditDueDate} onChange={e => setCreditDueDate(e.target.value)} />
              </div>
              {selectedCustomer && !selectedCustomer.is_walkin && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px' }}>
                  Customer: <b>{selectedCustomer.name}</b> · Available Credit: <b>KSh {parseFloat(selectedCustomer.available_credit || 0).toLocaleString()}</b>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCredit} disabled={loading || !selectedCustomer || selectedCustomer.is_walkin}>📒 Confirm Credit</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
