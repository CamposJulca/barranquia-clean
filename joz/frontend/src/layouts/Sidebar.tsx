import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Bell, 
  AlertTriangle, 
  History, 
  Settings,
  ArrowLeft
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
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold">JOZ</h1>
        <p className="text-sm text-slate-400 mt-1">Monitoring System</p>
      </div>
      
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
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
      
<div className="p-4 border-t border-slate-800">
  <button
    onClick={() => window.location.href = "http://localhost:5175"}
    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
  >
    <ArrowLeft className="w-5 h-5" />
    <span>Volver</span>
  </button>
</div>


      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">©  {new Date().getFullYear()} JOZ System</p>
      </div>
    </aside>
  );
}
