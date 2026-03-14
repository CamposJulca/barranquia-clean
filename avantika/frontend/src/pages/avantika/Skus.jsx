import Card from "../../components/Card";
import SkusTable from "../../features/skus/components/SkusTable";
import skusData from "../../mock/skus.json";
import { Package, Upload, Download, Plus } from "lucide-react";

export default function Skus() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de SKUs</h1>
          <p className="text-slate-600 mt-1">Administra y visualiza tu inventario de productos</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Importar</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Exportar</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Nuevo SKU</span>
          </button>
        </div>
      </div>

      <Card>
        <SkusTable skus={skusData} />
      </Card>
    </div>
  );
}