import { useEffect, useState } from 'react'
import { AlertsTable, Alert } from '../components/AlertsTable'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Filter } from 'lucide-react'

import { getAlertas } from '../services/api'

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')

  const fetchAlerts = async () => {
    try {
      const params: any = {
        q: searchTerm || undefined,
        nivel_riesgo: riskFilter !== 'all' ? riskFilter : undefined,
        tienda: storeFilter !== 'all' ? storeFilter : undefined,
        page_size: 20
      }

      const res = await getAlertas(params)

      const formatted = res.data.results.map((a: any) => ({
        id: a.id,
        date: a.date,
        store: a.store,
        anomalyType: a.anomalyType,
        amount: a.amount,
        riskLevel: a.riskLevel,
        status: a.estado
      }))

      setAlerts(formatted)

    } catch (error) {
      console.error('Error cargando alertas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [searchTerm, riskFilter, storeFilter])

  if (loading) return <div>Cargando alertas...</div>

  const stores = Array.from(new Set(alerts.map(a => a.store)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Alertas</h1>
        <p className="text-gray-500 mt-1">Gestión completa de alertas</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Riesgo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store} value={store}>{store}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setRiskFilter('all')
              setStoreFilter('all')
            }}
          >
            Limpiar
          </Button>
        </div>
      </Card>

      <Card>
        <AlertsTable alerts={alerts} />
      </Card>
    </div>
  )
}