import { Link } from "react-router";
import { BarChart3, AlertTriangle, BookOpen, ArrowRight } from "lucide-react";
import Card from "../components/Card";

export default function Dashboard() {
  const modules = [
    {
      name: "Avantika",
      description: "Sistema de predicción de demanda e inventario inteligente",
      icon: BarChart3,
      color: "bg-blue-500",
      path: "/avantika",
      stats: { skus: 8, alerts: 3 }
    },
    {
      name: "Joz",
      description: "Sistema de alertas y notificaciones",
      icon: AlertTriangle,
      color: "bg-yellow-500",
      path: "/joz/alertas",
      stats: { alerts: 12 }
    },
    {
      name: "Serviparamo",
      description: "Catálogo de productos y servicios",
      icon: BookOpen,
      color: "bg-green-500",
      path: "/serviparamo/catalogo",
      stats: { products: 45 }
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">BarranquIA Hub</h1>
        <p className="text-slate-600 mt-1">Plataforma de Analítica e Inteligencia de Negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link key={module.name} to={module.path}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className={`${module.color} p-3 rounded-lg`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mt-4">{module.name}</h3>
              <p className="text-sm text-slate-600 mt-2">{module.description}</p>
              
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                {Object.entries(module.stats).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500 capitalize">{key}</p>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Actividad Reciente">
        <div className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Nueva predicción generada en Avantika</p>
              <p className="text-xs text-slate-500">Hace 5 minutos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Alerta de stock crítico en SKU-003</p>
              <p className="text-xs text-slate-500">Hace 1 hora</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Catálogo actualizado en Serviparamo</p>
              <p className="text-xs text-slate-500">Hace 3 horas</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}