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
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Bajo',
    dotColor: 'bg-green-500'
  },
  medium: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Medio',
    dotColor: 'bg-orange-500'
  },
  high: {
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Alto',
    dotColor: 'bg-red-500'
  }
};

export function RiskCard({ storeName, riskLevel, anomalyCount }: RiskCardProps) {
  const config = riskConfig[riskLevel];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium">{storeName}</h4>
          <p className="text-sm text-gray-500 mt-1">{anomalyCount} anomalías detectadas</p>
        </div>
        {riskLevel === 'high' && (
          <AlertTriangle className="w-5 h-5 text-red-500" />
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
