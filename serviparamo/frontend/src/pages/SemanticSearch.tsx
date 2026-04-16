import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { buscarSKUs, getSemanticStatus } from "../services/serviparamoService";

interface BackendSKU {
  id: number;
  nombre: string;
  familia_normalizada?: string;
  similitud?: number;
}

interface SearchResult {
  id: number;
  name: string;
  category: string;
  similarity: number;
}

interface SemanticStatus {
  total_items: number;
  con_embedding: number;
  pct_embedding: number;
  etl_corriendo: boolean;
  motor_disponible: boolean;
  index_ready: boolean;
}

type SearchMotor = "semantic" | "fallback_texto" | null;

export default function SemanticSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SemanticStatus | null>(null);
  const [searchMotor, setSearchMotor] = useState<SearchMotor>(null);

  const loadStatus = async () => {
    try {
      const res = await getSemanticStatus();
      setStatus({
        total_items: Number(res?.total_items ?? 0),
        con_embedding: Number(res?.con_embedding ?? 0),
        pct_embedding: Number(res?.pct_embedding ?? 0),
        etl_corriendo: Boolean(res?.etl_corriendo),
        motor_disponible: Boolean(res?.motor_disponible),
        index_ready: Boolean(res?.index_ready),
      });
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const { results: backendResults, motor } = await buscarSKUs(query);
      setSearchMotor(motor === "semantic" ? "semantic" : "fallback_texto");

      if (!backendResults.length) {
        setResults([]);
        return;
      }

      const mapped: SearchResult[] = backendResults.map((item: BackendSKU) => ({
        id: item.id,
        name: item.nombre || "Sin nombre",
        category: item.familia_normalizada || "Sin categoría",
        similarity: item.similitud ?? 0,
      }));

      setResults(mapped);

    } catch (err: any) {
      setSearchMotor(null);
      setError(err?.response?.data?.error ?? "No se pudo realizar la búsqueda");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">
            Búsqueda Semántica con IA
          </h1>
        </div>
        <p className="text-gray-600">
          Busque materiales usando lenguaje natural
        </p>
      </div>

      {status && (
        <Card className="border-sp-blue/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Índice: {status.con_embedding.toLocaleString()} / {status.total_items.toLocaleString()} ({status.pct_embedding}%)
              </Badge>
              <Badge className={status.motor_disponible ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-red-100 text-red-800 border-red-200"}>
                {status.motor_disponible ? "Motor semántico disponible" : "Motor semántico no disponible"}
              </Badge>
              {status.etl_corriendo && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  ETL en ejecución
                </Badge>
              )}
            </div>
            {!status.index_ready && (
              <p className="text-sm text-amber-700">
                No hay embeddings disponibles. Ejecuta ETL y deja finalizar la indexación semántica.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* INPUT */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Ej: tornillo acero inoxidable"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 text-base"
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="h-12 px-6"
            >
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500 mt-3 text-center">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* LOADING */}
      {isSearching && (
        <p className="text-center text-gray-500">
          Buscando resultados...
        </p>
      )}

      {/* EMPTY */}
      {!isSearching && results.length === 0 && searchQuery && !error && (
        <p className="text-center text-gray-500">
          No se encontraron resultados
        </p>
      )}

      {/* RESULTADOS */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{results.length} resultados</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Ordenado por similitud
              </span>
              {searchMotor && (
                <Badge className={searchMotor === "semantic" ? "bg-sp-blue-light text-sp-navy border-sp-blue/20" : "bg-amber-100 text-amber-800 border-amber-200"}>
                  {searchMotor === "semantic" ? "Motor: semántico" : "Motor: fallback textual"}
                </Badge>
              )}
            </div>
          </div>

          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition">
              <CardContent className="p-5 flex justify-between items-center">

                <div className="space-y-2 max-w-[75%]">
                  <h3 className="font-medium text-gray-900">
                    {result.name}
                  </h3>

                  <div className="flex gap-3 items-center">
                    <Badge variant="outline">
                      {result.category}
                    </Badge>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl text-blue-600 font-semibold">
                    {(result.similarity * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    similitud
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
