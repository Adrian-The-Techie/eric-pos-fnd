'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const navItems = [
  {
    section: 'Main',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Dashboard', roles: ['admin', 'manager', 'staff', 'backoffice'] },
      { href: '/pos', icon: '🛒', label: 'Point of Sale', roles: ['admin', 'manager', 'staff', 'backoffice'] },
    ]
  },
  {
    section: 'Inventory',
    items: [
      { href: '/inventory', icon: '📦', label: 'Inventory & Stock', roles: ['admin', 'manager', 'backoffice'] },
    ]
  },
  {
    section: 'Procurement',
    items: [
      { href: '/suppliers', icon: '🏢', label: 'Suppliers', roles: ['admin', 'manager', 'backoffice'] },
    ]
  },
  {
    section: 'Sales & CRM',
    items: [
      { href: '/customers', icon: '👥', label: 'Customers', roles: ['admin', 'manager', 'staff', 'backoffice'] },
      { href: '/sales', icon: '🧾', label: 'Sales History', roles: ['admin', 'manager', 'staff', 'backoffice'] },
    ]
  },
  {
    section: 'Admin',
    items: [
      { href: '/branches', icon: '🏢', label: 'Branches', roles: ['admin'] },
      { href: '/users', icon: '👤', label: 'Users', roles: ['admin', 'manager'] },
      { href: '/reports', icon: '📊', label: 'Reports', roles: ['admin', 'manager', 'backoffice'],
        subItems: [
          { label: 'Sales Summary', query: 'sales' },
          { label: 'Items Valuation', query: 'items' },
        ]
      },
      { href: '/settings', icon: '⚙️', label: 'Settings', roles: ['admin', 'manager'] },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, activeBranch, setActiveBranch, logout } = useAuthStore()

  const canAccess = (roles: string[]) => user ? roles.includes(user.role) : false

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/assets/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <div className="sidebar-logo-icon" style={{ display: 'none' }}>🍽️</div>
        <div>
          <div className="sidebar-logo-text">Connvo-POS</div>
          <div className="sidebar-logo-sub">{activeBranch?.name || 'No Branch'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => {
          const visible = section.items.filter(i => canAccess(i.roles))
          if (!visible.length) return null
          return (
            <div className="sidebar-section" key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {visible.map(item => {
                const isActive = (item as any).exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                    {isActive && (item as any).subItems && (
                      <div className="sidebar-sub">
                        {(item as any).subItems.map((sub: any) => (
                          <Link 
                            key={sub.label} 
                            href={`${item.href}?type=${sub.query}`}
                            className="sub-item"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {/* Branch switcher */}
        {user && user.branches.length > 1 && (
          <div className="form-group" style={{ marginBottom: 8 }}>
            <select
              className="form-select"
              value={activeBranch?.id || ''}
              onChange={e => {
                const b = user.branches.find(b => b.id === e.target.value)
                if (b) setActiveBranch(b)
              }}
            >
              {user.branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        {/* User info + logout */}
        <div className="flex items-center gap-2">
          <div className="avatar">{user?.full_name?.[0] || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{user?.full_name}</div>
            <div className="text-xs text-muted truncate" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={logout} title="Logout">⏻</button>
        </div>
      </div>
    </aside>
  )
}
