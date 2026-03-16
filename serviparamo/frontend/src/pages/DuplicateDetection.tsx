import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  GitMerge,
  X,
  Eye,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { Separator } from "../components/ui/separator";

interface Material {
  id: string;
  name: string;
  description: string;
  category: string;
  family: string;
  unit: string;
  supplier: string;
  lastUpdated: string;
}

interface DuplicatePair {
  materialA: Material;
  materialB: Material;
  similarity: number;
  suggestedAction: "merge" | "review";
}

const mockDuplicates: DuplicatePair[] = [
  {
    materialA: {
      id: "MAT-001234",
      name: "Tubería de Acero 2 pulgadas Schedule 40",
      description: "Tubería de acero al carbono, 2 pulgadas de diámetro, espesor Schedule 40",
      category: "Plomería",
      family: "Tuberías y Accesorios",
      unit: "m",
      supplier: "Steel Corp Inc",
      lastUpdated: "2026-03-10",
    },
    materialB: {
      id: "MAT-001235",
      name: "Tubería Acero 2\" Sch 40",
      description: "Tubería de acero 2 pulgadas sch 40 negra",
      category: "Plomería",
      family: "Tuberías y Accesorios",
      unit: "m",
      supplier: "Metal Supply Co",
      lastUpdated: "2026-02-15",
    },
    similarity: 0.96,
    suggestedAction: "merge",
  },
  {
    materialA: {
      id: "MAT-001237",
      name: "Interruptor Termomagnético 20A 240V",
      description: "Interruptor termomagnético unipolar, 20 amperes, 240 voltios",
      category: "Eléctricos",
      family: "Dispositivos de Protección",
      unit: "pzs",
      supplier: "Electric Pro",
      lastUpdated: "2026-03-05",
    },
    materialB: {
      id: "MAT-001238",
      name: "Interr Termomag 20 Amp 240 Volt",
      description: "Interruptor termomagnético 20A 240V unipolar",
      category: "Eléctricos",
      family: "Dispositivos de Protección",
      unit: "pzs",
      supplier: "Power Components",
      lastUpdated: "2026-01-20",
    },
    similarity: 0.94,
    suggestedAction: "merge",
  },
];

export default function DuplicateDetection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPair = mockDuplicates[currentIndex];

  const handleMerge = () => {
    console.log("Fusionando duplicados:", currentPair);
    handleNext();
  };

  const handleIgnore = () => {
    console.log("Ignorando par:", currentPair);
    handleNext();
  };

  const handleReview = () => {
    console.log("Marcando para revisión:", currentPair);
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < mockDuplicates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentPair) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No se Encontraron Duplicados
          </h2>
          <p className="text-gray-600">
            ¡Todos los pares de duplicados han sido procesados!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Detección de Duplicados
          </h1>
          <p className="text-gray-600">
            Revise y fusione materiales duplicados detectados por IA
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {currentIndex + 1} de {mockDuplicates.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === mockDuplicates.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Similarity Score Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {(currentPair.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Puntuación de Similitud</p>
                <p className="text-sm text-gray-600">
                  Confianza IA: {currentPair.suggestedAction === "merge" ? "Alta" : "Media"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              Sugerido: {currentPair.suggestedAction === "merge" ? "Fusionar" : "Revisar"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Panel */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Material A</span>
              <Badge variant="secondary">{currentPair.materialA.id}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">NOMBRE</p>
              <p className="font-medium text-gray-900">
                {currentPair.materialA.name}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                DESCRIPCIÓN
              </p>
              <p className="text-sm text-gray-700">
                {currentPair.materialA.description}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  CATEGORÍA
                </p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialA.category}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">FAMILIA</p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialA.family}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">UNIDAD</p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialA.unit}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  PROVEEDOR
                </p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialA.supplier}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                ÚLTIMA ACTUALIZACIÓN
              </p>
              <p className="text-sm text-gray-900">
                {new Date(currentPair.materialA.lastUpdated).toLocaleDateString('es-ES')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Material B</span>
              <Badge variant="secondary">{currentPair.materialB.id}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">NOMBRE</p>
              <p className="font-medium text-gray-900">
                {currentPair.materialB.name}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                DESCRIPCIÓN
              </p>
              <p className="text-sm text-gray-700">
                {currentPair.materialB.description}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  CATEGORÍA
                </p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialB.category}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">FAMILIA</p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialB.family}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">UNIDAD</p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialB.unit}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  PROVEEDOR
                </p>
                <p className="text-sm text-gray-900">
                  {currentPair.materialB.supplier}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                ÚLTIMA ACTUALIZACIÓN
              </p>
              <p className="text-sm text-gray-900">
                {new Date(currentPair.materialB.lastUpdated).toLocaleDateString('es-ES')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleIgnore}
              className="min-w-32"
            >
              <X className="w-4 h-4 mr-2" />
              Ignorar
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleReview}
              className="min-w-32"
            >
              <Eye className="w-4 h-4 mr-2" />
              Revisar Después
            </Button>
            <Button
              size="lg"
              onClick={handleMerge}
              className="min-w-32 bg-blue-600 hover:bg-blue-700"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Fusionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
