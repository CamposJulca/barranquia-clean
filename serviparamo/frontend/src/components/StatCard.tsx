import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string; // ✅ AQUI ESTA LA CLAVE
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "bg-gray-100 text-gray-600",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <h2 className="text-2xl font-semibold text-gray-900">
            {value}
          </h2>

          {/* ✅ NUEVO */}
          {description && (
            <p className="text-xs text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>

        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}