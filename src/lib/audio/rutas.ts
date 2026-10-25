import type { Fonema } from '../../types/content'

const BASE = import.meta.env.BASE_URL

const archivo = (texto: string) => encodeURIComponent(texto.toLowerCase().normalize('NFC'))

export const urlFonema = (id: string) => `${BASE}audio/fonemas/${archivo(id)}.mp3`
export const urlSilaba = (texto: string) => `${BASE}audio/silabas/${archivo(texto)}.mp3`
export const urlPalabra = (texto: string) => `${BASE}audio/palabras/${archivo(texto)}.mp3`
export const urlFeedback = (id: string) => `${BASE}audio/feedback/${archivo(id)}.mp3`

export const FRASES = {
  bien: '¡Muy bien!',
  otra: 'Escucha otra vez',
  ayuda: 'Mira, así se forma',
  fin: '¡Lo lograste!',
  camino: 'Lleva a tu amigo por el camino',
  puntos: 'Une los puntos',
  diferente: '¿Cuál es diferente?',
  empieza: '¿Qué empieza con este sonido?',
  rima: '¿Qué rima con esta palabra?',
  cual: '¿Cuál escuchas?',
  palmadas: 'Toca el tambor en cada sílaba',
} as const
export type FraseId = keyof typeof FRASES

export type Estrategia = 'archivo' | 'voz' | 'sintesis'

/**
 * Regla de oro: un fonema consonante NUNCA se pide a la voz del sistema,
 * porque esta lee el nombre de la letra ("eme", "ese"). Sin grabación,
 * se usa una aproximación sintética del sonido. Las vocales sí pueden usar
 * la voz: en español su nombre y su sonido coinciden.
 */
export function estrategiaFonema(f: Fonema, hayArchivo: boolean): Estrategia {
  if (hayArchivo) return 'archivo'
  return f.tipo === 'vocal' ? 'voz' : 'sintesis'
}
