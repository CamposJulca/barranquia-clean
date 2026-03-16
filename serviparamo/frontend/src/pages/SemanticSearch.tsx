import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "../components/ui/badge";

interface SearchResult {
  id: string;
  name: string;
  category: string;
  family: string;
  similarity: number;
  description: string;
}

const mockResults: SearchResult[] = [
  {
    id: "MAT-001234",
    name: "Tubería de Acero 2 pulgadas Schedule 40",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    similarity: 0.98,
    description: "Tubería de acero al carbono, 2 pulgadas de diámetro, espesor Schedule 40",
  },
  {
    id: "MAT-001567",
    name: "Tubería Acero 2\" Sch 40 Negra",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    similarity: 0.95,
    description: "Tubería de acero al carbono negra, 2 pulgadas, Schedule 40",
  },
  {
    id: "MAT-002134",
    name: "Tubería de Acero Galvanizado 2 pulgadas",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    similarity: 0.89,
    description: "Tubería de acero galvanizado, 2 pulgadas de diámetro",
  },
  {
    id: "MAT-003421",
    name: "Tubería de Acero 1.5 pulgadas Schedule 40",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    similarity: 0.84,
    description: "Tubería de acero al carbono, 1.5 pulgadas de diámetro, Schedule 40",
  },
  {
    id: "MAT-004567",
    name: "Tubería de Acero Inoxidable 2 pulgadas",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    similarity: 0.81,
    description: "Tubería de acero inoxidable, 2 pulgadas de diámetro, grado 304",
  },
];

const recentSearches = [
  "tubería de acero 2 pulgadas",
  "interruptor termomagnético 20 amp",
  "filtro hvac",
  "gafas de seguridad",
];

export default function SemanticSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setResults(mockResults);
      setIsSearching(false);
    }, 800);
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
    setResults(mockResults);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">
            Búsqueda Semántica con IA
          </h1>
        </div>
        <p className="text-gray-600">
          Busque materiales usando descripciones en lenguaje natural impulsado por NLP
        </p>
      </div>

      {/* Search Input */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Describa el material que está buscando..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 text-base"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
            >
              {isSearching ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {/* Recent Searches */}
          {!results.length && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Búsquedas recientes:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleRecentSearch(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Se encontraron {results.length} materiales similares
            </p>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              Ordenado por similitud
            </div>
          </div>

          {results.map((result) => (
            <Card
              key={result.id}
              className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">
                        {result.name}
                      </h3>
                      <span className="text-xs font-mono text-gray-500">
                        {result.id}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {result.description}
                    </p>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{result.category}</Badge>
                      <span className="text-xs text-gray-500">
                        {result.family}
                      </span>
                    </div>
                  </div>

                  {/* Similarity Score */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-2xl font-semibold text-blue-600">
                      {(result.similarity * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">similitud</div>
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${result.similarity * 100}%` }}
                      />
                    </div>
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
