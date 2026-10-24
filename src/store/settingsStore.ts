import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  nombre: string
  volumen: number
  desbloquearTodo: boolean
  setNombre: (n: string) => void
  setVolumen: (v: number) => void
  setDesbloquearTodo: (b: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      nombre: '',
      volumen: 1,
      desbloquearTodo: false,
      setNombre: (nombre) => set({ nombre }),
      setVolumen: (volumen) => set({ volumen }),
      setDesbloquearTodo: (desbloquearTodo) => set({ desbloquearTodo }),
    }),
    { name: 'lectoescritura-ajustes', version: 1 },
  ),
)
