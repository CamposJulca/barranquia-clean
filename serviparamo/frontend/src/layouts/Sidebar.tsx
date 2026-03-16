import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Database,
  Search,
  Copy,
  Workflow,
  ShoppingCart,
  BarChart3,
  Settings,
  ArrowLeft,
} from "lucide-react";

const navigation = [
  { name: "Panel Principal", href: "/", icon: LayoutDashboard },
  { name: "Catálogo", href: "/catalog", icon: Database },
  { name: "Búsqueda Semántica", href: "/search", icon: Search },
  { name: "Detección de Duplicados", href: "/duplicates", icon: Copy },
  { name: "Normalización", href: "/normalization", icon: Workflow },
  //{ name: "Compras", href: "/purchases", icon: ShoppingCart },
  { name: "Analíticas", href: "/analytics", icon: BarChart3 },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold">S</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Serviparamo</h1>
            <p className="text-xs text-gray-500">AI Catalog Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200">
  <a
    href="http://localhost:5175"
    className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
  >
    <ArrowLeft className="w-5 h-5" />
    <span className="text-sm font-medium">Volver</span>
  </a>
</div>
    </div>
  );
}