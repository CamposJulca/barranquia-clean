import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ForecastData {
  fecha: string;
  demandaReal: number | null;
  prediccion: number;
  limiteInferior: number;
  limiteSuperior: number;
}

interface ForecastChartProps {
  data: ForecastData[];
}

export default function ForecastChart({ data }: ForecastChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-semibold text-slate-900 mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">{entry.value?.toFixed(0)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPrediccion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="fecha" 
          tickFormatter={formatDate}
          tick={{ fill: '#64748b', fontSize: 12 }}
          stroke="#cbd5e1"
        />
        <YAxis 
          tick={{ fill: '#64748b', fontSize: 12 }}
          stroke="#cbd5e1"
          label={{ value: 'Unidades', angle: -90, position: 'insideLeft', fill: '#64748b' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        
        {/* Área de confianza */}
        <Area
          type="monotone"
          dataKey="limiteSuperior"
          stroke="none"
          fill="#dbeafe"
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="limiteInferior"
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
        />
        
        {/* Línea de predicción */}
        <Line
          type="monotone"
          dataKey="prediccion"
          stroke="#3b82f6"
          strokeWidth={3}
          name="Predicción"
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
        
        {/* Línea de demanda real */}
        <Line
          type="monotone"
          dataKey="demandaReal"
          stroke="#10b981"
          strokeWidth={3}
          name="Demanda Real"
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}