import type { ComponentType } from 'react'
import type { Mecanica, Paso, ResultadoPaso } from '../types/content'
import { ElevadorSilabas } from './ElevadorSilabas/ElevadorSilabas'
import { PresentacionFonema } from './PresentacionFonema/PresentacionFonema'

export interface PropsMecanica<P extends Paso = Paso> {
  paso: P
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Registro de mecánicas: el JSON de cada lección indica `mecanica`
 * y el LessonRunner renderiza el componente correspondiente.
 * Para añadir una mecánica nueva: crear el componente y registrarlo aquí.
 */
export const MECANICAS: { [M in Mecanica]: ComponentType<PropsMecanica<Extract<Paso, { mecanica: M }>>> } = {
  presentacion_fonema: PresentacionFonema,
  elevador_silabas: ElevadorSilabas,
}

export function RenderMecanica({ paso, onTerminar }: PropsMecanica) {
  const Componente = MECANICAS[paso.mecanica] as ComponentType<PropsMecanica>
  return <Componente paso={paso} onTerminar={onTerminar} />
}
