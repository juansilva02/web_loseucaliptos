// En produccion (Vercel + dominio) se define VITE_API_URL.
// En desarrollo local Vite proxye /api/* al backend sin prefijo.
const API_BASE = import.meta.env.VITE_API_URL || ''

function token() {
  return sessionStorage.getItem('eucaliptus-admin-token')
}

function storeToken(t) {
  sessionStorage.setItem('eucaliptus-admin-token', t)
}

function clearToken() {
  sessionStorage.removeItem('eucaliptus-admin-token')
}

async function req(path, opts = {}) {
  const t = token()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...opts.headers,
    },
    ...opts,
  })
  if (!res.ok) {
    if (res.status === 401) clearToken()
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  login(email, password) {
    return req('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((data) => { storeToken(data.token); return data })
  },

  getUsers() {
    return req('/api/admin/auth/users')
  },

  createUser(data) {
    return req('/api/admin/auth/users', { method: 'POST', body: JSON.stringify(data) })
  },

  logout() { clearToken() },

  isAuthed() { return !!token() },

  getProducts(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined))
    ).toString()
    return req(`/api/admin/products${qs ? '?' + qs : ''}`)
  },

  createProduct(data) {
    return req('/api/admin/products', { method: 'POST', body: JSON.stringify(data) })
  },

  updateProduct(id, data) {
    return req(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  deactivateProduct(id) {
    return req(`/api/admin/products/${encodeURIComponent(id)}/deactivate`, { method: 'POST' })
  },

  activateProduct(id) {
    return req(`/api/admin/products/${encodeURIComponent(id)}/activate`, { method: 'POST' })
  },

  getCategories() {
    return req('/api/admin/categories')
  },

  createCategory(data) {
    return req('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) })
  },

  updateCategory(key, data) {
    return req(`/api/admin/categories/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  deleteCategory(key) {
    return req(`/api/admin/categories/${encodeURIComponent(key)}`, { method: 'DELETE' })
  },

  getRawSkus(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined))
    ).toString()
    return req(`/api/admin/raw-skus${qs ? '?' + qs : ''}`)
  },

  promoteSku(code, data = {}) {
    return req(`/api/admin/raw-skus/${code}/promote`, { method: 'POST', body: JSON.stringify(data) })
  },

  uploadImage(fileName, dataUrl) {
    return req('/api/admin/upload', { method: 'POST', body: JSON.stringify({ fileName, dataUrl }) })
  },

  getPublicFeatured() {
    return req('/api/featured')
  },
}
