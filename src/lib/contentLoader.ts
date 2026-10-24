import fonemasData from '../content/fonemas.json'
import rutaData from '../content/ruta.json'
import m3 from '../content/lecciones/m3-vocales.json'
import m4 from '../content/lecciones/m4-consonantes.json'
import m5 from '../content/lecciones/m5-palabras.json'
import type { Fonema, Leccion, Modulo } from '../types/content'
import { bloquesDe, dividirCV, partirSilaba, silabasDe } from './silabas'

export const fonemas = fonemasData as unknown as Fonema[]
export const fonemaPorId = new Map(fonemas.map((f) => [f.id, f]))

export const modulos = rutaData.modulos as Modulo[]
export const ordenConsonantes = rutaData.ordenConsonantes

export const lecciones: Leccion[] = [m3, m4, m5].flatMap((m) => m.lecciones as unknown as Leccion[])
const leccionPorId = new Map(lecciones.map((l) => [l.id, l]))

export const getLeccion = (id: string) => leccionPorId.get(id)
export const getModulo = (id: number) => modulos.find((m) => m.id === id)

/** Revisa que el contenido sea coherente. Devuelve la lista de errores (vacía = OK). */
export function validarContenido(): string[] {
  const errores: string[] = []

  for (const m of modulos) {
    for (const id of m.lecciones) {
      if (!leccionPorId.has(id)) errores.push(`Módulo ${m.id}: la lección "${id}" no existe`)
    }
  }

  for (const l of lecciones) {
    l.pasos.forEach((paso, i) => {
      const donde = `${l.id} paso ${i + 1}`
      if (paso.mecanica === 'presentacion_fonema') {
        if (!fonemaPorId.has(paso.fonema)) errores.push(`${donde}: fonema "${paso.fonema}" no existe`)
        return
      }
      if (paso.mecanica === 'elevador_silabas') {
        for (const id of [...paso.consonantes, ...paso.vocales]) {
          if (!fonemaPorId.has(id)) errores.push(`${donde}: fonema "${id}" no existe`)
        }
        const n = paso.silabas ?? 1
        for (const obj of paso.objetivos) {
          const sils = n === 1 ? [obj.texto] : dividirCV(obj.texto)
          if (sils.length !== n) {
            errores.push(`${donde}: "${obj.texto}" no tiene ${n} sílaba(s)`)
            continue
          }
          for (const s of sils) {
            const { consonante, vocal } = partirSilaba(s)
            if (!paso.consonantes.includes(consonante) || !paso.vocales.includes(vocal)) {
              errores.push(`${donde}: "${obj.texto}" no se puede formar con las tiras`)
            }
          }
        }
        return
      }
      if (paso.mecanica === 'bloques_construccion') {
        for (const obj of paso.objetivos) {
          const sils = bloquesDe(obj)
          if (sils.join('') !== obj.texto) errores.push(`${donde}: los bloques de "${obj.texto}" no forman la palabra`)
          for (const d of obj.distractores) {
            if (sils.includes(d)) errores.push(`${donde}: el distractor "${d}" también es parte de "${obj.texto}"`)
          }
        }
        return
      }
      if (paso.mecanica === 'decodificador_color') {
        const colores = Object.values(paso.clave)
        if (new Set(colores).size !== colores.length) errores.push(`${donde}: hay colores repetidos en la clave`)
        if (colores.length > 6) errores.push(`${donde}: la clave admite como máximo 6 colores`)
        for (const obj of paso.objetivos) {
          const sils = silabasDe(obj)
          if (sils.join('') !== obj.texto) errores.push(`${donde}: las sílabas de "${obj.texto}" no forman la palabra`)
          for (const s of sils) {
            if (!(s in paso.clave)) errores.push(`${donde}: la sílaba "${s}" de "${obj.texto}" no está en la clave`)
          }
          if (obj.distractores.some((d) => d.texto === obj.texto)) errores.push(`${donde}: "${obj.texto}" está entre sus distractores`)
        }
        return
      }
      if (paso.mecanica === 'lupa_magica') {
        for (const obj of paso.objetivos) {
          const sils = silabasDe(obj)
          if (sils.join('') !== obj.texto) errores.push(`${donde}: las sílabas de "${obj.texto}" no forman la palabra`)
          if (sils.length + obj.distractores.length > 8) errores.push(`${donde}: "${obj.texto}" esconde más de 8 sílabas`)
          for (const d of obj.distractores) {
            if (sils.includes(d)) errores.push(`${donde}: el distractor "${d}" también es parte de "${obj.texto}"`)
          }
        }
        return
      }
      if (paso.mecanica === 'ruleta_silabica') {
        const combos = new Set(paso.primera.flatMap((a) => paso.segunda.map((b) => a + b)))
        for (const [nombre, rueda] of [['de afuera', paso.primera], ['de adentro', paso.segunda]] as const) {
          if (rueda.length < 2 || rueda.length > 8) errores.push(`${donde}: la rueda ${nombre} debe tener de 2 a 8 sílabas`)
          if (new Set(rueda).size !== rueda.length) errores.push(`${donde}: la rueda ${nombre} repite sílabas`)
        }
        for (const p of paso.palabras) {
          if (!combos.has(p.texto)) errores.push(`${donde}: "${p.texto}" no se puede formar con la ruleta`)
        }
        if ((paso.meta ?? 5) > paso.palabras.length && paso.meta !== undefined)
          errores.push(`${donde}: la meta (${paso.meta}) supera las palabras disponibles`)
        return
      }
      errores.push(`${donde}: mecánica desconocida "${(paso as { mecanica: string }).mecanica}"`)
    })
  }
  return errores
}

if (import.meta.env.DEV) {
  const errores = validarContenido()
  if (errores.length) console.error('Contenido con errores:\n' + errores.join('\n'))
}
