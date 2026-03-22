import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Search, Filter, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { getSKUs } from "../services/serviparamoService";

interface SKU {
  id: number;
  codigo: string;
  familia_normalizada: string;
  nombre: string;
  es_duplicado: boolean;
  aprobado: boolean;
}

interface SKUPage {
  ok: boolean;
  count: number;
  page: number;
  page_size: number;
  data: SKU[];
}

export default function CatalogManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [familiaFilter, setFamiliaFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SKUPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const PAGE_SIZE = 50;

  const fetchSKUs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getSKUs({
        page,
        page_size: PAGE_SIZE,
        q: searchTerm,
        familia: familiaFilter === "all" ? "" : familiaFilter,
      });
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, familiaFilter]);

  useEffect(() => { fetchSKUs(); }, [fetchSKUs]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleFamiliaFilter = (val: string) => {
    setFamiliaFilter(val);
    setPage(1);
  };

  const totalPages = result ? Math.ceil(result.count / PAGE_SIZE) : 1;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Gestor de Catálogo</h1>
        <p className="text-gray-600">
          {result ? `${result.count.toLocaleString()} SKUs en el catálogo` : "Cargando catálogo…"}
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por código, nombre…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} variant="outline" size="sm">
              Buscar
            </Button>
            <Select value={familiaFilter} onValueChange={handleFamiliaFilter}>
              <SelectTrigger className="w-52">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar familia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las familias</SelectItem>
                <SelectItem value="SIN FAMILIA">Sin familia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="p-8 text-center text-gray-500">Cargando…</div>
          )}
          {error && (
            <div className="p-8 text-center text-red-500">Error cargando datos del backend.</div>
          )}
          {!loading && !error && result && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Familia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                )}
                {result.data.map((sku) => (
                  <TableRow key={sku.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">
                      {sku.codigo}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate" title={sku.nombre}>
                      {sku.nombre || <span className="text-gray-400 italic">Sin nombre</span>}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {sku.familia_normalizada || "—"}
                    </TableCell>
                    <TableCell>
                      {sku.aprobado ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Aprobado
                        </Badge>
                      ) : sku.es_duplicado ? (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          <Copy className="w-3 h-3 mr-1" />
                          Duplicado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {result && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Página {page} de {totalPages} —{" "}
            {result.count.toLocaleString()} registros totales
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
