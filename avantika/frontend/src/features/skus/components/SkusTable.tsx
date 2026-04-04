/*import React from 'react';
import Table from "../../../components/Table";


export function SkusTable({ skus }) {
  const columns = [
  { key: 'sku_id', header: 'SKU' },
  { key: 'nombre_producto', header: 'Producto' },
  { key: 'categoria', header: 'Categoría' },
  { key: 'demanda_mensual', header: 'Demanda Mensual' },
  { key: 'stock_actual', header: 'Stock Actual' },
];

  return (
    <Table
      data={skus}
      columns={columns}
      rowKey={(row) => String(row.sku_id)}
    />
  );
}

export default SkusTable;
*/import { AlertCircle, Package } from "lucide-react";

interface Sku {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  precio: number;
  demandaPromedio: number;
  nivelReorden: number;
  proveedor: string;
  ultimaActualizacion: string;
}

interface SkusTableProps {
  skus: Sku[];
}

export default function SkusTable({ skus }: SkusTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStockStatus = (stock: number, nivelReorden: number) => {
    if (stock <= nivelReorden * 0.5) {
      return { color: 'bg-red-100 text-red-800', label: 'Crítico', icon: true };
    } else if (stock <= nivelReorden) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Bajo', icon: true };
    }
    return { color: 'bg-green-100 text-green-800', label: 'Normal', icon: false };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SKU</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Producto</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Categoría</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Precio</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Demanda Prom.</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Proveedor</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => {
            const status = getStockStatus(sku.stock, sku.nivelReorden);
            return (
              <tr key={sku.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-sm font-mono text-slate-900">{sku.id}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">{sku.nombre}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{sku.categoria}</td>
                <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">{sku.stock}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.icon && <AlertCircle className="w-3 h-3" />}
                      {status.label}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-900 text-right">{formatCurrency(sku.precio)}</td>
                <td className="py-3 px-4 text-sm text-slate-600 text-right">{sku.demandaPromedio}/mes</td>
                <td className="py-3 px-4 text-sm text-slate-600">{sku.proveedor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}