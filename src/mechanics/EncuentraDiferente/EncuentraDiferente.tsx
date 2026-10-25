import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Celebracion } from '../../components/feedback/Celebracion'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import type { CambioDiferente, PasoDiferente, ResultadoPaso, RondaDiferente } from '../../types/content'

interface Props {
  paso: PasoDiferente
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * ¿Cuál es diferente? (percepción visual y orientación espacial): entre
 * elementos iguales hay uno en espejo, de cabeza o más pequeño. Entrenar la
 * orientación previene la inversión de letras como p/q o b/d.
 */
export function EncuentraDiferente({ paso, onTerminar }: Props) {
  const [k, setK] = useState(0)
  const aciertos = useRef(0)

  const alTerminar = (limpio: boolean) => {
    if (limpio) aciertos.current++
    if (k + 1 < paso.rondas.length) setK(k + 1)
    else onTerminar({ aciertos: aciertos.current, total: paso.rondas.length })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PuntosRetos actual={k} total={paso.rondas.length} />
      <Ronda key={k} ronda={paso.rondas[k]} onFin={alTerminar} />
    </div>
  )
}

const TRANSFORMACION: Record<CambioDiferente, string> = {
  espejo: 'scaleX(-1)',
  invertido: 'scaleY(-1)',
  tamano: 'scale(0.6)',
}

function Ronda({ ronda, onFin }: { ronda: RondaDiferente; onFin: (limpio: boolean) => void }) {
  const [distinto] = useState(() => Math.floor(Math.random() * ronda.cantidad))
  const [descartados, setDescartados] = useState<number[]>([])
  const [encontrado, setEncontrado] = useState(false)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    const t = setTimeout(() => void audio.secuencia([() => audio.frase('diferente')]), 300)
    return () => {
      montado.current = false
      clearTimeout(t)
    }
  }, [])

  const elegir = async (i: number) => {
    if (encontrado || descartados.includes(i)) return
    if (i !== distinto) {
      setDescartados([...descartados, i])
      void audio.secuencia([() => audio.tono('intento')])
      return
    }
    setEncontrado(true)
    await audio.secuencia([() => audio.tono('exito'), () => audio.frase('bien')])
    if (montado.current) setTimeout(() => montado.current && onFin(descartados.length === 0), 400)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-3 pb-4">
      <Celebracion visible={encontrado} />
      <div className="flex max-w-3xl flex-wrap justify-center gap-3 sm:gap-5">
        {Array.from({ length: ronda.cantidad }, (_, i) => {
          const esDistinto = i === distinto
          const descartado = descartados.includes(i)
          return (
            <motion.button
              key={i}
              type="button"
              aria-label={`Elemento ${i + 1}`}
              onClick={() => void elegir(i)}
              disabled={encontrado || descartado}
              whileTap={{ scale: 0.92 }}
              animate={
                descartado
                  ? { x: [0, -8, 8, -5, 5, 0], opacity: 0.35 }
                  : encontrado && esDistinto
                    ? { scale: [1, 1.2, 1.1] }
                    : { opacity: 1 }
              }
              className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-3xl bg-white shadow-[0_6px_0_#e2d6c3] disabled:cursor-default sm:h-36 sm:w-36"
              style={{ outline: encontrado && esDistinto ? '5px solid #15803d' : undefined }}
            >
              <span
                className={`inline-block text-7xl leading-none sm:text-8xl ${/^\p{L}$/u.test(ronda.icono) ? 'font-bold text-consonante' : ''}`}
                style={{ transform: esDistinto ? TRANSFORMACION[ronda.cambio] : undefined }}
              >
                {ronda.icono}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
