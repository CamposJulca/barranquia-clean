import { Package, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const materialsByCategoryData = [
  { category: "Eléctricos", count: 3420 },
  { category: "Mecánicos", count: 2890 },
  { category: "Plomería", count: 2150 },
  { category: "HVAC", count: 1820 },
  { category: "Herramientas", count: 1450 },
  { category: "Seguridad", count: 980 },
];

const purchasesByCategoryData = [
  { name: "Eléctricos", value: 35, color: "#3b82f6" },
  { name: "Mecánicos", value: 28, color: "#8b5cf6" },
  { name: "Plomería", value: 18, color: "#10b981" },
  { name: "HVAC", value: 12, color: "#f59e0b" },
  { name: "Otros", value: 7, color: "#6b7280" },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Panel Principal</h1>
        <p className="text-gray-600">
          Vista general de su sistema de gestión de catálogo impulsado por IA
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Materiales"
          value="12,710"
          change="+245 este mes"
          changeType="positive"
          icon={Package}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Catálogo Normalizado"
          value="87.5%"
          change="+5.2% vs mes anterior"
          changeType="positive"
          icon={CheckCircle}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Duplicados Detectados"
          value="342"
          change="18 pendientes de revisión"
          changeType="neutral"
          icon={AlertTriangle}
          iconColor="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Duplicados Resueltos"
          value="1,247"
          change="+67 esta semana"
          changeType="positive"
          icon={Sparkles}
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Materiales por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materialsByCategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Compras por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={purchasesByCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                   `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {purchasesByCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}