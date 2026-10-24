/**
 * Ficha de color con forma. Cada color va siempre con una forma distinta
 * para que el decodificador funcione también con daltonismo.
 */
import type { Forma } from '../../lib/formas'

const TRAZOS: Record<Forma, string> = {
  circulo: 'M50 8a42 42 0 1 0 0.01 0Z',
  triangulo: 'M50 8 94 88H6Z',
  cuadrado: 'M10 10h80v80H10Z',
  estrella: 'M50 5l13 28 31 4-23 21 6 31-27-15-27 15 6-31L6 37l31-4Z',
  corazon: 'M50 90 12 52C-4 34 8 8 30 10c10 1 16 8 20 14 4-6 10-13 20-14 22-2 34 24 18 42Z',
  rombo: 'M50 4 92 50 50 96 8 50Z',
}

export function Ficha({ color, forma, className = 'h-10 w-10' }: { color: string; forma: Forma; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d={TRAZOS[forma]} fill={color} stroke="#2b2d42" strokeOpacity={0.15} strokeWidth={3} />
    </svg>
  )
}
