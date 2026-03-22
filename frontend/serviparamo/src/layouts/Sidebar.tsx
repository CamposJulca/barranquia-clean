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
    <div className="flex flex-col w-64 bg-sp-navy text-white border-r border-sp-navy-border h-screen">

      {/* HEADER — logo institucional */}
      <div className="flex items-center h-16 px-5 border-b border-sp-navy-border">
        <div className="flex items-center gap-3">
          {/* Ícono con acento cyan — evoca la flecha del logo */}
          <div className="w-9 h-9 rounded-lg bg-sp-blue flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base leading-none">SP</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide uppercase">Serviparamo</h1>
            <p className="text-xs text-sp-cyan">Gestor de Catálogo IA</p>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-sp-blue text-white shadow-md"
                  : "text-white/70 hover:bg-sp-navy-dark hover:text-white"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-sp-cyan" : ""}`} />
              <span className="text-sm font-medium">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1 h-4 rounded-full bg-sp-cyan" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="px-3 py-4 border-t border-sp-navy-border">
        <a
          href="http://localhost:5175"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-sp-navy-dark hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
          <span className="text-sm font-medium">Volver al Hub</span>
        </a>
      </div>
    </div>
  );
}