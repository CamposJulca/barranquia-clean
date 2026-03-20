import api from './api'

export const buscarSKUs = async (query) => {
  return await api.get("/serviparamo/buscar/", {
    params: {
      q: query,
    },
  });
};

export const getStats = async () => {
  const res = await api.get('/serviparamo/stats/')
  return res.data
}