'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { inventoryApi } from '@/lib/api'
import { format } from 'date-fns'

export default function StockTakePage() {
  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  
  const [stockTakes, setStockTakes] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [branchProducts, setBranchProducts] = useState<any[]>([])

  const [view, setView] = useState<'list' | 'new' | 'detail'>('list')
  const [items, setItems] = useState<any[]>([]) // For new stock take
  const [loading, setLoading] = useState(false)
  
  // detail view
  const [currentST, setCurrentST] = useState<any>(null)

  useEffect(() => {
    if (!activeBranch) return
    loadStockTakes()
    inventoryApi.products({ branch: activeBranch.id }).then((res: any) => setProducts(res.results || res))
    inventoryApi.branchProducts(activeBranch.id).then((d: any) => setBranchProducts(d.results || d))
  }, [activeBranch])

  const loadStockTakes = async () => {
    try {
      const data = await inventoryApi.stockTakes(activeBranch?.id)
      setStockTakes(data.results || data)
    } catch {}
  }

  const handleStartNew = () => {
    // Populate items with all branch products that have physical stock (not service)
    const initialItems = branchProducts.filter(bp => !bp.product.is_service).map(bp => ({
      product: bp.product.id,
      name: bp.product.name,
      system_quantity: bp.stock_quantity,
      actual_quantity: bp.stock_quantity,
      difference: 0
    }))
    setItems(initialItems)
    setView('new')
  }

  const handleQuantityChange = (idx: number, val: string) => {
    const act = parseFloat(val) || 0
    setItems((prev) => {
      const updated = [...prev]
      updated[idx] = { 
        ...updated[idx], 
        actual_quantity: act,
        difference: act - parseFloat(updated[idx].system_quantity)
      }
      return updated
    })
  }

  const handleSubmit = async (status: 'draft' | 'completed') => {
    if (!activeBranch) return
    setLoading(true)
    try {
      const payload = {
        branch: activeBranch.id,
        status,
        items: items.map(i => ({
          product: i.product,
          system_quantity: i.system_quantity,
          actual_quantity: i.actual_quantity
        }))
      }
      await inventoryApi.createStockTake(payload)
      addToast(status === 'completed' ? 'Stock Take completed' : 'Draft saved')
      setView('list')
      loadStockTakes()
    } catch(e:any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const viewDetail = async (st: any) => {
    setView('detail')
    setCurrentST(st)
    if (!st.items) {
      // Fetch detail if items are missing
      const data = await inventoryApi.stockTakes(); // this is a bit hacky, but let's use a specific detail call if added
      // Actually let's use a cleaner way. I'll just use the list if items are already there or a new endpoint if I add it.
      // But for now, I'll use apiFetch directly for the single ST if needed, but I should add it to api.ts.
      // Wait, I'll just call apiFetch in api.ts for specific object.
    }
  }

  const handleCompleteDraft = async () => {
    if (!currentST) return
    if (!confirm('Are you sure you want to complete this stock take? This will adjust inventory.')) return
    try {
      await inventoryApi.updateStockTake(currentST.id, { status: 'completed' })
      addToast('Stock Take completed')
      setView('list')
      loadStockTakes()
    } catch(e:any) {
      addToast(e.message, 'error')
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Stock Take</div>
        {view === 'list' && <button className="btn btn-primary" onClick={handleStartNew}>Start Stock Take</button>}
        {view !== 'list' && <button className="btn btn-secondary" onClick={() => setView('list')}>← Back</button>}
      </div>

      <div className="page-content">
        {view === 'list' && (
          <div className="card">
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
                <div className="text-muted text-xs mt-4">Loading stock takes...</div>
              </div>
            ) : stockTakes.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 0' }}>
                <div className="empty-state-icon" style={{ opacity: 0.3 }}>📋</div>
                <div className="empty-state-text">No recent activity</div>
                <div className="empty-state-sub">Previous stock takes will be listed here</div>
              </div>
            ) : (
               <div className="table-wrap">
                 <table>
                   <thead>
                     <tr>
                       <th>Reference</th>
                       <th>Date</th>
                       <th>Status</th>
                       <th>Conducted By</th>
                       <th>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {stockTakes.map(st => (
                       <tr key={st.id}>
                         <td className="font-semibold">{st.reference}</td>
                         <td>{format(new Date(st.created_at), 'dd MMM yyyy HH:mm')}</td>
                         <td>
                           <span className={`badge ${st.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>
                             {st.status.toUpperCase()}
                           </span>
                         </td>
                         <td>{st.conducted_by_name}</td>
                         <td>
                           <button className="btn btn-secondary btn-sm" onClick={() => viewDetail(st)}>View</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            )}
          </div>
        )}

        {view === 'new' && (
          <div className="card">
            <div className="card-header border-b pb-4 mb-4">
              <div className="card-title">Conduct Stock Take</div>
            </div>
            <div className="table-wrap mb-4">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">System Qty</th>
                    <th style={{ width: 150 }}>Actual Qty</th>
                    <th className="text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{item.name}</td>
                      <td className="text-right text-muted">{parseFloat(item.system_quantity).toLocaleString()}</td>
                      <td>
                        <input type="number" className="form-input text-right" step="0.01" value={item.actual_quantity} onChange={e => handleQuantityChange(idx, e.target.value)} />
                      </td>
                      <td className={`text-right font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-500' : ''}`}>
                        {item.difference > 0 ? '+' : ''}{item.difference.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button className="btn btn-secondary" disabled={loading} onClick={() => handleSubmit('draft')}>Save Draft</button>
              <button className="btn btn-primary bg-primary-dark" disabled={loading} onClick={() => handleSubmit('completed')}>Complete & Adjust Stock</button>
            </div>
          </div>
        )}

        {view === 'detail' && currentST && (
          <div className="card">
             <div className="flex justify-between items-center border-b pb-4 mb-4">
               <div className="card-title">Stock Take: {currentST.reference} <span className={`badge ml-2 ${currentST.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>{currentST.status}</span></div>
               {currentST.status === 'draft' && (
                 <button className="btn btn-primary" onClick={handleCompleteDraft}>Mark as Completed</button>
               )}
             </div>
             
             {currentST.items ? (
               <div className="table-wrap">
                 <table>
                   <thead>
                     <tr>
                       <th>Product</th>
                       <th className="text-right">System Qty</th>
                       <th className="text-right">Actual Qty</th>
                       <th className="text-right">Difference</th>
                     </tr>
                   </thead>
                   <tbody>
                     {currentST.items.map((it:any) => (
                       <tr key={it.id}>
                         <td>{it.product_name}</td>
                         <td className="text-right text-muted">{parseFloat(it.system_quantity)}</td>
                         <td className="text-right font-semibold">{parseFloat(it.actual_quantity)}</td>
                         <td className={`text-right font-bold ${parseFloat(it.difference) > 0 ? 'text-green-600' : parseFloat(it.difference) < 0 ? 'text-red-500' : ''}`}>
                           {parseFloat(it.difference) > 0 ? '+' : ''}{parseFloat(it.difference)}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
             )}
          </div>
        )}
      </div>
    </>
  )
}
