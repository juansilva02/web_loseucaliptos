const API_BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'eucaliptus-admin-token'

function token() {
  return window.sessionStorage.getItem(TOKEN_KEY)
}

function storeToken(value) {
  window.sessionStorage.setItem(TOKEN_KEY, value)
}

function clearToken() {
  window.sessionStorage.removeItem(TOKEN_KEY)
}

async function req(path, options = {}) {
  const authToken = token()
  const headers = new Headers(options.headers || {})
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  if (options.body != null && !(options.body instanceof Blob) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      window.dispatchEvent(new CustomEvent('eucaliptus-admin-unauthorized'))
    }
    const body = await response.json().catch(() => ({ error: response.statusText }))
    const error = new Error(body.error || `HTTP ${response.status}`)
    error.status = response.status
    error.details = body.details
    throw error
  }
  if (response.status === 204) return null
  return response.json()
}

function queryString(params) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== undefined),
    ),
  ).toString()
  return query ? `?${query}` : ''
}

export const api = {
  login(email, password) {
    return req('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((data) => {
      storeToken(data.token)
      return data
    })
  },

  me() {
    return req('/api/admin/auth/me')
  },

  getUsers() {
    return req('/api/admin/auth/users')
  },

  createUser(data) {
    return req('/api/admin/auth/users', { method: 'POST', body: JSON.stringify(data) })
  },

  updateUserRole(id, role) {
    return req(`/api/admin/auth/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  },

  resetUserPassword(id, newPassword) {
    return req(`/api/admin/auth/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    })
  },

  changeOwnPassword(id, currentPassword, newPassword) {
    return req(`/api/admin/auth/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }).then((data) => {
      if (data.token) storeToken(data.token)
      return data
    })
  },

  deleteUser(id) {
    return req(`/api/admin/auth/users/${id}`, { method: 'DELETE' })
  },

  logout() {
    clearToken()
  },

  isAuthed() {
    return Boolean(token())
  },

  getProducts(params = {}) {
    return req(`/api/admin/products${queryString(params)}`)
  },

  saveProductsBulk(data) {
    return req('/api/admin/products/bulk', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getCategories() {
    return req('/api/admin/categories')
  },

  createCategory(data) {
    return req('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) })
  },

  saveCategoriesBulk(updates) {
    return req('/api/admin/categories/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    })
  },

  deleteCategory(key) {
    return req(`/api/admin/categories/${encodeURIComponent(key)}`, { method: 'DELETE' })
  },

  getRawSkus(params = {}) {
    return req(`/api/admin/raw-skus${queryString(params)}`)
  },

  promoteSku(code, data = {}) {
    return req(`/api/admin/raw-skus/${code}/promote`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  linkSku(code, productId) {
    return req(`/api/admin/raw-skus/${code}/link`, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    })
  },

  uploadProductImage(productId, version, file) {
    return req(
      `/api/admin/products/${encodeURIComponent(productId)}/image?version=${encodeURIComponent(version)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      },
    )
  },

  removeProductImage(productId, version) {
    return req(`/api/admin/products/${encodeURIComponent(productId)}/image`, {
      method: 'DELETE',
      body: JSON.stringify({ version }),
    })
  },

  getPublicCatalog() {
    return req('/api/catalog')
  },

  quoteCart(items) {
    return req('/api/catalog/quote', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          seenPrice: item.price,
        })),
      }),
    })
  },

  searchDeliveryAddress(data, signal) {
    return req('/api/delivery/search', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    })
  },

  reverseDeliveryLocation(data, signal) {
    return req('/api/delivery/reverse', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    })
  },
}
