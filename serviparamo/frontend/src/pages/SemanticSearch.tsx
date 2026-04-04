import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { buscarSKUs } from "../services/serviparamoService";

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

export default function SemanticSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const res = await buscarSKUs(query);

      console.log("RESPUESTA COMPLETA:", res);
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];

      console.log("ARRAY FINAL:", data);

      if (!data.length) {
        setResults([]);
        return;
      }

      const mapped: SearchResult[] = data.map((item: BackendSKU) => ({
        id: item.id,
        name: item.nombre || "Sin nombre",
        category: item.familia_normalizada || "Sin categoría",
        similarity: item.similitud ?? 0,
      }));

      setResults(mapped);

    } catch (err: any) {
      console.error("Error en búsqueda:", err);
      setError("No se pudo realizar la búsqueda");
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
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Ordenado por similitud
            </span>
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