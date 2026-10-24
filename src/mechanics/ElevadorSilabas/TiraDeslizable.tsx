import { animate, motion, useMotionValue } from 'framer-motion'
import { useEffect } from 'react'

export const ALTO_ITEM = 88

interface Props {
  items: string[]
  indice: number
  onCambio: (i: number) => void
  tipo: 'consonante' | 'vocal'
  etiqueta: string
}

const resorte = { type: 'spring', stiffness: 420, damping: 36 } as const

/**
 * Tira vertical de letras que se desliza con el dedo y se ajusta
 * a la ventana central (como los elevadores de cartón).
 */
export function TiraDeslizable({ items, indice, onCambio, tipo, etiqueta }: Props) {
  const y = useMotionValue(-indice * ALTO_ITEM)
  const fija = items.length === 1

  useEffect(() => {
    const c = animate(y, -indice * ALTO_ITEM, resorte)
    return () => c.stop()
  }, [indice, y])

  const alSoltar = () => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(-y.get() / ALTO_ITEM)))
    if (i === indice) animate(y, -indice * ALTO_ITEM, resorte)
    else onCambio(i)
  }

  return (
    <div
      className="relative w-[4.5rem] overflow-hidden sm:w-28"
      style={{
        height: ALTO_ITEM * 3,
        maskImage: 'linear-gradient(transparent, #000 28%, #000 72%, transparent)',
        WebkitMaskImage: 'linear-gradient(transparent, #000 28%, #000 72%, transparent)',
      }}
      role="listbox"
      aria-label={etiqueta}
    >
      <motion.div
        className={`absolute inset-x-0 ${fija ? '' : 'cursor-grab touch-none active:cursor-grabbing'}`}
        style={{ y, top: ALTO_ITEM }}
        drag={fija ? false : 'y'}
        dragConstraints={{ top: -(items.length - 1) * ALTO_ITEM, bottom: 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragEnd={alSoltar}
      >
        {items.map((letra, i) => (
          <div
            key={letra}
            role="option"
            aria-selected={i === indice}
            className={`flex items-center justify-center text-7xl leading-none sm:text-8xl font-bold ${
              tipo === 'vocal' ? 'text-vocal' : 'text-consonante'
            }`}
            style={{ height: ALTO_ITEM }}
          >
            {letra}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
