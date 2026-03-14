import api from "./api";

export const getHealth = async () => {
  const res = await api.get("/health");
  return res.data;
};