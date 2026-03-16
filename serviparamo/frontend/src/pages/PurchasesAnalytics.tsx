import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

import { TrendingUp, DollarSign, Package, Users } from "lucide-react";
import { StatCard } from "../components/StatCard";

/* =========================
   Helpers
========================= */

const normalizeValue = (value: ValueType | undefined): number => {
  if (Array.isArray(value)) return Number(value[0] ?? 0);
  return Number(value ?? 0);
};

const tooltipFormatter = (
  value: ValueType | undefined,
  name: NameType | undefined
): [string | number, string] => {
  const v = normalizeValue(value);
  const label = String(name ?? "");

  if (label === "quantity") return [v, "Cantidad"];
  if (label === "value") return [`$${v.toLocaleString()}`, "Valor"];
  if (label === "purchases") return [v, "Compras"];

  return [v, label];
};

/* =========================
   Data
========================= */

const topPurchasedMaterials = [
  { name: 'Tubería Acero 2"', quantity: 1850, value: 45200 },
  { name: "Interruptor Termomag 20A", quantity: 1420, value: 38500 },
  { name: "Cable Cobre 12 AWG", quantity: 1280, value: 35600 },
  { name: "Filtro HVAC", quantity: 1100, value: 28400 },
  { name: "Conducto PVC", quantity: 980, value: 22100 },
  { name: "Gafas de Seguridad", quantity: 850, value: 18900 },
  { name: 'Válvula de Bola 1"', quantity: 720, value: 16200 },
  { name: "Amarras de Cable", quantity: 650, value: 12800 },
];

const purchasesByAgency = [
  { agency: "Depto. Ingeniería", purchases: 2450, budget: 125000 },
  { agency: "Mantenimiento", purchases: 1890, budget: 95000 },
  { agency: "Construcción", purchases: 1650, budget: 110000 },
  { agency: "Operaciones", purchases: 1230, budget: 75000 },
  { agency: "Instalaciones", purchases: 980, budget: 60000 },
];

const purchasesByCategoryData = [
  { name: "Eléctricos", value: 32, color: "#3b82f6" },
  { name: "Plomería", value: 25, color: "#10b981" },
  { name: "HVAC", value: 18, color: "#f59e0b" },
  { name: "Herramientas", value: 15, color: "#8b5cf6" },
  { name: "Seguridad", value: 10, color: "#ef4444" },
];

const monthlyTrends = [
  { month: "Sep", purchases: 2100, value: 52000 },
  { month: "Oct", purchases: 2350, value: 58000 },
  { month: "Nov", purchases: 2180, value: 54500 },
  { month: "Dic", purchases: 2450, value: 61000 },
  { month: "Ene", purchases: 2680, value: 67500 },
  { month: "Feb", purchases: 2820, value: 71200 },
  { month: "Mar", purchases: 2950, value: 74800 },
];

/* =========================
   Component
========================= */

export default function PurchasesAnalytics() {
  return (
    <div className="p-6 space-y-6">

      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Analíticas de Compras
        </h1>

        <p className="text-gray-600">
          Rastree y analice las actividades de compras en su organización
        </p>
      </div>

      {/* KPI Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard
          title="Total de Compras"
          value="17,200"
          change="+12.5% vs mes anterior"
          changeType="positive"
          icon={Package}
          iconColor="bg-blue-100 text-blue-600"
        />

        <StatCard
          title="Valor de Compras"
          value="$465K"
          change="+8.3% vs mes anterior"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
        />

        <StatCard
          title="Agencias Activas"
          value="5"
          change="Todas las agencias activas"
          changeType="neutral"
          icon={Users}
          iconColor="bg-purple-100 text-purple-600"
        />

        <StatCard
          title="Valor Promedio Orden"
          value="$27.03"
          change="-2.1% vs mes anterior"
          changeType="negative"
          icon={TrendingUp}
          iconColor="bg-yellow-100 text-yellow-600"
        />

      </div>

      {/* Top Materials */}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Materiales Más Comprados</CardTitle>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={350}>

            <BarChart data={topPurchasedMaterials} layout="vertical">

              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

              <XAxis type="number" />

              <YAxis
                type="category"
                dataKey="name"
                width={180}
              />

              <Tooltip
                formatter={tooltipFormatter}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />

              <Bar
                dataKey="quantity"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />

            </BarChart>

          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agency + Category */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Compras por Agencia</CardTitle>
          </CardHeader>

          <CardContent>

            <ResponsiveContainer width="100%" height={300}>

              <BarChart data={purchasesByAgency}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="agency"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />

                <YAxis />

                <Tooltip
                  formatter={tooltipFormatter}
                />

                <Bar
                  dataKey="purchases"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </CardContent>
        </Card>

        {/* Category Pie */}

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
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={100}
                  dataKey="value"
                >

                  {purchasesByCategoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </CardContent>
        </Card>

      </div>

      {/* Monthly Trend */}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Tendencias de Compras (Últimos 7 Meses)</CardTitle>
        </CardHeader>

        <CardContent>

          <ResponsiveContainer width="100%" height={300}>

            <LineChart data={monthlyTrends}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

              <YAxis yAxisId="left" />

              <YAxis yAxisId="right" orientation="right" />

              <Tooltip
                formatter={tooltipFormatter}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="purchases"
                stroke="#3b82f6"
                strokeWidth={2}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
              />

            </LineChart>

          </ResponsiveContainer>

        </CardContent>
      </Card>

    </div>
  );
}

