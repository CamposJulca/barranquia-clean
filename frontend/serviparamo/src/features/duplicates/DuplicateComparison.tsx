import { useEffect, useState } from "react"
import { getDuplicates } from "../../services/serviparamoMockService"

interface Duplucat {
  id: string | number;
  materialA: string;
  materialB: string;
  similarity: string;
}

export default function DuplicateComparison() {

  const [duplicates, setDuplicates] = useState<Duplucat[]>([])

  useEffect(() => {
    getDuplicates().then(setDuplicates)
  }, [])

  return (
    <div>

      <h2>Detected Duplicates</h2>

      {duplicates.map((d) => (
        <div key={d.id} style={{border:"1px solid #eee",padding:"10px",marginBottom:"10px"}}>

          <p>{d.materialA}</p>
          <p>{d.materialB}</p>

          <strong>Similarity: {d.similarity}%</strong>

        </div>
      ))}

    </div>
  )
}