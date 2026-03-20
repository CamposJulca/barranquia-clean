import { useEffect, useState } from "react";
import { Package, AlertTriangle, Layers, CheckCircle } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { getStats } from "../services/serviparamoService";

interface Stats {
  total_items: number;
  duplicados: number;
  pct_duplicados: number;
  aprobados: number;
  sin_familia: number;
  familias_normalizadas: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        console.log("BACKEND REAL:", data);
        setStats(data);
      } catch (err) {
        console.error("Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="p-6">Cargando dashboard...</div>;
  if (error || !stats)
    return <div className="p-6 text-red-500">Error cargando datos</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Resumen del Catálogo
        </h1>
        <p className="text-gray-600">
          Métricas principales del sistema ServiPáramo
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <StatCard
          title="Total ítems"
          value={stats.total_items.toLocaleString()}
          icon={Package}
          iconColor="bg-blue-100 text-blue-600"
        />

        <StatCard
          title="% Duplicados"
          value={`${stats.pct_duplicados}%`}
          description={`${stats.duplicados.toLocaleString()} registros`}
          icon={AlertTriangle}
          iconColor="bg-yellow-100 text-yellow-600"
        />

        <StatCard
          title="Familias"
          value={stats.familias_normalizadas}
          icon={Layers}
          iconColor="bg-indigo-100 text-indigo-600"
        />

        <StatCard
          title="Aprobados"
          value={stats.aprobados}
          icon={CheckCircle}
          iconColor="bg-green-100 text-green-600"
        />

      </div>
    </div>
  );
}