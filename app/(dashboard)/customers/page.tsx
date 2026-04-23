'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { customerApi } from '@/lib/api'
import { format } from 'date-fns'

export default function CustomersPage() {
  const { activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showStatModal, setShowStatModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)
  const [statCustomer, setStatCustomer] = useState<any>(null)
  const [statement, setStatement] = useState<any>(null)
  const [statFrom, setStatFrom] = useState('')
  const [statTo, setStatTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [creditCustomer, setCreditCustomer] = useState<any>(null)
  const [creditForm, setCreditForm] = useState({ amount: '', payment_method: 'cash', note: '' })

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', credit_limit: '', notes: '' })

  const load = () => {
    if (!activeBranch) return
    setLoading(true)
    customerApi.list({ branch: activeBranch.id }).then(r => {
      setCustomers((r.results || r).filter((c: any) => !c.is_walkin))
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [activeBranch])

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const openModal = (c?: any) => {
    if (c) { setEditCustomer(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', credit_limit: c.credit_limit || '', notes: c.notes || '' }) }
    else { setEditCustomer(null); setForm({ name: '', phone: '', email: '', address: '', credit_limit: '', notes: '' }) }
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name) { addToast('Name required', 'error'); return }
    setSaving(true)
    try {
      const data = { ...form, branch: activeBranch!.id, credit_limit: parseFloat(form.credit_limit || '0') }
      if (editCustomer) await customerApi.update(editCustomer.id, data)
      else await customerApi.create(data)
      addToast(editCustomer ? 'Customer updated' : 'Customer added')
      setShowModal(false); load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const loadStatement = async (c: any) => {
    setStatCustomer(c); setStatFrom(''); setStatTo(''); setStatement(null); setShowStatModal(true)
    const res = await customerApi.statement(c.id)
    setStatement(res)
  }

  const refreshStatement = async () => {
    const res = await customerApi.statement(statCustomer.id, statFrom, statTo)
    setStatement(res)
  }

  const openCreditPayment = (c: any) => {
    setCreditCustomer(c)
    setCreditForm({ amount: '', payment_method: 'cash', note: '' })
    setShowCreditModal(true)
  }

  const saveCreditPayment = async () => {
    if (!creditForm.amount) { addToast('Enter amount', 'error'); return }
    setSaving(true)
    try {
      // Find the credit sale for this customer
      const sales = await import('@/lib/api').then(({ salesApi }) => salesApi.list({ branch: activeBranch!.id, status: 'credited' }))
      const creditSale = (sales.results || sales).find((s: any) => s.customer === creditCustomer.id)
      if (!creditSale?.credit_info) { addToast('No credit sale found', 'error'); setSaving(false); return }
      await import('@/lib/api').then(({ salesApi }) => salesApi.creditPayment(creditSale.credit_info.id, creditForm))
      addToast('Payment recorded'); setShowCreditModal(false); load()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Customers</div>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Add Customer</button>
      </div>
      <div className="page-content">
        <div className="card">
          <div className="search-bar mb-4" style={{ maxWidth: 400 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Search name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div style={{ padding: '40px 0', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            : filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">No customers yet</div></div>
            : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Credit Limit</th><th>Outstanding</th><th>Available</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{c.name[0]}</div>
                            <span className="font-semibold">{c.name}</span>
                          </div>
                        </td>
                        <td className="text-muted">{c.phone || '—'}</td>
                        <td className="text-muted">{c.email || '—'}</td>
                        <td>KSh {parseFloat(c.credit_limit || 0).toLocaleString()}</td>
                        <td>
                          <span style={{ color: parseFloat(c.outstanding_balance) > 0 ? 'var(--error)' : 'var(--text-3)', fontWeight: 600 }}>
                            KSh {parseFloat(c.outstanding_balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>KSh {parseFloat(c.available_credit || 0).toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `/customers/${c.id}`}>📄 Statement</button>
                            {parseFloat(c.outstanding_balance) > 0 && (
                              <button className="btn btn-secondary btn-sm" onClick={() => openCreditPayment(c)}>💳 Pay Credit</button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(c)}>✏️</button>
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

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editCustomer ? 'Edit Customer' : 'Add Customer'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Credit Limit (KSh)</label><input type="number" min="0" className="form-input" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} placeholder="0 = unlimited" /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '…' : (editCustomer ? 'Update' : 'Add Customer')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {showStatModal && statCustomer && (
        <div className="modal-overlay" onClick={() => setShowStatModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Statement — {statCustomer.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStatModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
                <input type="date" className="form-input" style={{ width: 150 }} value={statFrom} onChange={e => setStatFrom(e.target.value)} />
                <span className="text-muted text-sm">to</span>
                <input type="date" className="form-input" style={{ width: 150 }} value={statTo} onChange={e => setStatTo(e.target.value)} />
                <button className="btn btn-secondary btn-sm" onClick={refreshStatement}>Filter</button>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
              </div>
              {!statement ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                : (
                  <>
                    <div className="flex gap-3 mb-4">
                      <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
                        <div className="text-xs text-muted">Outstanding Balance</div>
                        <div className="font-bold text-primary" style={{ fontSize: 18 }}>KSh {parseFloat(statement.closing_balance || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                        <tbody>
                          {statement.statement?.map((e: any, i: number) => (
                            <tr key={i}>
                              <td className="text-sm text-muted">{e.date ? format(new Date(e.date), 'dd/MM/yy HH:mm') : ''}</td>
                              <td><span className={`badge ${e.type === 'credit_payment' ? 'badge-green' : e.type === 'credit_sale' ? 'badge-red' : 'badge-blue'}`}>{e.type?.replace('_', ' ')}</span></td>
                              <td className="font-semibold text-primary">{e.reference}</td>
                              <td className="text-muted">{e.description}</td>
                              <td style={{ color: 'var(--error)', fontWeight: 600 }}>{parseFloat(e.debit) > 0 ? `KSh ${parseFloat(e.debit).toLocaleString()}` : '—'}</td>
                              <td style={{ color: 'var(--success)', fontWeight: 600 }}>{parseFloat(e.credit) > 0 ? `KSh ${parseFloat(e.credit).toLocaleString()}` : '—'}</td>
                              <td className="font-bold">KSh {parseFloat(e.balance).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Payment Modal */}
      {showCreditModal && creditCustomer && (
        <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Record Credit Payment — {creditCustomer.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--error-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                Outstanding: <b>KSh {parseFloat(creditCustomer.outstanding_balance).toLocaleString()}</b>
              </div>
              <div className="form-group"><label className="form-label">Amount</label><input type="number" min="0" className="form-input" value={creditForm.amount} onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })} /></div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={creditForm.payment_method} onChange={e => setCreditForm({ ...creditForm, payment_method: e.target.value })}>
                  <option value="cash">Cash</option><option value="card">Card</option><option value="mobile">Mobile Money</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Note</label><input className="form-input" value={creditForm.note} onChange={e => setCreditForm({ ...creditForm, note: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCreditPayment} disabled={saving}>{saving ? '…' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
