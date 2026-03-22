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
  { name: "Analíticas", href: "/analytics", icon: BarChart3 },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-green-900 text-white border-r border-green-800 h-screen">
      
      {/* HEADER */}
      <div className="flex items-center h-16 px-6 border-b border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <span className="text-white font-semibold">S</span>
          </div>
          <div>
            <h1 className="font-semibold text-white">Serviparamo</h1>
            <p className="text-xs text-green-200">AI Catalog Manager</p>
          </div>
        </div>
      </div>

      {/* NAV */}
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
                  ? "bg-green-600 text-white shadow-md"
                  : "text-green-100 hover:bg-green-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="px-3 py-4 border-t border-green-800">
        <a
          href="http://localhost:5175"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Volver</span>
        </a>
      </div>
    </div>
  );
}