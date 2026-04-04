import api from './api'

// Todas las rutas apuntan a /api/serviparamo/* en el backend Django

const unwrap = (res) => res.data

// ── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async () => {
  const res = await api.get('/api/serviparamo/stats/')
  return unwrap(res)
}

// ── SKUs ─────────────────────────────────────────────────────────────────────

export const getSKUs = async ({ page = 1, page_size = 50, q = '', familia = '', categoria = '' } = {}) => {
  const res = await api.get('/api/serviparamo/skus/', {
    params: { page, page_size, q: q || undefined, familia: familia || undefined, categoria: categoria || undefined },
  })
  return unwrap(res) // { ok, count, page, page_size, data: [...] }
}

export const getSKUDetail = async (codigo) => {
  const res = await api.get(`/api/serviparamo/skus/${codigo}/`)
  return unwrap(res).data
}

// ── Búsqueda semántica ────────────────────────────────────────────────────────

export const buscarSKUs = async (query, limit = 20) => {
  const res = await api.get('/api/serviparamo/buscar/', { params: { q: query, limit } })
  const body = unwrap(res)
  return Array.isArray(body) ? body : (body?.data ?? [])
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

export const getCategorias = async ({ page = 1, page_size = 100, q = '' } = {}) => {
  const res = await api.get('/api/serviparamo/categorias/', {
    params: { page, page_size, q: q || undefined },
  })
  return unwrap(res)
}

export const getFamilias = async () => {
  const res = await api.get('/api/serviparamo/familias/')
  return unwrap(res) // lista de { familia_normalizada, total, duplicados }
}

export const getFamiliasERP = async ({ page = 1, page_size = 100, q = '' } = {}) => {
  const res = await api.get('/api/serviparamo/familias/erp/', {
    params: { page, page_size, q: q || undefined },
  })
  return unwrap(res)
}

// ── Duplicados ────────────────────────────────────────────────────────────────

export const getDuplicados = async ({ page = 1, page_size = 20, familia = '' } = {}) => {
  const res = await api.get('/api/serviparamo/duplicados/', {
    params: { page, page_size, familia: familia || undefined },
  })
  return unwrap(res) // { total_grupos, page, page_size, grupos: [...] }
}

export const aprobarSKU = async ({ sku_id, grupo_id, familia_normalizada } = {}) => {
  const res = await api.post('/api/serviparamo/aprobar/', { sku_id, grupo_id, familia_normalizada })
  return unwrap(res)
}

export const fusionarFamilias = async (familia_origen, familia_destino) => {
  const res = await api.post('/api/serviparamo/fusionar-familias/', { familia_origen, familia_destino })
  return unwrap(res)
}

// ── Órdenes de compra ─────────────────────────────────────────────────────────

export const getOrdenes = async ({ page = 1, page_size = 50, estado = '', proveedor = '' } = {}) => {
  const res = await api.get('/api/serviparamo/ordenes/', {
    params: { page, page_size, estado: estado || undefined, proveedor: proveedor || undefined },
  })
  return unwrap(res)
}

export const getOrdenDetail = async (numfac) => {
  const res = await api.get(`/api/serviparamo/ordenes/${numfac}/`)
  return unwrap(res).data
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export const getPedidos = async ({ page = 1, page_size = 50, estado = '', solicitante = '' } = {}) => {
  const res = await api.get('/api/serviparamo/pedidos/', {
    params: { page, page_size, estado: estado || undefined, solicitante: solicitante || undefined },
  })
  return unwrap(res)
}

export const getPedidoDetail = async (pedido) => {
  const res = await api.get(`/api/serviparamo/pedidos/${pedido}/`)
  return unwrap(res).data
}

// ── ETL ───────────────────────────────────────────────────────────────────────

export const getETLStatus = async () => {
  const res = await api.get('/api/serviparamo/etl/status/')
  return unwrap(res)
}

export const runETL = async (tablas = null) => {
  const body = tablas ? { tablas } : {}
  const res = await api.post('/api/serviparamo/etl/run/', body)
  return unwrap(res)
}
