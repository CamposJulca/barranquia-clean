interface StatusBadgeProps {
  status: "normalized" | "duplicate" | "pending" | "resolved" | "active";
}

const statusConfig = {
  normalized: {
    label: "Normalizado",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  duplicate: {
    label: "Duplicado",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  pending: {
    label: "Pendiente de Revisión",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  resolved: {
    label: "Resuelto",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  active: {
    label: "Activo",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}