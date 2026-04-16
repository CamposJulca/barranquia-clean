import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, trend, iconColor = 'text-blue-400' }: StatCardProps) {
  return (
    <Card className="p-6 bg-slate-950 border-slate-800 text-slate-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="text-3xl mt-2 text-slate-100">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-slate-900 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}
