const VOCALES = 'aeiouáéíóúü'
const RE_SILABA_CV = new RegExp(`[^${VOCALES}]*[${VOCALES}]`, 'g')

export const esVocal = (letra: string) => VOCALES.includes(letra.toLowerCase())

/** Método sintético: sonido consonante + sonido vocal = sílaba. */
export const unir = (consonante: string, vocal: string) => consonante + vocal

/**
 * Divide palabras de estructura consonante+vocal (mapa → ma·pa, mamá → ma·má).
 * Las consonantes finales sueltas se pegan a la última sílaba (sol → sol).
 * Pensado para el vocabulario inicial; no cubre diptongos ni grupos (pl, tr…).
 */
export function dividirCV(palabra: string): string[] {
  const texto = palabra.toLowerCase().normalize('NFC')
  const partes: string[] = texto.match(RE_SILABA_CV) ?? []
  const resto = texto.slice(partes.join('').length)
  if (resto) {
    if (partes.length) partes[partes.length - 1] += resto
    else partes.push(resto)
  }
  return partes
}

/** Separa una sílaba directa en consonante (puede ser dígrafo: ll, rr, ch) y vocal. */
export function partirSilaba(silaba: string): { consonante: string; vocal: string } {
  return { consonante: silaba.slice(0, -1), vocal: silaba.slice(-1) }
}

/** Sílabas de un objetivo de Bloques: las indicadas en el JSON o, si no, ma·má. */
export const bloquesDe = (o: { texto: string; bloques?: string[] }) => o.bloques ?? dividirCV(o.texto)

/** Copia barajada (Fisher–Yates). */
export function barajar<T>(lista: T[]): T[] {
  const r = [...lista]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
