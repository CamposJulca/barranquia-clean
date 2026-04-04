import { Package, TrendingUp, AlertTriangle, DollarSign, Download, Filter, RefreshCw } from "lucide-react";
import Card from "../../components/Card";
import StatCard from "../../components/StatCard";
import SkusTable from "../../features/skus/components/SkusTable";
import ForecastChart from "../../features/forecast/components/ForecastChart";
import skusData from "../../mock/skus.json";
import forecastData from "../../mock/forecast.json";

export default function VistaGeneral() {

  // Estadísticas
  const totalSkus = skusData.length;

  const skusEnRiesgo = skusData.filter(
    sku => sku.stock <= sku.nivelReorden
  ).length;

  const valorInventario = skusData.reduce(
    (sum, sku) => sum + (sku.stock * sku.precio),
    0
  );

  const demandaTotal = skusData.reduce(
    (sum, sku) => sum + sku.demandaPromedio,
    0
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Avantika · Vista General
          </h1>

          <p className="text-slate-600 mt-1">
            Resumen del sistema de inventario y predicción de demanda
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4"/>
            <span className="text-sm font-medium">Filtros</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4"/>
            <span className="text-sm font-medium">Exportar</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4"/>
            <span className="text-sm font-medium">Actualizar</span>
          </button>

        </div>

      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard
          title="Total SKUs"
          value={totalSkus}
          change="+12% vs mes anterior"
          trend="up"
          icon={Package}
          iconColor="bg-blue-500"
        />

        <StatCard
          title="SKUs en Riesgo"
          value={skusEnRiesgo}
          change={`${((skusEnRiesgo / totalSkus) * 100).toFixed(0)}% del inventario`}
          trend="down"
          icon={AlertTriangle}
          iconColor="bg-red-500"
        />

        <StatCard
          title="Valor Inventario"
          value={`$${(valorInventario / 1000000).toFixed(1)}M`}
          change="+8.5% este mes"
          trend="up"
          icon={DollarSign}
          iconColor="bg-green-500"
        />

        <StatCard
          title="Demanda Total"
          value={`${demandaTotal}/mes`}
          change="+5.2% tendencia"
          trend="up"
          icon={TrendingUp}
          iconColor="bg-purple-500"
        />

      </div>

      {/* FORECAST */}

      <Card
        title="Predicción de Demanda"
        subtitle="Proyección para los próximos 14 días"
      >

        <ForecastChart data={forecastData} />

      </Card>

      {/* TABLA SKUS */}

      <Card
        title="Inventario de SKUs"
        subtitle="Productos y niveles de stock"
      >

        <SkusTable skus={skusData} />

      </Card>

      {/* ALERTAS */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card title="Alertas y Recomendaciones">

          <div className="space-y-4">

            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">

              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5"/>

              <div>
                <p className="text-sm font-semibold text-red-900">
                  Stock Crítico
                </p>

                <p className="text-sm text-red-700 mt-1">
                  Batería 75Ah AGM está por debajo del nivel recomendado
                </p>
              </div>

            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">

              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5"/>

              <div>
                <p className="text-sm font-semibold text-yellow-900">
                  Reorden Sugerido
                </p>

                <p className="text-sm text-yellow-700 mt-1">
                  3 productos necesitan reposición en los próximos días
                </p>
              </div>

            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">

              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5"/>

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Tendencia Positiva
                </p>

                <p className="text-sm text-blue-700 mt-1">
                  La demanda de lubricantes aumentó esta semana
                </p>
              </div>

            </div>

          </div>

        </Card>

        {/* CATEGORÍAS */}

        <Card title="Productos por Categoría">

          <div className="space-y-3">

            {[
              { name: "Lubricantes", percentage: 20, color: "bg-blue-500" },
              { name: "Filtros", percentage: 15, color: "bg-green-500" },
              { name: "Baterías", percentage: 10, color: "bg-yellow-500" },
              { name: "Frenos", percentage: 18, color: "bg-red-500" },
              { name: "Neumáticos", percentage: 12, color: "bg-purple-500" },
              { name: "Fluidos", percentage: 8, color: "bg-pink-500" },
              { name: "Suspensión", percentage: 9, color: "bg-indigo-500" },
              { name: "Encendido", percentage: 8, color: "bg-cyan-500" }
            ].map((cat, i) => (

              <div key={i}>

                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{cat.name}</span>
                  <span className="text-slate-600">{cat.percentage}%</span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full">

                  <div
                    className={`${cat.color} h-2 rounded-full`}
                    style={{ width: `${cat.percentage}%` }}
                  />

                </div>

              </div>

            ))}

          </div>

        </Card>

      </div>

    </div>
  );
}