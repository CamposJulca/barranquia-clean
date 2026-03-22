import { create } from 'zustand'

const useSessionStore = create((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}))

export default useSessionStore