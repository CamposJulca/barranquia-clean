import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  trend = "neutral", 
  icon: Icon,
  iconColor = "bg-blue-500"
}: StatCardProps) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-slate-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${trendColors[trend]}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`${iconColor} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}