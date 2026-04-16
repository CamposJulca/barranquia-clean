import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle } from 'lucide-react';

export type RiskLevel = 'low' | 'medium' | 'high';

interface RiskCardProps {
  storeName: string;
  riskLevel: RiskLevel;
  anomalyCount: number;
}

const riskConfig = {
  low: {
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    label: 'Bajo',
    dotColor: 'bg-emerald-400'
  },
  medium: {
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    label: 'Medio',
    dotColor: 'bg-amber-400'
  },
  high: {
    color: 'bg-red-500/15 text-red-300 border-red-500/30',
    label: 'Alto',
    dotColor: 'bg-red-400'
  }
};

export function RiskCard({ storeName, riskLevel, anomalyCount }: RiskCardProps) {
  const config = riskConfig[riskLevel];

  return (
    <Card className="bg-slate-800 border-amber-500/20 p-4 hover:bg-slate-700/60 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-slate-100">{storeName}</h4>
          <p className="text-sm text-amber-200/50 mt-1">{anomalyCount} anomalías detectadas</p>
        </div>
        {riskLevel === 'high' && (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <Badge variant="outline" className={config.color}>
          Riesgo {config.label}
        </Badge>
      </div>
    </Card>
  );
}
