import type { Modulo } from '../types/content'
import type { EstadoLeccion } from '../store/progressStore'

/** Dentro de un módulo, cada lección se abre al completar la anterior. */
export function leccionDesbloqueada(
  modulo: Modulo,
  indice: number,
  progreso: Record<string, EstadoLeccion>,
  desbloquearTodo: boolean,
) {
  if (desbloquearTodo || indice === 0) return true
  return !!progreso[modulo.lecciones[indice - 1]]?.completada
}
