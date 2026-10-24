import { fonemas, lecciones } from './contentLoader'
import { FRASES, urlFeedback, urlFonema, urlPalabra, urlSilaba } from './audio/rutas'
import { bloquesDe, partirSilaba, silabasDe } from './silabas'

export interface AudioRequerido {
  url: string
  /** Ruta dentro de /public, tal como debe guardarse el archivo. */
  archivo: string
  /** Qué debe decir la grabación. */
  decir: string
}

const archivoDe = (url: string) => 'public' + decodeURIComponent(url.slice(import.meta.env.BASE_URL.length - 1))

/** Todas las grabaciones que el contenido actual necesita, sin repetir. */
export function audiosRequeridos(): AudioRequerido[] {
  const lista = new Map<string, AudioRequerido>()
  const agregar = (url: string, decir: string) => {
    if (!lista.has(url)) lista.set(url, { url, archivo: archivoDe(url), decir })
  }

  for (const f of fonemas) {
    agregar(urlFonema(f.id), `Sonido ${f.sonido} (NO el nombre de la letra)`)
    agregar(urlPalabra(f.ejemplo.palabra), `Palabra "${f.ejemplo.palabra}"`)
  }
  for (const l of lecciones) {
    for (const p of l.pasos) {
      if (p.mecanica === 'bloques_construccion') {
        for (const o of p.objetivos) {
          agregar(urlPalabra(o.texto), `Palabra "${o.texto}"`)
          for (const s of [...bloquesDe(o), ...o.distractores]) agregar(urlSilaba(s), `Sílaba "${s}"`)
        }
        continue
      }
      if (p.mecanica === 'decodificador_color') {
        for (const s of Object.keys(p.clave)) agregar(urlSilaba(s), `Sílaba "${s}"`)
        for (const o of p.objetivos) agregar(urlPalabra(o.texto), `Palabra "${o.texto}"`)
        continue
      }
      if (p.mecanica === 'lupa_magica') {
        for (const o of p.objetivos) {
          agregar(urlPalabra(o.texto), `Palabra "${o.texto}"`)
          for (const s of [...silabasDe(o), ...o.distractores]) agregar(urlSilaba(s), `Sílaba "${s}"`)
        }
        continue
      }
      if (p.mecanica === 'ruleta_silabica') {
        for (const s of [...p.primera, ...p.segunda]) agregar(urlSilaba(s), `Sílaba "${s}"`)
        const reales = new Set(p.palabras.map((x) => x.texto))
        for (const a of p.primera)
          for (const b of p.segunda)
            agregar(urlPalabra(a + b), reales.has(a + b) ? `Palabra "${a + b}"` : `Combinación sin sentido "${a + b}" (leerla tal cual)`)
        continue
      }
      if (p.mecanica !== 'elevador_silabas') continue
      for (const c of p.consonantes)
        for (const v of p.vocales) agregar(urlSilaba(c + v), `Sílaba "${c + v}"`)
      if ((p.silabas ?? 1) > 1)
        for (const o of p.objetivos) agregar(urlPalabra(o.texto), `Palabra "${o.texto}"`)
      else
        for (const o of p.objetivos) {
          const { consonante, vocal } = partirSilaba(o.texto)
          agregar(urlSilaba(consonante + vocal), `Sílaba "${o.texto}"`)
        }
    }
  }
  for (const [id, texto] of Object.entries(FRASES)) agregar(urlFeedback(id), `Frase "${texto}"`)
  return [...lista.values()]
}
