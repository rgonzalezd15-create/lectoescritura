import { AnimatePresence, motion } from 'framer-motion'

const PARTICULAS = Array.from({ length: 12 }, (_, i) => {
  const ang = (i / 12) * Math.PI * 2
  return { x: Math.cos(ang) * 160, y: Math.sin(ang) * 160, icono: i % 3 === 0 ? '🌟' : '⭐' }
})

/** Explosión de estrellas: refuerzo visual inmediato al acertar. */
export function Celebracion({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
        >
          <span className="sr-only">¡Muy bien!</span>
          {PARTICULAS.map((p, i) => (
            <motion.span
              key={i}
              className="absolute text-5xl"
              initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: 1.2, opacity: 0, rotate: 180 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              {p.icono}
            </motion.span>
          ))}
          <motion.span
            className="text-9xl"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.5 }}
          >
            🎉
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Pista amable cuando no se acierta: nunca una X roja ni sonidos de error. */
export function IntentaOtraVez({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
        >
          <span className="sr-only">Escucha otra vez</span>
          <motion.span
            className="rounded-full bg-white px-6 py-3 text-6xl shadow-lg"
            animate={{ rotate: [0, -10, 10, -6, 0] }}
            transition={{ duration: 0.6 }}
          >
            👂🤔
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
