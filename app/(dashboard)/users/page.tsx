'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { authApi, branchApi } from '@/lib/api'

export default function UsersPage() {
  const { user: me } = useAuthStore()
  const { addToast } = useToastStore()
  const [users, setUsers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'staff', phone: '', password: '', branch_ids: [] as string[] })

  if (me?.role !== 'admin' && me?.role !== 'manager') {
    return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-text">Access Denied</div></div></div>
  }

  const load = () => {
    setLoading(true)
    Promise.all([authApi.users(), branchApi.list()]).then(([u, b]) => {
      setUsers((u as any).results || u)
      setBranches((b as any).results || b)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = (u?: any) => {
    if (u) { setEditUser(u); setForm({ email: u.email || '', full_name: u.full_name, role: u.role, phone: u.phone, password: '', branch_ids: u.branches?.map((b: any) => b.branch.id) || [] }) }
    else { setEditUser(null); setForm({ email: '', full_name: '', role: 'staff', phone: '', password: '', branch_ids: [] }) }
    setShowModal(true)
  }

  const save = async () => {
    if (!form.full_name || !form.phone) { addToast('Name and phone number are required', 'error'); return }
    if (!editUser && !form.password) { addToast('Password required', 'error'); return }
    setSaving(true)
    try {
      if (editUser) {
        const payload: any = { full_name: form.full_name, role: form.role, phone: form.phone, is_active: true, branch_ids: form.branch_ids }
        if (form.password) payload.password = form.password
        await authApi.updateUser(editUser.id, payload)
      } else {
        await authApi.createUser(form)
      }
      addToast(editUser ? 'User updated' : 'User created')
      setShowModal(false); load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const toggleBranch = (id: string) => {
    setForm(f => ({ ...f, branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter(b => b !== id) : [...f.branch_ids, id] }))
  }

  const roleColor = (r: string) => ({ admin: 'badge-red', manager: 'badge-orange', backoffice: 'badge-blue', staff: 'badge-gray' }[r] || 'badge-gray')

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">User Management</div>
        {me?.role === 'admin' && <button className="btn btn-primary" onClick={() => openModal()}>+ Add User</button>}
      </div>
      <div className="page-content">
        <div className="card">
          {loading ? <div style={{ padding: '40px 0', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Branches</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar">{u.full_name?.[0]}</div>
                            <span className="font-semibold">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="text-muted">{u.email}</td>
                        <td className="text-muted">{u.phone || '—'}</td>
                        <td><span className={`badge ${roleColor(u.role)}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                        <td>{u.branches?.map((b: any) => <span key={b.branch.id} className="badge badge-primary" style={{ marginRight: 4 }}>{b.branch.name}</span>)}</td>
                        <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>{me?.role === 'admin' && <button className="btn btn-ghost btn-sm" onClick={() => openModal(u)}>✏️</button>}</td>
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editUser ? 'Edit User' : 'Add User'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Phone Number *</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 07..." /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email Address (Optional)</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@domain.com" /></div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="staff">Staff</option>
                    <option value="backoffice">Back Office</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">{editUser ? 'New Password (leave blank to keep current)' : 'Password *'}</label><input type="password" className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Assign Branches</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 6 }}>
                  {Array.isArray(branches) && branches.map(b => (
                    <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.branch_ids.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '…' : (editUser ? 'Update' : 'Create User')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
