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

export interface ObjetivoBloques {
  /** Palabra a construir, p. ej. "mamá". */
  texto: string
  icono?: string
  /** Sílabas en orden. Si se omite, se divide la palabra (ma·má). */
  bloques?: string[]
  /** Sílabas extra que no forman parte de la palabra. */
  distractores: string[]
}

export interface PasoBloques {
  mecanica: 'bloques_construccion'
  objetivos: ObjetivoBloques[]
}

export interface ObjetivoDecodificador {
  /** Palabra escondida en el mensaje de colores, p. ej. "sopa". */
  texto: string
  icono: string
  /** Sílabas en orden. Si se omite, se divide la palabra (so·pa). */
  silabas?: string[]
  /** Imágenes alternativas para elegir (deben ser otras palabras). */
  distractores: { texto: string; icono: string }[]
}

export interface PasoDecodificador {
  mecanica: 'decodificador_color'
  /** Clave de colores: sílaba → color (equivale a `mapa_colores` del esquema original). */
  clave: Record<string, string>
  objetivos: ObjetivoDecodificador[]
}

export interface ObjetivoLupa {
  /** Palabra que el detective debe encontrar (`palabra_objetivo`), p. ej. "mapa". */
  texto: string
  icono: string
  /** Sílabas ocultas bajo la trama (`silabas_ocultas`). Si se omite, se divide la palabra. */
  silabas?: string[]
  /** Sílabas ocultas que NO forman parte de la palabra. */
  distractores: string[]
}

export interface PasoLupa {
  mecanica: 'lupa_magica'
  objetivos: ObjetivoLupa[]
}

export interface PasoRuleta {
  mecanica: 'ruleta_silabica'
  /** Primera sílaba: anillo de afuera (queda arriba en la ventana). */
  primera: string[]
  /** Segunda sílaba: rueda de adentro (queda debajo). */
  segunda: string[]
  /**
   * TODAS las palabras reales que se pueden formar (primera + segunda).
   * Si falta una, la app diría "no es palabra" a una palabra de verdad.
   */
  palabras: Objetivo[]
  /** Cuántas palabras hay que encontrar (por defecto, hasta 5). */
  meta?: number
}

export type Paso = PasoPresentacion | PasoElevador | PasoBloques | PasoDecodificador | PasoLupa | PasoRuleta
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
