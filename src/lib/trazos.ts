import type { FormaTrazo } from '../types/content'

/**
 * Caminos para el trazo guiado (viewBox 400×200). Todos empiezan a la
 * izquierda y terminan a la derecha: refuerzan la direccionalidad de la lectura.
 * Son los trazos previos a las letras: línea, ondas, zigzag, arcos (como u) y montañas (como n).
 */
export const CAMINOS: Record<FormaTrazo, string> = {
  linea: 'M30 100 L370 100',
  ondas: 'M30 100 C70 30 110 30 145 100 S220 170 255 100 S330 30 370 100',
  zigzag: 'M30 150 L95 50 L160 150 L225 50 L290 150 L370 50',
  arcos: 'M30 60 Q72 170 115 60 Q157 170 200 60 Q242 170 285 60 Q327 170 370 60',
  montanas: 'M30 150 Q72 30 115 150 Q157 30 200 150 Q242 30 285 150 Q327 30 370 150',
}
