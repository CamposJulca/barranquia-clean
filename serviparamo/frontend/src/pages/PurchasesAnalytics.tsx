import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Package, ShoppingCart, Loader, AlertCircle } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { getStats, getOrdenes, getPedidos } from "../services/serviparamoService";

interface StatsData {
  total_items: number;
  total_ordenes: number;
  total_pedidos: number;
  duplicados: number;
  pct_duplicados: number;
}

interface Orden {
  id: number;
  numfac: string;
  proveedor_id: string;
  fecha_oc: string | null;
  estado: string;
}

const ESTADO_COLORS: Record<string, string> = {
  Activa: "#3b82f6",
  Cerrada: "#10b981",
  Pendiente: "#f59e0b",
  Anulada: "#ef4444",
  Otro: "#8b5cf6",
};

function groupByField<T>(items: T[], key: keyof T): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const val = String(item[key] || "Sin dato");
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
}

export default function PurchasesAnalytics() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsData, ordenesData] = await Promise.all([
          getStats(),
          getOrdenes({ page_size: 200 }),
        ]);
        setStats(statsData);
        const items: Orden[] = ordenesData?.data ?? [];
        setOrdenes(items);
        setEmpty(items.length === 0);
      } catch {
        setEmpty(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Cargando analíticas…</span>
      </div>
    );
  }

  const byEstado = groupByField(ordenes, "estado");
  const byProveedor = groupByField(ordenes, "proveedor_id");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Analíticas de Compras
        </h1>
        <p className="text-gray-600">
          Datos de órdenes de compra y pedidos sincronizados desde el ERP
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Órdenes de Compra"
          value={stats?.total_ordenes?.toLocaleString() ?? "—"}
          description="Sincronizadas desde el ERP"
          icon={ShoppingCart}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Pedidos / Solicitudes"
          value={stats?.total_pedidos?.toLocaleString() ?? "—"}
          description="Registros com_peda01"
          icon={Package}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="SKUs en Catálogo"
          value={stats?.total_items?.toLocaleString() ?? "—"}
          description={`${stats?.pct_duplicados ?? 0}% duplicados`}
          icon={TrendingUp}
          iconColor="bg-green-100 text-green-600"
        />
      </div>

      {empty ? (
        /* Estado vacío: ETL no ejecutado aún */
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Sin datos de compras aún
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Las tablas de órdenes y pedidos están vacías. Ejecuta el ETL desde
              <strong> Configuración → Sincronización ERP</strong> para importar los datos
              del ERP de Servipáramo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gráfico por estado */}
          {byEstado.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>OC por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={byEstado}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {byEstado.map((_, index) => (
                          <Cell
                            key={index}
                            fill={Object.values(ESTADO_COLORS)[index % Object.values(ESTADO_COLORS).length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top proveedores */}
              {byProveedor.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Top Proveedores por OC</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={byProveedor} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="OCs" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tabla de órdenes recientes */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Órdenes de Compra Recientes ({ordenes.length} mostradas)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">N° OC</th>
                      <th className="text-left p-3 font-medium text-gray-600">Proveedor</th>
                      <th className="text-left p-3 font-medium text-gray-600">Fecha</th>
                      <th className="text-left p-3 font-medium text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenes.slice(0, 50).map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 font-mono text-gray-700">{o.numfac}</td>
                        <td className="p-3 text-gray-600 max-w-xs truncate">
                          {o.proveedor_id || "—"}
                        </td>
                        <td className="p-3 text-gray-600">
                          {o.fecha_oc
                            ? new Date(o.fecha_oc).toLocaleDateString("es-CO")
                            : "—"}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {o.estado || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
