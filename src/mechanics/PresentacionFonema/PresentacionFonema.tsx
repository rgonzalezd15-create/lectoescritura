import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { BigButton } from '../../components/ui/BigButton'
import { audio } from '../../lib/audio/AudioEngine'
import { fonemaPorId } from '../../lib/contentLoader'
import type { PasoPresentacion, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoPresentacion
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Reproductor fonético: letra minúscula grande + su SONIDO (nunca su nombre),
 * gesto de boca (vocales) e imagen de una palabra que empieza con ese sonido.
 */
export function PresentacionFonema({ paso, onTerminar }: Props) {
  const f = fonemaPorId.get(paso.fonema)!
  const [sonando, setSonando] = useState(false)
  const [escuchado, setEscuchado] = useState(false)

  const tocarFonema = useCallback(async () => {
    setSonando(true)
    await audio.secuencia([() => audio.fonema(f)])
    setSonando(false)
    setEscuchado(true)
  }, [f])

  const tocarEjemplo = () =>
    void audio.secuencia([() => audio.fonema(f), () => audio.palabra(f.ejemplo.palabra)], 250)

  useEffect(() => {
    void tocarFonema()
    return () => audio.detener()
  }, [tocarFonema])

  const color = f.tipo === 'vocal' ? 'text-vocal' : 'text-consonante'
  // Sonidos continuos se "estiran"; la /p/ hace un pequeño salto.
  const animacion = sonando
    ? f.continuo
      ? { scaleX: [1, 1.25, 1.25, 1], transition: { duration: 0.9 } }
      : { scale: [1, 1.15, 1], transition: { duration: 0.25 } }
    : { scaleX: 1, scale: 1 }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
      <motion.button
        type="button"
        aria-label={`Escuchar el sonido ${f.sonido}`}
        onClick={() => void tocarFonema()}
        whileTap={{ scale: 0.92 }}
        className="flex h-64 w-64 cursor-pointer items-center justify-center rounded-[3rem] bg-white shadow-[0_10px_0_#e2d6c3] sm:h-80 sm:w-80"
      >
        <motion.span animate={animacion} className={`text-[11rem] leading-none font-bold sm:text-[14rem] ${color}`}>
          {f.grafema}
        </motion.span>
      </motion.button>

      <div className="flex flex-wrap items-center justify-center gap-6">
        {f.boca && (
          <div className="flex flex-col items-center" title={f.boca.texto}>
            <span className="text-7xl" role="img" aria-label={f.boca.texto}>
              {f.boca.icono}
            </span>
          </div>
        )}
        <BigButton variante="suave" onClick={tocarEjemplo} aria-label={`Palabra ${f.ejemplo.palabra}`} className="py-3">
          <span className="text-6xl">{f.ejemplo.icono}</span>
          <span className="text-4xl">
            <span className={color}>{f.ejemplo.palabra[0]}</span>
            {f.ejemplo.palabra.slice(1)}
          </span>
        </BigButton>
      </div>

      <motion.div animate={{ opacity: escuchado ? 1 : 0 }} className="h-20">
        <BigButton
          variante="exito"
          aria-label="Siguiente"
          disabled={!escuchado}
          onClick={() => onTerminar({ aciertos: 0, total: 0 })}
        >
          ➜
        </BigButton>
      </motion.div>
    </div>
  )
}
