import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Celebracion, IntentaOtraVez } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { Letras } from '../../components/ui/Letra'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import type { PalabraPalmadas, PasoPalmadas, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoPalmadas
  onTerminar: (r: ResultadoPaso) => void
}

const MAX_GOLPES = 6

/**
 * Palmadas (segmentación silábica): el niño escucha la palabra y toca el
 * tambor una vez por sílaba. Al comprobar, la app la "aplaude" sílaba por sílaba.
 */
export function Palmadas({ paso, onTerminar }: Props) {
  const [k, setK] = useState(0)
  const aciertos = useRef(0)

  const alTerminar = (limpio: boolean) => {
    if (limpio) aciertos.current++
    if (k + 1 < paso.palabras.length) setK(k + 1)
    else onTerminar({ aciertos: aciertos.current, total: paso.palabras.length })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PuntosRetos actual={k} total={paso.palabras.length} />
      <Ronda key={k} palabra={paso.palabras[k]} primera={k === 0} onFin={alTerminar} />
    </div>
  )
}

type Estado = 'jugando' | 'mostrando' | 'bien' | 'casi'

function Ronda({ palabra, primera, onFin }: { palabra: PalabraPalmadas; primera: boolean; onFin: (limpio: boolean) => void }) {
  const [golpes, setGolpes] = useState(0)
  const [estado, setEstado] = useState<Estado>('jugando')
  /** Sílaba que se está aplaudiendo durante la demostración. */
  const [activa, setActiva] = useState<number | null>(null)
  const fallos = useRef(0)
  const montado = useRef(true)
  const n = palabra.silabas.length

  const decir = () => audio.palabra(palabra.texto)

  useEffect(() => {
    montado.current = true
    const pasos = primera ? [() => audio.frase('palmadas'), decir] : [decir]
    const t = setTimeout(() => void audio.secuencia(pasos, 350), 350)
    return () => {
      montado.current = false
      clearTimeout(t)
      audio.detener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const golpear = () => {
    if (estado !== 'jugando' || golpes >= MAX_GOLPES) return
    setGolpes(golpes + 1)
    void audio.golpe()
  }

  /** Aplaude la palabra: cada sílaba con su golpe y su sonido, luego la palabra entera. */
  const aplaudir = () =>
    audio.secuencia(
      [
        ...palabra.silabas.map((s, i) => async () => {
          setActiva(i)
          void audio.golpe()
          await audio.silaba(s)
        }),
        async () => {
          setActiva(null)
          await decir()
        },
      ],
      300,
    )

  const comprobar = async () => {
    if (estado !== 'jugando' || golpes === 0) return
    const ok = golpes === n
    if (ok) {
      setEstado('bien')
      await audio.secuencia([() => audio.tono('exito')])
      await aplaudir()
      await audio.secuencia([() => audio.frase('bien')])
      if (montado.current) onFin(fallos.current === 0)
      return
    }
    fallos.current++
    if (fallos.current < 2) {
      setEstado('casi')
      await audio.secuencia([() => audio.tono('intento'), () => audio.frase('otra'), decir], 300)
      if (!montado.current) return
      setGolpes(0)
      setEstado('jugando')
      return
    }
    // Segundo intento: la app muestra cómo se aplaude y avanza.
    setEstado('mostrando')
    setGolpes(n)
    await audio.secuencia([() => audio.frase('ayuda')])
    await aplaudir()
    if (montado.current) onFin(false)
  }

  const mostrarSilabas = estado === 'bien' || estado === 'mostrando'

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 px-3 pb-4 sm:gap-7">
      <Celebracion visible={estado === 'bien' && activa === null} />
      <IntentaOtraVez visible={estado === 'casi'} />

      <div className="flex items-center gap-4">
        <span className="text-7xl sm:text-8xl" role="img" aria-label={palabra.texto}>
          {palabra.icono}
        </span>
        <BigButton variante="suave" aria-label="Escuchar la palabra" onClick={() => void audio.secuencia([decir])}>
          👂
        </BigButton>
      </div>

      {/* Contador de golpes; al final se muestran las sílabas aplaudidas */}
      <div className="flex min-h-20 flex-wrap items-center justify-center gap-2" aria-label={`${golpes} golpes`}>
        {mostrarSilabas
          ? palabra.silabas.map((s, i) => (
              <motion.span
                key={i}
                animate={{ scale: activa === i ? 1.25 : 1, y: activa === i ? -6 : 0 }}
                className="rounded-2xl bg-white px-3 py-1 text-4xl font-bold shadow-[0_4px_0_#e2d6c3]"
              >
                <Letras texto={s} />
              </motion.span>
            ))
          : Array.from({ length: Math.max(golpes, 1) }, (_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-5xl ${i < golpes ? '' : 'opacity-15'}`}
                aria-hidden
              >
                👏
              </motion.span>
            ))}
      </div>

      <motion.button
        type="button"
        aria-label="Tambor"
        onClick={golpear}
        disabled={estado !== 'jugando'}
        whileTap={{ scale: 0.85, rotate: -4 }}
        className="flex h-36 w-36 cursor-pointer items-center justify-center rounded-full bg-white text-8xl shadow-[0_8px_0_#e2d6c3] disabled:opacity-50 sm:h-44 sm:w-44 sm:text-9xl"
      >
        🥁
      </motion.button>

      <div className="flex gap-4">
        <BigButton
          variante="suave"
          aria-label="Borrar golpes"
          disabled={estado !== 'jugando' || golpes === 0}
          onClick={() => setGolpes(0)}
        >
          ↩️
        </BigButton>
        <BigButton variante="exito" aria-label="Comprobar" disabled={estado !== 'jugando' || golpes === 0} onClick={() => void comprobar()} className="px-10">
          ✓
        </BigButton>
      </div>
    </div>
  )
}
