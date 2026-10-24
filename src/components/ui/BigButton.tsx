import { motion, type HTMLMotionProps } from 'framer-motion'

type Variante = 'primario' | 'exito' | 'suave' | 'fantasma'

const estilos: Record<Variante, string> = {
  primario: 'bg-primario text-white shadow-[0_6px_0_#1e40af]',
  exito: 'bg-exito text-white shadow-[0_6px_0_#14532d]',
  suave: 'bg-white text-tinta shadow-[0_6px_0_#e2d6c3]',
  fantasma: 'bg-transparent text-tinta',
}

interface Props extends HTMLMotionProps<'button'> {
  variante?: Variante
  /** Obligatorio cuando el botón solo muestra un icono. */
  'aria-label'?: string
}

/** Botón grande (mínimo 72px) con respuesta táctil inmediata. */
export function BigButton({ variante = 'primario', className = '', children, ...rest }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9, y: 4 }}
      whileHover={{ scale: 1.04 }}
      className={`flex min-h-18 min-w-18 cursor-pointer items-center justify-center gap-2 rounded-3xl px-5 text-4xl font-bold disabled:cursor-not-allowed disabled:opacity-40 ${estilos[variante]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
