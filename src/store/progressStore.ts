import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Registro {
  intentos: number
  aciertos: number
  ultimo: number
}

export interface EstadoLeccion {
  completada: boolean
  estrellas: number
  veces: number
  fecha: number
}

type Coleccion = 'fonemas' | 'silabas'

interface ProgressState {
  fonemas: Record<string, Registro>
  silabas: Record<string, Registro>
  lecciones: Record<string, EstadoLeccion>
  registrar: (coleccion: Coleccion, id: string, acierto: boolean) => void
  completarLeccion: (id: string, estrellas: number) => void
  reiniciar: () => void
}

const vacio = { fonemas: {}, silabas: {}, lecciones: {} }

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...vacio,
      registrar: (coleccion, id, acierto) =>
        set((s) => {
          const prev = s[coleccion][id] ?? { intentos: 0, aciertos: 0, ultimo: 0 }
          return {
            [coleccion]: {
              ...s[coleccion],
              [id]: {
                intentos: prev.intentos + 1,
                aciertos: prev.aciertos + (acierto ? 1 : 0),
                ultimo: Date.now(),
              },
            },
          }
        }),
      completarLeccion: (id, estrellas) =>
        set((s) => {
          const prev = s.lecciones[id]
          return {
            lecciones: {
              ...s.lecciones,
              [id]: {
                completada: true,
                estrellas: Math.max(estrellas, prev?.estrellas ?? 0),
                veces: (prev?.veces ?? 0) + 1,
                fecha: Date.now(),
              },
            },
          }
        }),
      reiniciar: () => set(vacio),
    }),
    { name: 'lectoescritura-progreso', version: 1 },
  ),
)

// ---- Lecturas derivadas para el panel de adultos ----

export type EstadoDominio = 'sin_empezar' | 'practicando' | 'dominado' | 'reforzar'

export const precision = (r?: Registro) => (r && r.intentos ? r.aciertos / r.intentos : 0)

/** Dominado: ≥ 4 intentos y ≥ 80 % de acierto. Reforzar: ≥ 3 intentos y < 60 %. */
export function estadoDominio(r?: Registro): EstadoDominio {
  if (!r || r.intentos === 0) return 'sin_empezar'
  const p = precision(r)
  if (r.intentos >= 4 && p >= 0.8) return 'dominado'
  if (r.intentos >= 3 && p < 0.6) return 'reforzar'
  return 'practicando'
}

export function estrellasPara(aciertos: number, total: number) {
  if (total === 0) return 3
  const p = aciertos / total
  return p >= 0.9 ? 3 : p >= 0.6 ? 2 : 1
}
