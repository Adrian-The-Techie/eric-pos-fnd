'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useToastStore } from '@/lib/store'
import { branchApi } from '@/lib/api'

export default function SettingsPage() {
  const { user, activeBranch } = useAuthStore()
  const { addToast } = useToastStore()
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: '', address_line: '', phone_display: '',
    receipt_footer: 'Thank you for your business!',
    tax_name: 'VAT', tax_rate: '0',
    currency_symbol: 'KSh', currency_code: 'KES',
  })

  const [activeSegment, setActiveSegment] = useState<'general' | 'taxes' | 'currency'>('general')

  if (!['admin', 'manager'].includes(user?.role || '')) {
    return <div className="page-content"><div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-text">Admin/Manager access only</div></div></div>
  }

  useEffect(() => {
    if (!activeBranch) return
    branchApi.getSettings(activeBranch.id).then(s => {
      setSettings(s)
      setForm({
        business_name: s.business_name || '',
        address_line: s.address_line || '',
        phone_display: s.phone_display || '',
        receipt_footer: s.receipt_footer || 'Thank you for your business!',
        tax_name: s.tax_name || 'VAT',
        tax_rate: s.tax_rate || '0',
        currency_symbol: s.currency_symbol || 'KSh',
        currency_code: s.currency_code || 'KES',
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [activeBranch])

  const save = async () => {
    setSaving(true)
    try {
      await branchApi.updateSettings(activeBranch!.id, form)
      addToast('Settings updated successfully')
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="settings-page">
      <div className="topbar">
        <div className="topbar-title">System Settings</div>
        <div className="text-sm text-muted">{activeBranch?.name}</div>
      </div>

      <div className="settings-layout">
        {/* Settings Sidebar */}
        <div className="settings-sidebar">
          <button className={`settings-nav-item ${activeSegment === 'general' ? 'active' : ''}`} onClick={() => setActiveSegment('general')}>
            <span className="icon">🏢</span>
            <div>
              <div className="label">General & Receipt</div>
              <div className="sub">Business info & footer</div>
            </div>
          </button>
          <button className={`settings-nav-item ${activeSegment === 'taxes' ? 'active' : ''}`} onClick={() => setActiveSegment('taxes')}>
            <span className="icon">💸</span>
            <div>
              <div className="label">Taxes & Charges</div>
              <div className="sub">VAT, GST or service fees</div>
            </div>
          </button>
          <button className={`settings-nav-item ${activeSegment === 'currency' ? 'active' : ''}`} onClick={() => setActiveSegment('currency')}>
            <span className="icon">💱</span>
            <div>
              <div className="label">Currency</div>
              <div className="sub">Local currency & symbols</div>
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="settings-main">
          {loading ? (
            <div className="flex items-center justify-center p-20"><div className="spinner" /></div>
          ) : (
            <div className="settings-content-card card">
              {activeSegment === 'general' && (
                <div className="segment">
                  <h3 className="mb-4">General Configuration</h3>
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input className="form-input" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="My Business" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Line (Header)</label>
                    <textarea className="form-textarea" rows={3} value={form.address_line} onChange={e => setForm({ ...form, address_line: e.target.value })} placeholder="123 Street Name, City" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Support Display</label>
                    <input className="form-input" value={form.phone_display} onChange={e => setForm({ ...form, phone_display: e.target.value })} placeholder="+254..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Receipt Footer Message</label>
                    <textarea className="form-textarea" rows={3} value={form.receipt_footer} onChange={e => setForm({ ...form, receipt_footer: e.target.value })} />
                  </div>
                </div>
              )}

              {activeSegment === 'taxes' && (
                <div className="segment">
                  <h3 className="mb-4">Taxes & Charges</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tax Label</label>
                      <input className="form-input" value={form.tax_name} onChange={e => setForm({ ...form, tax_name: e.target.value })} placeholder="VAT / GST" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tax Percentage (%)</label>
                      <input type="number" step="0.01" className="form-input" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-muted">* This tax will be applied to all sales at checkout by default.</p>
                </div>
              )}

              {activeSegment === 'currency' && (
                <div className="segment">
                  <h3 className="mb-4">Currency Settings</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Currency Symbol</label>
                      <input className="form-input" value={form.currency_symbol} onChange={e => setForm({ ...form, currency_symbol: e.target.value })} placeholder="KSh" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ISO Currency Code</label>
                      <input className="form-input" value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })} placeholder="KES" />
                    </div>
                  </div>
                </div>
              )}

              <hr className="my-6 border-muted/20" />
              <div className="flex justify-end">
                <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save All Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-page { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
        .settings-layout { flex: 1; display: grid; grid-template-columns: 280px 1fr; background: var(--surface); height: calc(100vh - var(--header-height)); }
        
        .settings-sidebar { border-right: 1px solid var(--border); padding: 24px 12px; display: flex; flex-direction: column; gap: 8px; background: var(--bg-alt); }
        .settings-nav-item {
          display: flex; align-items: flex-start; gap: 14px; padding: 14px; border-radius: 12px;
          border: 1px solid transparent; background: transparent; cursor: pointer; text-align: left;
          transition: all 0.2s;
        }
        .settings-nav-item:hover { background: var(--surface); }
        .settings-nav-item.active { background: white; border-color: var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        
        .settings-nav-item .icon { font-size: 20px; padding-top: 2px; }
        .settings-nav-item .label { font-size: 14px; font-weight: 600; color: var(--text); }
        .settings-nav-item .sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }
        .settings-nav-item.active .label { color: var(--primary); }
        
        .settings-main { flex: 1; overflow-y: auto; padding: 40px; }
        .settings-content-card { max-width: 800px; padding: 32px; border-radius: 20px; }
        
        h3 { font-size: 18px; font-weight: 700; color: var(--text); }
      `}</style>
    </div>
  )
}
