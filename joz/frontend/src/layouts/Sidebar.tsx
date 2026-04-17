import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Bell,
  AlertTriangle,
  History,
  Settings,
  ArrowLeft,
  Activity,
  LogOut,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alertas', icon: Bell },
  { path: '/risks', label: 'Riesgos', icon: AlertTriangle },
  { path: '/history', label: 'Historial', icon: History },
  { path: '/etl', label: 'Monitor ETL', icon: Activity },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 h-screen fixed left-0 top-0 flex flex-col">

  {/* HEADER — logo = botón para volver al Hub */}
  <div className="p-4 border-b border-slate-800">
    <a
      href="/"
      className="flex items-center gap-3 group"
      title="Volver al Hub"
    >
      <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-md transition group-hover:scale-105 group-hover:bg-amber-400">
        <span className="text-white font-black text-sm leading-none">JOZ</span>
      </div>
      <div>
        <p className="text-amber-400 font-bold text-base leading-tight group-hover:text-amber-300 transition">JOZ</p>
        <p className="text-amber-200/60 text-xs">Monitoring System</p>
      </div>
    </a>
  </div>
  
  {/* NAV */}
  <nav className="flex-1 p-4">
    <ul className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-amber-100/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>

  {/* VOLVER AL HUB */}
  <div className="p-4 border-t border-slate-800 space-y-1">
    <a
      href="/"
      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-amber-100/80 hover:bg-slate-800 hover:text-white transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
      <span>Volver al Hub</span>
    </a>
    <button
      onClick={() => {
        localStorage.removeItem('joz_token');
        localStorage.removeItem('joz_username');
        localStorage.removeItem('token');
        window.location.replace('/joz/login');
      }}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-400/80 hover:bg-red-900/30 hover:text-red-300 transition-colors"
    >
      <LogOut className="w-5 h-5" />
      <span>Cerrar sesión</span>
    </button>
  </div>

  {/* FOOTER */}
  <div className="p-4 border-t border-slate-800">
    <p className="text-xs text-amber-200/50">
      © {new Date().getFullYear()} JOZ System
    </p>
  </div>
</aside>
  );
}