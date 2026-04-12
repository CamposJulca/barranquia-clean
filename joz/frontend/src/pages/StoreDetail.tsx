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
  Empeño: 'bg-purple-100 text-purple-700',
  Retiro: 'bg-orange-100 text-orange-700',
  Abono: 'bg-blue-100 text-blue-700',
  Apertura: 'bg-green-100 text-green-700',
  Cierre: 'bg-gray-200 text-gray-700',
  Otro: 'bg-gray-100 text-gray-700',
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

      <h1 className="text-3xl font-light">Almacén: {name}</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Transacciones" value={data.length} icon={Activity} />
        <StatCard title="Ingresos" value={fmt(totalEntrada)} icon={ArrowDownCircle} />
        <StatCard title="Retiros" value={fmt(totalSalida)} icon={ArrowUpCircle} />
        <StatCard title="Balance" value={fmt(totalEntrada - totalSalida)} icon={DollarSign} />
      </div>

      <Card>
        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b">
            <tr>
              <th>Ref</th>
              <th>Fecha</th>
              <th>Operación</th>
              <th>Cliente</th>
              <th>Descripción</th>
              <th>Cajero</th>
              <th>Entrada</th>
              <th>Salida</th>
            </tr>
          </thead>

          <tbody>
            {data.map((r) => (
              <tr key={r.id}>

                <td>{r.referencia}</td>
                <td>{r.date}</td>
                <td>
                  <Badge className={tipoColors[r.categoria]}>
                    {r.categoria}
                  </Badge>
                </td>

                <td>{r.cliente}</td>

                <td className="text-xs">
                  {r.descripcion}
                </td>

                <td>{r.analista}</td>

                {/* 🔥 VERDE */}
                <td className="text-green-700 font-medium">
                  {fmt(r.entrada)}
                </td>

                {/* 🔥 ROJO */}
                <td className="text-red-700 font-medium">
                  {fmt(r.salida)}
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </Card>

    </div>
  )
}