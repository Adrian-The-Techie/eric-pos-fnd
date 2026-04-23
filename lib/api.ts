// Base API URL — change to your Django server URL
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// ─── Token helpers ────────────────────────────────────────────
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('pos_user')
  localStorage.removeItem('active_branch')
}

// ─── Auth headers ─────────────────────────────────────────────
export const authHeaders = () => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Fetch wrapper ────────────────────────────────────────────
interface FetchOptions extends RequestInit {
  json?: unknown
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers = {}, ...rest } = options
  const isFormData = json instanceof FormData

  const reqHeaders: Record<string, string> = {
    ...authHeaders(),
    ...(headers as Record<string, string>),
  }
  if (json && !isFormData) {
    reqHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...rest,
    headers: reqHeaders,
    body: json ? (isFormData ? (json as FormData) : JSON.stringify(json)) : rest.body,
  })

  // Token expired — clear and redirect
  if (response.status === 401) {
    clearTokens()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || err.error || JSON.stringify(err))
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ access: string; refresh: string; user: any }>('/auth/login/', {
      method: 'POST', json: { email, password },
    }),
  me: () => apiFetch<any>('/auth/me/'),
  users: () => apiFetch<any>('/auth/users/'),
  createUser: (data: any) => apiFetch<any>('/auth/users/', { method: 'POST', json: data }),
  updateUser: (id: string, data: any) => apiFetch<any>(`/auth/users/${id}/`, { method: 'PATCH', json: data }),
}

// ─── Branches ─────────────────────────────────────────────────
export const branchApi = {
  list: () => apiFetch<any[]>('/branches/'),
  create: (data: any) => apiFetch<any>('/branches/', { method: 'POST', json: data }),
  update: (id: string, data: any) => apiFetch<any>(`/branches/${id}/`, { method: 'PATCH', json: data }),
  getSettings: (id: string) => apiFetch<any>(`/branches/${id}/settings/`),
  updateSettings: (id: string, data: FormData | any) =>
    apiFetch<any>(`/branches/${id}/settings/`, { method: 'PATCH', json: data }),
}

// ─── Customers ────────────────────────────────────────────────
export const customerApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<any>(`/customers/${q}`)
  },
  create: (data: any) => apiFetch<any>('/customers/', { method: 'POST', json: data }),
  update: (id: string, data: any) => apiFetch<any>(`/customers/${id}/`, { method: 'PATCH', json: data }),
  get: (id: string) => apiFetch<any>(`/customers/${id}/`),
  statement: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiFetch<any>(`/customers/${id}/statement/?${params}`)
  },
}

// ─── Inventory ────────────────────────────────────────────────
export const inventoryApi = {
  categories: () => apiFetch<any[]>('/inventory/categories/'),
  createCategory: (data: any) => apiFetch<any>('/inventory/categories/', { method: 'POST', json: data }),
  updateCategory: (id: string, data: any) => apiFetch<any>(`/inventory/categories/${id}/`, { method: 'PATCH', json: data }),
  deleteCategory: (id: string) => apiFetch<void>(`/inventory/categories/${id}/`, { method: 'DELETE' }),

  subcategories: (categoryId?: string) => {
    const q = categoryId ? `?category=${categoryId}` : ''
    return apiFetch<any[]>(`/inventory/subcategories/${q}`)
  },
  createSubcategory: (data: any) => apiFetch<any>('/inventory/subcategories/', { method: 'POST', json: data }),

  products: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<any>(`/inventory/products/${q}`)
  },
  createProduct: (data: any) => apiFetch<any>('/inventory/products/', { method: 'POST', json: data }),
  updateProduct: (id: string, data: any) => apiFetch<any>(`/inventory/products/${id}/`, { method: 'PATCH', json: data }),
  deleteProduct: (id: string) => apiFetch<void>(`/inventory/products/${id}/`, { method: 'DELETE' }),

  branchProducts: (branchId: string) => apiFetch<any[]>(`/inventory/branch-products/?branch=${branchId}`),
  updateBranchProduct: (id: number, data: any) =>
    apiFetch<any>(`/inventory/branch-products/${id}/`, { method: 'PATCH', json: data }),

  adjustStock: (data: any) => apiFetch<any>('/inventory/stock/adjust/', { method: 'POST', json: data }),
  stockMovements: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<any>(`/inventory/stock/movements/${q}`)
  },
  supplierStatement: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiFetch<any>(`/inventory/suppliers/${id}/statement/?${params}`)
  },
  stockReport: (branchId: string, from?: string, to?: string) => {
    const params = new URLSearchParams({ branch: branchId })
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    return apiFetch<any>(`/inventory/stock/report/?${params}`)
  },
  emailReport: (data: { report_type: string, email: string, branch_id: string, date_from: string, date_to: string }) => 
    apiFetch<any>('/inventory/stock/email-report/', { method: 'POST', json: data })
}

// ─── Sales ────────────────────────────────────────────────────
export const salesApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<any>(`/sales/${q}`)
  },
  create: (data: any) => apiFetch<any>('/sales/', { method: 'POST', json: data }),
  get: (id: string) => apiFetch<any>(`/sales/${id}/`),

  hold: (saleId: string, label: string) =>
    apiFetch<any>('/sales/hold/', { method: 'POST', json: { sale_id: saleId, label } }),
  heldList: (branchId: string) => apiFetch<any[]>(`/sales/held/?branch=${branchId}`),
  retrieveHeld: (heldId: number) =>
    apiFetch<any>(`/sales/held/${heldId}/retrieve/`, { method: 'POST' }),

  createCredit: (data: any) => apiFetch<any>('/sales/credit/', { method: 'POST', json: data }),
  creditPayment: (creditId: string, data: any) =>
    apiFetch<any>(`/sales/credit/${creditId}/payment/`, { method: 'POST', json: data }),

  createReceipt: (saleId: string) =>
    apiFetch<any>('/sales/receipts/', { method: 'POST', json: { sale_id: saleId } }),
  getReceipt: (id: string) => apiFetch<any>(`/sales/receipts/${id}/`),

  void: (saleId: string) =>
    apiFetch<any>(`/sales/${saleId}/void/`, { method: 'POST' }),
}
