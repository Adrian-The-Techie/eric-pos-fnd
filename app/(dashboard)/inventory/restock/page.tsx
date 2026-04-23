'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { inventoryApi } from '@/lib/api'

export default function RestockPage() {
  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<{product: string, quantity: string, unit_cost: string}[]>([])
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeBranch) return
    inventoryApi.products({ branch: activeBranch.id }).then((res: any) => setProducts(res.results || res))
    inventoryApi.suppliers().then((d: any) => setSuppliers(d.results || d))
  }, [activeBranch])

  const handleAddItem = () => {
    setItems([...items, { product: '', quantity: '1', unit_cost: '0' }])
  }
  
  const handleItemChange = (idx: number, field: string, value: string) => {
    setItems((prev) => {
      const updated = [...prev]
      const currentItem = { ...updated[idx], [field]: value }
      
      if (field === 'product') {
         const p = products.find(prod => prod.id === value)
         if (p) {
           currentItem.unit_cost = p.cost_price || p.product?.cost_price || '0'
         }
      }
      
      updated[idx] = currentItem
      return updated
    })
  }

  const handleRemove = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (status: 'draft' | 'completed') => {
    if (!supplierId) return addToast('Please select a supplier', 'error')
    if (items.length === 0) return addToast('Add at least one item', 'error')
    if (items.some(i => !i.product || !i.quantity || !i.unit_cost)) return addToast('Fill all item fields', 'error')
    if (!activeBranch) return

    setLoading(true)
    try {
      const payload = {
        supplier: supplierId,
        branch: activeBranch.id,
        status,
        note: '',
        items: items.map(i => ({
          product: products.find(p => p.id === i.product)?.product?.id || products.find(p => p.id === i.product)?.id || i.product, // ensure base product id
          quantity: parseFloat(i.quantity),
          unit_cost: parseFloat(i.unit_cost)
        }))
      }

      await inventoryApi.createGRN(payload)
      
      addToast(status === 'completed' ? 'Stock updated successfully!' : 'GRN Draft saved')
      setItems([])
      setSupplierId('')
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.quantity||'0') * parseFloat(item.unit_cost||'0')), 0)

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Mass Restock (GRN)</div>
      </div>
      <div className="page-content" style={{ maxWidth: 900 }}>
        <div className="card">
          <div className="card-header border-b pb-4 mb-4">
            <div className="card-title">New Goods Received Note</div>
          </div>
          
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label className="form-label">Supplier</label>
            <select className="form-select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— Select Supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="mt-6 mb-4 font-semibold">Received Items</div>
          
          {items.length === 0 ? (
            <div className="empty-state py-8"><div className="empty-state-text text-muted">No items added to GRN</div></div>
          ) : (
            <div className="table-wrap mb-4">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Product</th>
                    <th>Unit Cost (KSh)</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select className="form-select" style={{ minWidth: 200 }} value={item.product} onChange={e => handleItemChange(idx, 'product', e.target.value)}>
                          <option value="">— Select —</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" className="form-input" min="0" step="0.01" value={item.unit_cost} onChange={e => handleItemChange(idx, 'unit_cost', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="form-input" min="0.01" step="0.01" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                      </td>
                      <td className="font-semibold">
                        {parseFloat((parseFloat(item.quantity||'0') * parseFloat(item.unit_cost||'0')).toFixed(2)).toLocaleString()}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-icon text-red-500" onClick={() => handleRemove(idx)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <button className="btn btn-secondary" onClick={handleAddItem}>+ Add Item</button>
            <div className="text-xl font-bold">Total: KSh {parseFloat(totalCost.toFixed(2)).toLocaleString()}</div>
          </div>

          <div className="mt-8 flex gap-3 justify-end border-t pt-4">
            <button className="btn btn-secondary" onClick={() => handleSubmit('draft')} disabled={loading}>Save as Draft</button>
            <button className="btn btn-primary bg-primary-dark" onClick={() => handleSubmit('completed')} disabled={loading}>Complete & Receive Stock</button>
          </div>
        </div>
      </div>
    </>
  )
}
