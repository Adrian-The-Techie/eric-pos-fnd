'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { branchApi } from '@/lib/api'

export default function BranchesPage() {
  const { user: me } = useAuthStore()
  const { addToast } = useToastStore()
  
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<any>(null)
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', email: '', is_active: true })
  const [saving, setSaving] = useState(false)

  if (me?.role !== 'admin') {
    return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-text">Admin access only</div></div></div>
  }

  const load = () => {
    setLoading(true)
    branchApi.list().then((res: any) => {
      setBranches(res.results || res)
    }).catch(() => addToast('Failed to load branches', 'error'))
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = (b?: any) => {
    if (b) {
      setEditBranch(b)
      setForm({ name: b.name, code: b.code, address: b.address || '', phone: b.phone || '', email: b.email || '', is_active: b.is_active })
    } else {
      setEditBranch(null)
      setForm({ name: '', code: '', address: '', phone: '', email: '', is_active: true })
    }
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name || !form.code) return addToast('Name and code required', 'error')
    setSaving(true)
    try {
      if (editBranch) await branchApi.update(editBranch.id, form)
      else await branchApi.create(form)
      addToast(editBranch ? 'Branch updated' : 'Branch created')
      setShowModal(false)
      load()
    } catch(e: any) {
      addToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Branch Management</div>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Add Branch</button>
      </div>

      <div className="page-content">
        <div className="card">
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : branches.length === 0 ? (
             <div className="empty-state"><div className="empty-state-icon">🏢</div><div className="empty-state-text">No branches found</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Code</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id}>
                      <td className="font-semibold">{b.name}</td>
                      <td><span className="badge badge-gray">{b.code}</span></td>
                      <td>{b.phone || '—'}</td>
                      <td>{b.email || '—'}</td>
                      <td>
                        <span className={`badge ${b.is_active ? 'badge-green' : 'badge-red'}`}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openModal(b)}>Edit</button>
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
              <div className="modal-title">{editBranch ? 'Edit Branch' : 'New Branch'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Branch Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Branch Code *</label><input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="HQ, BR1, etc." /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                Branch is Active
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Branch'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
