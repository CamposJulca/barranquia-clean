import { Link } from "react-router-dom";
import { BarChart3, Package, TrendingUp, AlertTriangle, Book } from "lucide-react";

export default function Sidebar() {

  return (
    <aside className="w-64 bg-[#0B1B34] text-white flex flex-col justify-between">

      <div>

        {/* LOGO */}

        <div className="p-6 border-b border-blue-900">
          <h1 className="text-xl font-bold text-blue-400">
            BarranquIA Hub
          </h1>

          <p className="text-sm text-gray-400">
            Analytics Platform
          </p>
        </div>

        {/* MENU */}

        <nav className="p-4 flex flex-col gap-2">

          {/* AVANTIKA */}

          <p className="text-xs text-gray-400 mt-4">Avantika</p>

          <Link
            to="/avantika"
            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-700 transition"
          >
            <BarChart3 size={18}/>
            Vista General
          </Link>

          <Link
            to="/skus"
            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-700 transition"
          >
            <Package size={18}/>
            SKUs
          </Link>

          <Link
            to="/forecast"
            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-700 transition"
          >
            <TrendingUp size={18}/>
            Predicción
          </Link>

          {/* JOZ */}

          <p className="text-xs text-gray-400 mt-6">Joz</p>

          <Link
            to="/alertas"
            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-700 transition"
          >
            <AlertTriangle size={18}/>
            Alertas
          </Link>

          {/* SERVIPARAMO */}

          <p className="text-xs text-gray-400 mt-6">Serviparamo</p>

          <Link
            to="/catalogo"
            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-700 transition"
          >
            <Book size={18}/>
            Catálogo
          </Link>

        </nav>
      </div>

      {/* USER */}

      <div className="p-6 border-t border-blue-900 flex items-center gap-3">

        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
          U
        </div>

        <div>
          <p className="text-sm font-medium">
            Usuario
          </p>

          <p className="text-xs text-gray-400">
            usuario@innova.com
          </p>
        </div>

      </div>

    </aside>
  );
}