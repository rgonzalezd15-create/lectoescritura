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

// ---- Módulo 1: motricidad y coordinación ----

/** Caminos predefinidos, todos de izquierda a derecha (ver lib/trazos.ts). */
export type FormaTrazo = 'linea' | 'ondas' | 'zigzag' | 'arcos' | 'montanas'

export interface Trazo {
  forma: FormaTrazo
  /** Personaje que se lleva con el dedo. */
  inicio: string
  /** Meta al final del camino. */
  fin: string
}

export interface PasoTrazo {
  mecanica: 'trazo_guiado'
  trazos: Trazo[]
}

export interface Dibujo {
  icono: string
  palabra: string
  /** Puntos en coordenadas 0–100, en el orden en que se unen. */
  puntos: [number, number][]
}

export interface PasoUnirPuntos {
  mecanica: 'unir_puntos'
  dibujos: Dibujo[]
}

/** Qué tiene distinto el elemento diferente. */
export type CambioDiferente = 'espejo' | 'invertido' | 'tamano'

export interface RondaDiferente {
  icono: string
  cambio: CambioDiferente
  /** Cuántos elementos se muestran (3 a 6). */
  cantidad: number
}

export interface PasoDiferente {
  mecanica: 'encuentra_diferente'
  rondas: RondaDiferente[]
}

// ---- Módulo 2: conciencia fonológica ----

/**
 * - sonido_inicial: `estimulo` es un fonema (id); se eligen las imágenes que empiezan con ese sonido.
 * - rima: `estimulo` es una palabra (con `icono`); se eligen las que riman con ella.
 * - contraste: `estimulo` es una palabra que solo se escucha; se elige entre palabras casi iguales (pino/vino).
 */
export type ModoEscucha = 'sonido_inicial' | 'rima' | 'contraste'

export interface OpcionEscucha {
  texto: string
  icono: string
  correcta: boolean
}

export interface RondaEscucha {
  modo: ModoEscucha
  estimulo: string
  icono?: string
  opciones: OpcionEscucha[]
}

export interface PasoEscucha {
  mecanica: 'escucha_y_elige'
  rondas: RondaEscucha[]
}

export interface PalabraPalmadas {
  texto: string
  icono: string
  /** División silábica explícita (e·le·fan·te): no se puede deducir con reglas simples. */
  silabas: string[]
}

export interface PasoPalmadas {
  mecanica: 'palmadas'
  palabras: PalabraPalmadas[]
}

export type Paso =
  | PasoEscucha
  | PasoPalmadas
  | PasoPresentacion
  | PasoElevador
  | PasoBloques
  | PasoDecodificador
  | PasoLupa
  | PasoRuleta
  | PasoTrazo
  | PasoUnirPuntos
  | PasoDiferente
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
