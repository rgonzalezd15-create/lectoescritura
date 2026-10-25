import type { ComponentType } from 'react'
import type { Mecanica, Paso, ResultadoPaso } from '../types/content'
import { BloquesConstruccion } from './BloquesConstruccion/BloquesConstruccion'
import { DecodificadorColor } from './DecodificadorColor/DecodificadorColor'
import { EncuentraDiferente } from './EncuentraDiferente/EncuentraDiferente'
import { ElevadorSilabas } from './ElevadorSilabas/ElevadorSilabas'
import { EscuchaYElige } from './EscuchaYElige/EscuchaYElige'
import { LupaMagica } from './LupaMagica/LupaMagica'
import { Palmadas } from './Palmadas/Palmadas'
import { PresentacionFonema } from './PresentacionFonema/PresentacionFonema'
import { RuletaSilabica } from './RuletaSilabica/RuletaSilabica'
import { TrazoGuiado } from './TrazoGuiado/TrazoGuiado'
import { UnirPuntos } from './UnirPuntos/UnirPuntos'

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
  bloques_construccion: BloquesConstruccion,
  decodificador_color: DecodificadorColor,
  lupa_magica: LupaMagica,
  ruleta_silabica: RuletaSilabica,
  trazo_guiado: TrazoGuiado,
  unir_puntos: UnirPuntos,
  encuentra_diferente: EncuentraDiferente,
  escucha_y_elige: EscuchaYElige,
  palmadas: Palmadas,
}

export function RenderMecanica({ paso, onTerminar }: PropsMecanica) {
  const Componente = MECANICAS[paso.mecanica] as ComponentType<PropsMecanica>
  return <Componente paso={paso} onTerminar={onTerminar} />
}
