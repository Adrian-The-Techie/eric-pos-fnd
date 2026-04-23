'use client'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { inventoryApi } from '@/lib/api'

export default function InventoryPage() {
  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const [categories, setCategories] = useState<any[]>([])
  const [branchProducts, setBranchProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals & Menus
  const [showProductModal, setShowProductModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showSubCatModal, setShowSubCatModal] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [stockItem, setStockItem] = useState<any>(null)

  // Dropdown reference
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActionsOpen(false)
      }
    }
    if (actionsOpen) document.addEventListener('mousedown', handleClickOutside)
    else document.removeEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [actionsOpen])

  // Forms
  const [pForm, setPForm] = useState({ name: '', category: '', sub_category: '', price: '', cost_price: '', unit: 'pcs', description: '', is_service: false })
  const [stockForm, setStockForm] = useState({ movement_type: 'in', quantity: '', note: '' })
  const [catForm, setCatForm] = useState({ name: '', description: '', icon: '' })
  const [subCatForm, setSubCatForm] = useState({ category: '', name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const subcategories = categories.flatMap((c: any) => c.subcategories || [])

  const load = () => {
    if (!activeBranch) return
    setLoading(true)
    Promise.all([
      inventoryApi.categories(),
      inventoryApi.branchProducts(activeBranch.id),
    ]).then(([cats, bps]) => {
      setCategories((cats as unknown as any).results || cats)
      setBranchProducts((bps as unknown as any).results || bps)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [activeBranch])

  const filtered = branchProducts.filter(bp => {
    const p = bp.product
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || p.category === catFilter
    return matchSearch && matchCat
  })

  const openProduct = (bp?: any) => {
    if (bp) {
      const p = bp.product
      setEditProduct(bp)
      setPForm({ name: p.name, category: p.category, sub_category: p.sub_category || '', price: p.price, cost_price: p.cost_price, unit: p.unit, description: p.description, is_service: p.is_service })
    } else {
      setEditProduct(null)
      setPForm({ name: '', category: '', sub_category: '', price: '', cost_price: '', unit: 'pcs', description: '', is_service: false })
    }
    setShowProductModal(true)
  }

  const saveProduct = async () => {
    if (!pForm.name || !pForm.price) { addToast('Name and price required', 'error'); return }
    setSaving(true)
    try {
      if (editProduct) {
        await inventoryApi.updateProduct(editProduct.product.id, pForm)
      } else {
        const p = await inventoryApi.createProduct(pForm)
        await inventoryApi.createBranchProduct({ branch: activeBranch!.id, product_id: p.id, stock_quantity: 0 })
      }
      addToast(editProduct ? 'Product updated' : 'Product added')
      setShowProductModal(false)
      load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const openStock = (bp: any) => { setStockItem(bp); setStockForm({ movement_type: 'in', quantity: '', note: '' }); setShowStockModal(true) }

  const saveStock = async () => {
    if (!stockForm.quantity) { addToast('Enter quantity', 'error'); return }
    setSaving(true)
    try {
      await inventoryApi.adjustStock({ branch: activeBranch!.id, product: stockItem.product.id, movement_type: stockForm.movement_type, quantity: parseFloat(stockForm.quantity), note: stockForm.note })
      addToast('Stock updated')
      setShowStockModal(false)
      load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const saveCat = async () => {
    if (!catForm.name) { addToast('Name required', 'error'); return }
    setSaving(true)
    try {
      await inventoryApi.createCategory(catForm)
      addToast('Category added'); setShowCatModal(false); load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const saveSubCat = async () => {
    if (!subCatForm.name || !subCatForm.category) { addToast('Category and name required', 'error'); return }
    setSaving(true)
    try {
      await inventoryApi.createSubcategory(subCatForm)
      addToast('Sub-category added'); setShowSubCatModal(false); load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Inventory</div>
        <div className="flex items-center gap-2">
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setActionsOpen(!actionsOpen)}>
              ⚡ Product Actions ▾
            </button>
            {actionsOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', minWidth: 220, zIndex: 100, overflow: 'hidden' }}>
                <Link href="/inventory/movements" style={{ display: 'block', padding: '12px 16px', color: 'var(--text-1)', textDecoration: 'none', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500 }} onClick={() => setActionsOpen(false)}>📊 Stock Movements</Link>
                <Link href="/inventory/restock" style={{ display: 'block', padding: '12px 16px', color: 'var(--text-1)', textDecoration: 'none', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500 }} onClick={() => setActionsOpen(false)}>📥 Restock (GRN)</Link>
                <Link href="/inventory/stock-take" style={{ display: 'block', padding: '12px 16px', color: 'var(--text-1)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }} onClick={() => setActionsOpen(false)}>📋 Stock Take</Link>
              </div>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCatModal(true)}>+ Category</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSubCatModal(true)}>+ Sub-category</button>
          <button className="btn btn-primary" onClick={() => openProduct()}>+ Add Product</button>
        </div>
      </div>

      <div className="page-content">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['products', 'categories'] as const).map(t => (
            <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {tab === 'products' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
              <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                <span className="search-icon">🔍</span>
                <input placeholder="Search products or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {loading ? <div style={{ padding: '40px 0', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              : filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-text">No products found</div></div>
              : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {filtered.map(bp => {
                        const p = bp.product
                        return (
                          <tr key={bp.id}>
                            <td className="font-semibold">{p.name}</td>
                            <td className="text-muted text-sm">{p.sku}</td>
                            <td>{p.category_name || '—'}</td>
                            <td className="font-bold text-primary">KSh {parseFloat(bp.effective_price).toLocaleString()}</td>
                            <td className="text-muted">KSh {parseFloat(p.cost_price || 0).toLocaleString()}</td>
                            <td>
                              <span style={{ color: bp.is_low_stock ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                                {bp.stock_quantity} {p.unit}
                              </span>
                              {bp.is_low_stock && <span className="badge badge-red" style={{ marginLeft: 6 }}>Low</span>}
                            </td>
                            <td><span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button className="btn btn-secondary btn-sm" onClick={() => openStock(bp)}>📥 Stock</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => openProduct(bp)}>✏️</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {tab === 'categories' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Icon</th><th>Category</th><th>Sub-categories</th><th>Products</th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontSize: 20 }}>{c.icon || '📁'}</td>
                      <td className="font-semibold">{c.name}</td>
                      <td>{(c.subcategories || []).map((s: any) => <span key={s.id} className="badge badge-gray" style={{ marginRight: 4 }}>{s.name}</span>)}</td>
                      <td>{branchProducts.filter(bp => bp.product.category === c.id).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editProduct ? 'Edit Product' : 'Add Product'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowProductModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} /></div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={pForm.category} onChange={e => setPForm({ ...pForm, category: e.target.value, sub_category: '' })}>
                    <option value="">— Select —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sub-category</label>
                  <select className="form-select" value={pForm.sub_category} onChange={e => setPForm({ ...pForm, sub_category: e.target.value })}>
                    <option value="">— None —</option>
                    {subcategories.filter((s: any) => !pForm.category || s.category === pForm.category).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-select" value={pForm.unit} onChange={e => setPForm({ ...pForm, unit: e.target.value })}>
                    {['pcs', 'kg', 'g', 'l', 'ml', 'plate', 'serving', 'bottle', 'box', 'pack'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Selling Price *</label><input type="number" className="form-input" value={pForm.price} onChange={e => setPForm({ ...pForm, price: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Cost Price</label><input type="number" className="form-input" value={pForm.cost_price} onChange={e => setPForm({ ...pForm, cost_price: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={pForm.description} onChange={e => setPForm({ ...pForm, description: e.target.value })} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={pForm.is_service} onChange={e => setPForm({ ...pForm, is_service: e.target.checked })} />
                This is a service (no stock tracking)
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProduct} disabled={saving}>{saving ? '…' : (editProduct ? 'Update' : 'Add Product')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockItem && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Adjust Stock — {stockItem.product.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStockModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                Current Stock: <b>{stockItem.stock_quantity} {stockItem.product.unit}</b>
              </div>
              <div className="form-group">
                <label className="form-label">Movement Type</label>
                <select className="form-select" value={stockForm.movement_type} onChange={e => setStockForm({ ...stockForm, movement_type: e.target.value })}>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Set Exact Quantity</option>
                  <option value="return">Return</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Quantity</label><input type="number" min="0" className="form-input" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Note</label><input className="form-input" value={stockForm.note} onChange={e => setStockForm({ ...stockForm, note: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStockModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStock} disabled={saving}>{saving ? '…' : 'Update Stock'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Add Category</div><button className="btn btn-ghost btn-sm" onClick={() => setShowCatModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Icon (emoji)</label><input className="form-input" maxLength={4} value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} placeholder="🍕" /></div>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCat} disabled={saving}>{saving ? '…' : 'Add Category'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-category Modal */}
      {showSubCatModal && (
        <div className="modal-overlay" onClick={() => setShowSubCatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Add Sub-category</div><button className="btn btn-ghost btn-sm" onClick={() => setShowSubCatModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Parent Category *</label>
                <select className="form-select" value={subCatForm.category} onChange={e => setSubCatForm({ ...subCatForm, category: e.target.value })}>
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={subCatForm.name} onChange={e => setSubCatForm({ ...subCatForm, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={subCatForm.description} onChange={e => setSubCatForm({ ...subCatForm, description: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSubCatModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSubCat} disabled={saving}>{saving ? '…' : 'Add Sub-category'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
