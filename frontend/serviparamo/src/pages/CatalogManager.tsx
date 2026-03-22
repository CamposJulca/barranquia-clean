import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Search, Filter, Download, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface Material {
  id: string;
  name: string;
  category: string;
  family: string;
  unit: string;
  status: "normalized" | "duplicate" | "pending" | "active";
}

const mockMaterials: Material[] = [
  {
    id: "MAT-001234",
    name: "Tubería de Acero 2 pulgadas Schedule 40",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    unit: "m",
    status: "normalized",
  },
  {
    id: "MAT-001235",
    name: "Tubería Acero 2\" Sch 40",
    category: "Plomería",
    family: "Tuberías y Accesorios",
    unit: "m",
    status: "duplicate",
  },
  {
    id: "MAT-001236",
    name: "Conducto Eléctrico PVC 3/4 pulgada",
    category: "Eléctricos",
    family: "Conductos",
    unit: "m",
    status: "normalized",
  },
  {
    id: "MAT-001237",
    name: "Interruptor Termomagnético 20A 240V",
    category: "Eléctricos",
    family: "Dispositivos de Protección",
    unit: "pzs",
    status: "normalized",
  },
  {
    id: "MAT-001238",
    name: "Interr Termomag 20 Amp 240 Volt",
    category: "Eléctricos",
    family: "Dispositivos de Protección",
    unit: "pzs",
    status: "pending",
  },
  {
    id: "MAT-001239",
    name: "Filtro HVAC 20x25x1",
    category: "HVAC",
    family: "Filtros",
    unit: "pzs",
    status: "normalized",
  },
  {
    id: "MAT-001240",
    name: "Llave Ajustable 12 pulgadas",
    category: "Herramientas",
    family: "Herramientas Manuales",
    unit: "pzs",
    status: "active",
  },
  {
    id: "MAT-001241",
    name: "Gafas de Seguridad Lente Transparente",
    category: "Seguridad",
    family: "EPP",
    unit: "pzs",
    status: "normalized",
  },
  {
    id: "MAT-001242",
    name: "Cable de Cobre 12 AWG THHN",
    category: "Eléctricos",
    family: "Cables y Alambres",
    unit: "m",
    status: "normalized",
  },
  {
    id: "MAT-001243",
    name: "Válvula de Bola 1 pulgada Bronce",
    category: "Plomería",
    family: "Válvulas",
    unit: "pzs",
    status: "active",
  },
];

export default function defaultCatalogManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredMaterials = mockMaterials.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || material.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Gestor de Catálogo
          </h1>
          <p className="text-gray-600">
            Administre y organice su catálogo de materiales de ingeniería
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Material
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar materiales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="normalized">Normalizado</SelectItem>
                  <SelectItem value="duplicate">Duplicado</SelectItem>
                  <SelectItem value="pending">Pendiente de Revisión</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Material</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm text-gray-600">
                    {material.id}
                  </TableCell>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell className="text-gray-600">
                    {material.category}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {material.family}
                  </TableCell>
                  <TableCell className="text-gray-600">{material.unit}</TableCell>
                  <TableCell>
                    <StatusBadge status={material.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>
          Mostrando {filteredMaterials.length} de {mockMaterials.length} materiales
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm">
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}