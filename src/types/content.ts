/**
 * Modelo de datos de la app. Extiende `esquema-lecciones-lectoescritura.json`:
 * - Fonema: añade tipo, continuo, bloque, síntesis provisional y boca (vocales).
 * - Lección: secuencia de pasos; cada paso declara su `mecanica` y el
 *   LessonRunner elige el componente correspondiente.
 */

export type TipoFonema = 'vocal' | 'consonante'

/** Cómo aproximar el sonido mientras no exista la grabación real. */
export type Sintesis =
  | 'vocal'
  | 'nasal'
  | 'lateral'
  | 'fricativa_aguda'
  | 'fricativa_suave'
  | 'oclusiva'

export interface Fonema {
  id: string
  grafema: string
  tipo: TipoFonema
  /** Notación para adultos, p. ej. "/mmm/". Nunca el nombre de la letra. */
  sonido: string
  /** true si el sonido se puede sostener (/mmm/, /sss/); false para /p/. */
  continuo: boolean
  /** 0 = vocales; 1..5 = bloques de la ruta de consonantes. */
  bloque: number
  audio: string
  ejemplo: { palabra: string; icono: string }
  /** Gesto articulatorio (solo vocales). */
  boca?: { icono: string; texto: string }
  sintesis: Sintesis
}

export interface Objetivo {
  texto: string
  icono?: string
}

export interface PasoPresentacion {
  mecanica: 'presentacion_fonema'
  fonema: string
}

export interface PasoElevador {
  mecanica: 'elevador_silabas'
  consonantes: string[]
  vocales: string[]
  /** Número de pares consonante+vocal (1 = sílaba, 2 = palabra bisílaba). */
  silabas?: number
  /** Dictado: lo que el niño debe formar. */
  objetivos: Objetivo[]
}

export type Paso = PasoPresentacion | PasoElevador
export type Mecanica = Paso['mecanica']

export interface Leccion {
  id: string
  modulo: number
  titulo: string
  icono: string
  pasos: Paso[]
}

export interface Modulo {
  id: number
  nombre: string
  icono: string
  color: string
  disponible: boolean
  lecciones: string[]
}

export interface ResultadoPaso {
  aciertos: number
  total: number
}
