import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Loader,
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import { getDuplicados, aprobarSKU } from "../services/serviparamoService";

interface SKUItem {
  id: number;
  codigo: string;
  familia: string;
  familia_normalizada: string;
  categoria: string;
  nombre: string;
  nombre1: string;
  unidad: string;
  es_duplicado: boolean;
  aprobado: boolean;
}

interface Grupo {
  grupo_duplicado: number;
  total: number;
  aprobados: number;
  familia_sugerida: string;
  items: SKUItem[];
}

interface DupsResponse {
  total_grupos: number;
  page: number;
  page_size: number;
  grupos: Grupo[];
}

export default function DuplicateDetection() {
  const [data, setData] = useState<DupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [approving, setApproving] = useState(false);

  const fetchDuplicados = async (p: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await getDuplicados({ page: p, page_size: 10 });
      setData(res);
      setGroupIndex(0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDuplicados(page); }, [page]);

  const handleAprobarGrupo = async (grupo_id: number) => {
    setApproving(true);
    try {
      await aprobarSKU({ grupo_id });
      await fetchDuplicados(page);
    } catch {
      // silently handle
    } finally {
      setApproving(false);
    }
  };

  const handleNext = () => {
    if (!data) return;
    if (groupIndex < data.grupos.length - 1) {
      setGroupIndex(groupIndex + 1);
    } else if (page < Math.ceil(data.total_grupos / 10)) {
      setPage(page + 1);
    }
  };

  const handlePrevious = () => {
    if (!data) return;
    if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
    } else if (page > 1) {
      setPage(page - 1);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Cargando grupos de duplicados…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        Error cargando duplicados del backend.
      </div>
    );
  }

  if (!data || data.total_grupos === 0) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No hay duplicados detectados
          </h2>
          <p className="text-gray-600">
            Ejecuta el ETL y la normalización para detectar SKUs duplicados.
          </p>
        </div>
      </div>
    );
  }

  const grupo = data.grupos[groupIndex];
  const globalIndex = (page - 1) * 10 + groupIndex + 1;
  const totalPages = Math.ceil(data.total_grupos / 10);
  const isFirst = page === 1 && groupIndex === 0;
  const isLast = page >= totalPages && groupIndex >= data.grupos.length - 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Detección de Duplicados
          </h1>
          <p className="text-gray-600">
            {data.total_grupos.toLocaleString()} grupos de SKUs duplicados detectados por IA
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{globalIndex} de {data.total_grupos}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handlePrevious} disabled={isFirst || loading}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={isLast || loading}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info del grupo */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold">{grupo.total}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">SKUs en este grupo</p>
                <p className="text-sm text-gray-600">
                  Familia sugerida: <span className="font-medium">{grupo.familia_sugerida || "Sin familia"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {grupo.aprobados > 0 && (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {grupo.aprobados} aprobados
                </Badge>
              )}
              <Badge variant="outline" className="bg-white">
                Grupo #{grupo.grupo_duplicado}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de SKUs del grupo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grupo.items.map((sku, i) => (
          <Card key={sku.id} className={`shadow-sm ${sku.aprobado ? "border-green-300" : ""}`}>
            <CardHeader className="bg-gray-50 border-b py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="text-gray-500">SKU {i + 1}</span>
                <Badge variant="secondary" className="font-mono text-xs">{sku.codigo}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">NOMBRE</p>
                <p className="font-medium text-gray-900 text-sm">
                  {sku.nombre || <span className="italic text-gray-400">Sin nombre</span>}
                </p>
              </div>
              {sku.nombre1 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-0.5">DESCRIPCIÓN</p>
                    <p className="text-sm text-gray-700">{sku.nombre1}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-0.5">CATEGORÍA</p>
                  <p className="text-sm text-gray-900">{sku.categoria || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-0.5">FAMILIA</p>
                  <p className="text-sm text-gray-900">{sku.familia_normalizada || sku.familia || "—"}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">UNIDAD</p>
                <p className="text-sm text-gray-900">{sku.unidad || "—"}</p>
              </div>
              {sku.aprobado && (
                <Badge className="bg-green-100 text-green-700 border-green-200 mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Aprobado
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Acciones */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleNext}
              disabled={isLast || loading}
              className="min-w-32"
            >
              Omitir grupo
            </Button>
            <Button
              size="lg"
              onClick={() => handleAprobarGrupo(grupo.grupo_duplicado)}
              disabled={approving || grupo.aprobados === grupo.total}
              className="min-w-40 bg-green-600 hover:bg-green-700"
            >
              {approving ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" />Aprobando…</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Aprobar Grupo</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
