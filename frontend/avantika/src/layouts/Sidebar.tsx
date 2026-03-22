import { Link, useLocation } from "react-router";
import { BarChart3, Package, TrendingUp, ArrowLeft} from "lucide-react";

type NavItem = {
  name: string;
  icon: any;
  path?: string;
  children?: {
    name: string;
    path: string;
    icon: any;
  }[];
};
const navigation: NavItem[] = [
  {
    name: "Avantika",
    icon: BarChart3,
    children: [
      { name: "Vista General", path: "/avantika", icon: BarChart3 },
      { name: "SKUs", path: "/avantika/skus", icon: Package },
      { name: "Predicciónes", path: "/avantika/forecast", icon: TrendingUp },
    ],
  }
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Avantika
        </h1>
        <p className="text-sm text-slate-400 mt-1">Analytics Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-slate-300 text-sm font-medium">
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(child.path)
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <child.icon className="w-4 h-4" />
                      <span>{child.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                to={item.path!}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.path!)
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
<div className="p-4 border-t border-slate-800">
  <a
    href="http://localhost:5175"
    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
  >
    <ArrowLeft className="w-5 h-5" />
    <span>Volver</span>
  </a>
</div>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Usuario</p>
            <p className="text-xs text-slate-400 truncate">usuario@innova.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}