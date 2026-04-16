import logo from "../assets/images/logo-serviparamo.png";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Search,
  Copy,
  Workflow,
  BarChart3,
  Settings,
  Terminal,
  ArrowLeft,
} from "lucide-react";

const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/'

const navigation = [
  { name: "Panel Principal", href: "/", icon: LayoutDashboard },
  { name: "Catálogo", href: "/catalog", icon: Database },
  { name: "Búsqueda Semántica", href: "/search", icon: Search },
  { name: "Duplicados", href: "/duplicates", icon: Copy },
  { name: "Normalización", href: "/normalization", icon: Workflow },
  { name: "Analíticas", href: "/analytics", icon: BarChart3 },
  { name: "Consola SQL", href: "/query", icon: Terminal },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-70 bg-sp-primary text-white h-screen">

      {/* HEADER */}
      <div className="flex items-center px-5 py-4 border-b border-white/10 gap-3">

        <a
          href={HUB_URL}
          className="group"
        >
          <div className="w-18 h-18 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm transition group-hover:scale-105 group-hover:shadow-lg">
            <img
              src={logo}
              alt="Ir al Hub"
              className="w-full h-full object-contain p-1"
            />
          </div>
        </a>
        <div className="leading-tight">
          <h1 className="font-bold text-sm uppercase tracking-wide">
            Serviparamo
          </h1>
          <p className="text-xs text-white/70">
           Gestor de Catálogo IA
          </p>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-sp-green text-white shadow-md"
                  : "text-white/80 hover:bg-sp-primary-dark"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.name}</span>

              {isActive && (
                <span className="ml-auto w-1 h-4 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
