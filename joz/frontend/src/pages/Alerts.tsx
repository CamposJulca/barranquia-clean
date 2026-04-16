import { useEffect, useState, useCallback } from 'react'
import { AlertsTable, Alert } from '../components/AlertsTable'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Filter, RefreshCw, AlertTriangle, Bell, Loader } from 'lucide-react'

import { getAlertas } from '../services/api'

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        q: searchTerm || undefined,
        nivel_riesgo: riskFilter !== 'all' ? riskFilter : undefined,
        tienda: storeFilter !== 'all' ? storeFilter : undefined,
        page_size: 50,
      }

      const res = await getAlertas(params)
      const results = Array.isArray(res)
        ? res
        : res?.results ?? res?.data?.results ?? []

      const formatted: Alert[] = results.map((a: any) => ({
        id: a.id,
        date: a.fecha ?? a.date,
        store: a.almacen ?? a.store,
        anomalyType: a.tipo_anomalia ?? a.anomalyType,
        amount: a.monto ?? a.amount,
        riskLevel: a.nivel_riesgo ?? a.riskLevel,
        status: a.estado,
      }))

      setAlerts(formatted)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Error al cargar alertas.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, riskFilter, storeFilter])

  useEffect(() => {
    fetchAlerts()
    const iv = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(iv)
  }, [fetchAlerts])

  const stores = Array.from(new Set(alerts.map(a => a.store).filter(Boolean)))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Alertas
          </h1>
          <p className="text-amber-200/60 text-sm mt-1">
            Gestión completa de alertas · Auto-refresh 30s
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAlerts}
          disabled={loading}
          className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="bg-slate-900 border-amber-500/20 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-amber-400 shrink-0" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[160px] bg-slate-950 border-amber-500/30 text-amber-100 placeholder:text-amber-200/30"
          />
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-36 bg-slate-950 border-amber-500/30 text-amber-100">
              <SelectValue placeholder="Riesgo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
              <SelectItem value="Medio">Medio</SelectItem>
              <SelectItem value="Bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-36 bg-slate-950 border-amber-500/30 text-amber-100">
              <SelectValue placeholder="Tienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {stores.map(store => (
                <SelectItem key={store} value={store}>{store}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearchTerm(''); setRiskFilter('all'); setStoreFilter('all') }}
            className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
          >
            Limpiar
          </Button>
        </div>
      </Card>

      {/* Estado: cargando */}
      {loading && (
        <Card className="bg-slate-900 border-amber-500/20 p-10 flex items-center justify-center gap-3 text-amber-200/60">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Cargando alertas…</span>
        </Card>
      )}

      {/* Estado: error */}
      {!loading && error && (
        <Card className="bg-red-500/10 border-red-500/30 p-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 font-medium">Error al cargar alertas</p>
            <p className="text-red-400/70 text-sm mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            className="ml-auto border-red-500/30 text-red-300 hover:bg-red-500/10"
          >
            Reintentar
          </Button>
        </Card>
      )}

      {/* Estado: vacío */}
      {!loading && !error && alerts.length === 0 && (
        <Card className="bg-slate-900 border-amber-500/20 p-10 text-center">
          <Bell className="w-10 h-10 text-amber-500/30 mx-auto mb-3" />
          <p className="text-amber-200/60 font-medium">No hay alertas disponibles</p>
          <p className="text-amber-200/30 text-sm mt-1">
            No se encontraron alertas con los filtros aplicados.
          </p>
        </Card>
      )}

      {/* Tabla */}
      {!loading && !error && alerts.length > 0 && (
        <Card className="bg-slate-900 border-amber-500/20">
          <AlertsTable alerts={alerts} />
        </Card>
      )}
    </div>
  )
}