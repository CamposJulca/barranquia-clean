import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/ui/badge'
import {
  Activity,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'
import { getHistorial } from '../services/api'

const categorizar = (descripcion: string): string => {
  const d = descripcion?.toLowerCase() ?? ''
  if (d.includes('empeño')) return 'Empeño'
  if (d.includes('retira')) return 'Retiro'
  if (d.includes('abona') || d.includes('paga')) return 'Abono'
  if (d.includes('apertura')) return 'Apertura'
  if (d.includes('cierre')) return 'Cierre'
  return 'Otro'
}

const tipoColors: Record<string, string> = {
  Empeño: 'bg-purple-700 text-purple-100',
  Retiro: 'bg-orange-700 text-orange-100',
  Abono: 'bg-blue-700 text-blue-100',
  Apertura: 'bg-green-700 text-green-100',
  Cierre: 'bg-slate-700 text-slate-100',
  Otro: 'bg-slate-600 text-slate-100',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
  }).format(n)

export default function StoreDetail() {
  const { name } = useParams<{ name: string }>()
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [name])

  async function fetchData() {
    const res = await getHistorial({ page_size: 500 })

    const filtrados = res.results.filter(
      (r: any) => r.store === name
    )

    setData(
      filtrados.map((r: any) => ({
        ...r,
        categoria: categorizar(r.descripcion)
      }))
    )
  }

  const totalEntrada = data.reduce((s, r) => s + r.entrada, 0)
  const totalSalida = data.reduce((s, r) => s + r.salida, 0)

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Detalle por almacén</p>
          <h1 className="text-3xl font-semibold text-slate-100">Almacén: {name}</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard title="Transacciones" value={data.length} icon={Activity} />
          <StatCard title="Ingresos" value={fmt(totalEntrada)} icon={ArrowDownCircle} />
          <StatCard title="Retiros" value={fmt(totalSalida)} icon={ArrowUpCircle} />
          <StatCard title="Balance" value={fmt(totalEntrada - totalSalida)} icon={DollarSign} />
        </div>
      </div>

      <Card className="bg-slate-950 border-slate-800 text-slate-100 p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Resumen de transacciones por almacén</p>
            <p className="text-base text-slate-200">Total de movimientos y estado financiero.</p>
          </div>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 border border-slate-800">
            {data.length} registros
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-300 text-left text-xs uppercase tracking-[0.12em]">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Operación</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Cajero</th>
                <th className="px-4 py-3 text-right">Entrada</th>
                <th className="px-4 py-3 text-right">Salida</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No se encontraron transacciones para este almacén.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-4 text-slate-100">{r.referencia}</td>
                    <td className="px-4 py-4 text-slate-300">{r.date}</td>
                    <td className="px-4 py-4">
                      <Badge className={tipoColors[r.categoria]}>
                        {r.categoria}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-slate-100">{r.cliente}</td>
                    <td className="px-4 py-4 text-xs text-slate-400">{r.descripcion}</td>
                    <td className="px-4 py-4 text-slate-300">{r.analista}</td>
                    <td className="px-4 py-4 text-right text-emerald-300 font-medium">{fmt(r.entrada)}</td>
                    <td className="px-4 py-4 text-right text-rose-300 font-medium">{fmt(r.salida)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}