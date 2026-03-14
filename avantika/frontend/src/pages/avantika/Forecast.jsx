import Card from "../../components/Card";
import ForecastChart from "../../features/forecast/components/ForecastChart";
import forecastData from "../../mock/forecast.json";
import { TrendingUp, Calendar, Target, Activity } from "lucide-react";
import StatCard from "../../components/StatCard";

export default function Forecast() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Predicción de Demanda</h1>
        <p className="text-slate-600 mt-1">Análisis predictivo basado en machine learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Precisión Modelo"
          value="94.2%"
          change="+2.1% vs mes anterior"
          trend="up"
          icon={Target}
          iconColor="bg-green-500"
        />
        <StatCard
          title="Período Predicción"
          value="14 días"
          change="Actualizado hoy"
          trend="neutral"
          icon={Calendar}
          iconColor="bg-blue-500"
        />
        <StatCard
          title="Tendencia"
          value="+6.8%"
          change="Crecimiento sostenido"
          trend="up"
          icon={TrendingUp}
          iconColor="bg-purple-500"
        />
        <StatCard
          title="Volatilidad"
          value="Baja"
          change="±3.2% desviación"
          trend="neutral"
          icon={Activity}
          iconColor="bg-orange-500"
        />
      </div>

      <Card title="Gráfico de Predicción">
        <ForecastChart data={forecastData} />
      </Card>

      <Card title="Métricas del Modelo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">MAE (Error Absoluto Medio)</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">8.5</p>
            <p className="text-xs text-blue-700 mt-1">unidades</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900">RMSE (Raíz del Error Cuadrático Medio)</p>
            <p className="text-3xl font-bold text-green-600 mt-2">12.3</p>
            <p className="text-xs text-green-700 mt-1">unidades</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-900">R² (Coeficiente de Determinación)</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">0.942</p>
            <p className="text-xs text-purple-700 mt-1">de ajuste</p>
          </div>
        </div>
      </Card>
    </div>
  );
}