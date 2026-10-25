import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Celebracion } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import type { FraseId } from '../../lib/audio/rutas'
import { barajar } from '../../lib/silabas'
import { fonemaPorId } from '../../lib/contentLoader'
import { useProgress } from '../../store/progressStore'
import type { ModoEscucha, PasoEscucha, ResultadoPaso, RondaEscucha } from '../../types/content'

interface Props {
  paso: PasoEscucha
  onTerminar: (r: ResultadoPaso) => void
}

const FRASE_MODO: Record<ModoEscucha, FraseId> = {
  sonido_inicial: 'empieza',
  rima: 'rima',
  contraste: 'cual',
}

/**
 * Escucha y elige (conciencia fonológica, sin leer): según el modo, el niño
 * toca las imágenes que empiezan con un sonido, las que riman o la que oyó.
 * Cada imagen dice su nombre al tocarla: así compara lo que oye.
 */
export function EscuchaYElige({ paso, onTerminar }: Props) {
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
      <Ronda key={k} ronda={paso.rondas[k]} primera={k === 0} onFin={alTerminar} />
    </div>
  )
}

function Ronda({ ronda, primera, onFin }: { ronda: RondaEscucha; primera: boolean; onFin: (limpio: boolean) => void }) {
  const registrar = useProgress((s) => s.registrar)
  const [opciones] = useState(() => barajar(ronda.opciones))
  const [elegidas, setElegidas] = useState<string[]>([])
  const [descartadas, setDescartadas] = useState<string[]>([])
  const [listo, setListo] = useState(false)
  const errores = useRef(0)
  const montado = useRef(true)
  const fonema = ronda.modo === 'sonido_inicial' ? fonemaPorId.get(ronda.estimulo) : undefined
  const correctas = ronda.opciones.filter((o) => o.correcta).length

  /** El estímulo: un sonido (/sss/) o una palabra (gato). */
  const decirEstimulo = () => (fonema ? audio.fonema(fonema) : audio.palabra(ronda.estimulo))

  useEffect(() => {
    montado.current = true
    const pasos = primera ? [() => audio.frase(FRASE_MODO[ronda.modo]), decirEstimulo] : [decirEstimulo]
    const t = setTimeout(() => void audio.secuencia(pasos, 350), 350)
    return () => {
      montado.current = false
      clearTimeout(t)
      audio.detener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const elegir = async (texto: string, correcta: boolean) => {
    if (listo || elegidas.includes(texto) || descartadas.includes(texto)) return
    if (fonema) registrar('fonemas', fonema.id, correcta)
    if (!correcta) {
      errores.current++
      setDescartadas([...descartadas, texto])
      void audio.secuencia([() => audio.palabra(texto), () => audio.tono('intento'), decirEstimulo], 250)
      return
    }
    const nuevas = [...elegidas, texto]
    setElegidas(nuevas)
    if (nuevas.length < correctas) {
      void audio.secuencia([() => audio.palabra(texto), () => audio.tono('exito')], 150)
      return
    }
    setListo(true)
    await audio.secuencia([() => audio.palabra(texto), () => audio.tono('exito'), () => audio.frase('bien')], 150)
    if (montado.current) setTimeout(() => montado.current && onFin(errores.current === 0), 400)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-3 pb-4 sm:gap-8">
      <Celebracion visible={listo} />

      {/* Estímulo: oreja (sonido o palabra escondida) o la imagen de la palabra a rimar */}
      <div className="flex items-center gap-4">
        {ronda.modo === 'rima' && ronda.icono && (
          <span className="text-7xl sm:text-8xl" role="img" aria-label={ronda.estimulo}>
            {ronda.icono}
          </span>
        )}
        <BigButton variante="primario" aria-label="Escuchar otra vez" onClick={() => void audio.secuencia([decirEstimulo])} className="min-h-20 min-w-20">
          👂
        </BigButton>
      </div>

      <div className="flex max-w-3xl flex-wrap justify-center gap-3 sm:gap-5">
        {opciones.map((o) => {
          const elegida = elegidas.includes(o.texto)
          const descartada = descartadas.includes(o.texto)
          return (
            <motion.button
              key={o.texto}
              type="button"
              aria-label={o.texto}
              disabled={listo || descartada || elegida}
              onClick={() => void elegir(o.texto, o.correcta)}
              whileTap={{ scale: 0.92 }}
              animate={descartada ? { x: [0, -8, 8, -5, 5, 0], opacity: 0.3 } : elegida ? { scale: [1, 1.15, 1.05] } : { opacity: 1 }}
              className="relative flex h-28 w-28 cursor-pointer items-center justify-center rounded-3xl bg-white text-7xl shadow-[0_6px_0_#e2d6c3] disabled:cursor-default sm:h-36 sm:w-36 sm:text-8xl"
              style={{ outline: elegida ? '5px solid #15803d' : undefined }}
            >
              {o.icono}
              {elegida && <span className="absolute -top-3 -right-3 rounded-full bg-exito px-2 text-2xl text-white">✓</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
