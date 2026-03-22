import { Link } from "react-router";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-slate-200">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 mt-4">Página no encontrada</h2>
        <p className="text-slate-600 mt-2">La página que buscas no existe</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}