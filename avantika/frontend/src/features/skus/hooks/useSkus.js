import { useState, useEffect } from 'react';
import { getClasificacionABC } from '../../../services/api';

export const useSkus = (filters) => {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkus = async () => {
      try {
        setLoading(true);
        // Enviamos los filtros (categoria, estado, etc.) a la API
        const response = await getClasificacionABC(filters.categoria, filters.estado);
        setSkus(response.data);
      } catch (err) {
        console.error("Error filtrando SKUs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSkus();
  }, [filters.categoria, filters.estado]); // Se dispara cada vez que el filtro cambie

  return { skus, loading };
};