'use client'
import { useEffect, useState } from 'react'
import { useToastStore, useAuthStore } from '@/lib/store'
import { format } from 'date-fns'
import { inventoryApi } from '@/lib/api'

export default function SuppliersPage() {
  
  const { addToast } = useToastStore()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  
  const [showStatModal, setShowStatModal] = useState(false)
  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const data = await inventoryApi.suppliers()
      setSuppliers(data.results || data)
    } catch {
      addToast('Failed to load suppliers', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSuppliers() }, [])

  const handleSave = async (e: any) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = Object.fromEntries(fd)
    try {
      if (editing) {
        await inventoryApi.updateSupplier(editing.id, data)
      } else {
        await inventoryApi.createSupplier(data)
      }
      addToast('Supplier saved')
      setShowModal(false)
      loadSuppliers()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Suppliers</div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add Supplier</button>
      </div>

      <div className="page-content">
        <div className="card">
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : suppliers.length === 0 ? (
             <div className="empty-state"><div className="empty-state-icon">🏢</div><div className="empty-state-text">No suppliers yet.</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.name}</td>
                      <td>{s.contact_person || '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.email || '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `/suppliers/${s.id}`}>📄 Details</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(s); setShowModal(true) }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Supplier' : 'New Supplier'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name</label><input required name="name" className="form-input" defaultValue={editing?.name} /></div>
                <div className="form-group"><label className="form-label">Contact Person</label><input name="contact_person" className="form-input" defaultValue={editing?.contact_person} /></div>
                <div className="grid col-2">
                  <div className="form-group"><label className="form-label">Phone</label><input name="phone" className="form-input" defaultValue={editing?.phone} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" name="email" className="form-input" defaultValue={editing?.email} /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><textarea name="address" className="form-input" defaultValue={editing?.address} rows={3} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  )
}
