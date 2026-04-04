import { useEffect, useState } from "react";
import {
  Package, AlertTriangle, Layers, CheckCircle,
  ShoppingCart, FileText, Copy, Cpu,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { getStats } from "../services/serviparamoService";

interface Stats {
  total_items: number;
  duplicados: number;
  pct_duplicados: number;
  aprobados: number;
  sin_familia: number;
  familias_normalizadas: number;
  grupos_duplicados: number;
  con_embedding: number;
  pct_embedding: number;
  total_categorias: number;
  total_familias_erp: number;
  total_ordenes: number;
  total_pedidos: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getStats()
      .then((data) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Cargando dashboard…</div>;
  if (error || !stats)
    return <div className="p-6 text-red-500">Error cargando datos del backend.</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Panel Principal — Servipáramo
        </h1>
        <p className="text-gray-600">
          Estado actual del catálogo de materiales y sincronización con el ERP
        </p>
      </div>

      {/* Catálogo */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Catálogo de SKUs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total SKUs"
            value={stats.total_items.toLocaleString()}
            description="inv_ina01 sincronizados"
            icon={Package}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatCard
            title="Duplicados"
            value={`${stats.pct_duplicados}%`}
            description={`${stats.duplicados.toLocaleString()} registros en ${stats.grupos_duplicados} grupos`}
            icon={Copy}
            iconColor="bg-yellow-100 text-yellow-600"
          />
          <StatCard
            title="Familias normalizadas"
            value={stats.familias_normalizadas}
            description={`${stats.total_familias_erp} en ERP · ${stats.total_categorias} categorías`}
            icon={Layers}
            iconColor="bg-indigo-100 text-indigo-600"
          />
          <StatCard
            title="Aprobados"
            value={stats.aprobados.toLocaleString()}
            description={`${stats.sin_familia.toLocaleString()} sin familia asignada`}
            icon={CheckCircle}
            iconColor="bg-sp-blue-light text-sp-blue"
          />
        </div>
      </div>

      {/* IA */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Motor de IA
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <StatCard
            title="Embeddings generados"
            value={stats.con_embedding.toLocaleString()}
            description={`${stats.pct_embedding}% del catálogo indexado semánticamente`}
            icon={Cpu}
            iconColor="bg-violet-100 text-violet-600"
          />
          <StatCard
            title="Grupos de duplicados"
            value={stats.grupos_duplicados.toLocaleString()}
            description="Detectados por similitud coseno ≥ 0.92"
            icon={AlertTriangle}
            iconColor="bg-orange-100 text-orange-600"
          />
        </div>
      </div>

      {/* ERP */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Datos ERP sincronizados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <StatCard
            title="Órdenes de Compra"
            value={stats.total_ordenes.toLocaleString()}
            description="com_orden01 — encabezados OC"
            icon={ShoppingCart}
            iconColor="bg-teal-100 text-teal-600"
          />
          <StatCard
            title="Pedidos / Solicitudes"
            value={stats.total_pedidos.toLocaleString()}
            description="com_peda01 — solicitudes internas"
            icon={FileText}
            iconColor="bg-sky-100 text-sky-600"
          />
        </div>
      </div>
    </div>
  );
}
