import { useEffect, useState } from "react"
import { getMaterials } from "../../services/serviparamoMockService"

interface Material {
  id: string | number;
  name: string;
  category: string;
  family: string;
  status: string;
}
export default function CatalogTable() {

  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    getMaterials().then(setMaterials)
  }, [])

  return (
    <table>

      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Category</th>
          <th>Family</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {materials.map((m) => (
          <tr key={m.id}>
            <td>{m.id}</td>
            <td>{m.name}</td>
            <td>{m.category}</td>
            <td>{m.family}</td>
            <td>{m.status}</td>
          </tr>
        ))}
      </tbody>

    </table>
  )
}