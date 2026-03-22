import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Check, X, Sparkles, TrendingUp } from "lucide-react";
import { Progress } from "../components/ui/progress";

interface NormalizationSuggestion {
  id: string;
  originalName: string;
  suggestedName: string;
  originalCategory: string;
  suggestedCategory: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
}

const mockSuggestions: NormalizationSuggestion[] = [
  {
    id: "NORM-001",
    originalName: "Tubería Acero 2\" Sch 40",
    suggestedName: "Tubería de Acero 2 pulgadas Schedule 40",
    originalCategory: "Sin categoría",
    suggestedCategory: "Plomería - Tuberías y Accesorios",
    confidence: 0.98,
    status: "pending",
  },
  {
    id: "NORM-002",
    originalName: "Interr Termomag 20 Amp 240V",
    suggestedName: "Interruptor Termomagnético 20A 240V",
    originalCategory: "Eléctrico",
    suggestedCategory: "Eléctricos - Dispositivos de Protección",
    confidence: 0.95,
    status: "pending",
  },
  {
    id: "NORM-003",
    originalName: "Filtro Aire HVAC 20x25",
    suggestedName: "Filtro HVAC 20x25x1",
    originalCategory: "HVAC",
    suggestedCategory: "HVAC - Filtros",
    confidence: 0.92,
    status: "pending",
  },
  {
    id: "NORM-004",
    originalName: "Llave ajust 12in",
    suggestedName: "Llave Ajustable 12 pulgadas",
    originalCategory: "Herramientas",
    suggestedCategory: "Herramientas - Herramientas Manuales",
    confidence: 0.89,
    status: "pending",
  },
  {
    id: "NORM-005",
    originalName: "Gafas Seguridad Transparente",
    suggestedName: "Gafas de Seguridad Lente Transparente",
    originalCategory: "Equipo de Seguridad",
    suggestedCategory: "Seguridad - EPP",
    confidence: 0.87,
    status: "pending",
  },
  {
    id: "NORM-006",
    originalName: "Cable Cobre 12AWG",
    suggestedName: "Cable de Cobre 12 AWG THHN",
    originalCategory: "Eléctricos",
    suggestedCategory: "Eléctricos - Cables y Alambres",
    confidence: 0.85,
    status: "pending",
  },
];

export default function Normalization() {
  const [suggestions, setSuggestions] = useState(mockSuggestions);

  const handleApprove = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "approved" as const } : s))
    );
  };

  const handleReject = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" as const } : s))
    );
  };

  const handleApproveAll = () => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.status === "pending" ? { ...s, status: "approved" as const } : s
      )
    );
  };

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const approvedCount = suggestions.filter((s) => s.status === "approved").length;
  const totalCount = suggestions.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Normalización con IA
          </h1>
          <p className="text-gray-600">
            Revise y apruebe las sugerencias de normalización de materiales impulsadas por IA
          </p>
        </div>
        <Button
          onClick={handleApproveAll}
          disabled={pendingCount === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Check className="w-4 h-4 mr-2" />
          Aprobar Todas ({pendingCount})
        </Button>
      </div>

      {/* Progress Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total de Sugerencias</p>
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-semibold text-gray-900">{totalCount}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pendientes de Revisión</p>
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-semibold text-gray-900">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Aprobadas</p>
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-semibold text-gray-900">{approvedCount}</p>
            <Progress
              value={(approvedCount / totalCount) * 100}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      </div>

      {/* Suggestions Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Sugerencias de Normalización</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nombre Original</TableHead>
                <TableHead className="w-[200px]">Nombre Sugerido</TableHead>
                <TableHead className="w-[180px]">Categoría Original</TableHead>
                <TableHead className="w-[180px]">Categoría Sugerida</TableHead>
                <TableHead className="w-[120px]">Confianza</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[180px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((suggestion) => (
                <TableRow
                  key={suggestion.id}
                  className={
                    suggestion.status === "approved"
                      ? "bg-green-50"
                      : suggestion.status === "rejected"
                      ? "bg-red-50"
                      : ""
                  }
                >
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 line-through decoration-gray-400">
                        {suggestion.originalName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {suggestion.suggestedName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {suggestion.originalCategory}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {suggestion.suggestedCategory}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            suggestion.confidence >= 0.9
                              ? "bg-green-600"
                              : suggestion.confidence >= 0.8
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                          style={{ width: `${suggestion.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {suggestion.status === "pending" && (
                      <Badge variant="outline" className="bg-yellow-50">
                        Pendiente
                      </Badge>
                    )}
                    {suggestion.status === "approved" && (
                      <Badge className="bg-green-600">Aprobada</Badge>
                    )}
                    {suggestion.status === "rejected" && (
                      <Badge variant="destructive">Rechazada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {suggestion.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(suggestion.id)}
                          className="hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(suggestion.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aprobar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
