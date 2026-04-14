import logo from "../assets/images/logo-superefectivo.png";
import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Bell, 
  AlertTriangle, 
  History, 
  Settings
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alertas', icon: Bell },
  { path: '/risks', label: 'Riesgos', icon: AlertTriangle },
  { path: '/history', label: 'Historial', icon: History },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#1f1a12] text-white h-screen fixed left-0 top-0 flex flex-col">

      {/* HEADER CON LOGO */}
      <div className="p-4 border-b border-[#2d2418]">

        <button
          onClick={() => window.location.href = "http://localhost:5175"}
          className="group w-full flex items-center justify-center"
        >
          {/* LOGO SIN FONDO BLANCO */}
          <div className="w-full h-14 flex items-center justify-center overflow-hidden transition group-hover:scale-105">
            <img
              src={logo}
              alt="Superefectivo"
              className="h-14 object-contain"
            />
          </div>
        </button>

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
                      : 'text-amber-100/80 hover:bg-[#2a2217] hover:text-white'
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

      {/* FOOTER */}
      <div className="p-4 border-t border-[#2d2418]">
        <p className="text-xs text-amber-200/50">
          © {new Date().getFullYear()} JOZ System
        </p>
      </div>

    </aside>
  );
}