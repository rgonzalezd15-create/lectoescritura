import { LayoutGroup, motion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Celebracion } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { Letras } from '../../components/ui/Letra'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import { barajar, silabasDe } from '../../lib/silabas'
import { useProgress } from '../../store/progressStore'
import type { ObjetivoLupa, PasoLupa, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoLupa
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Lupa / Revelador mágico: las sílabas están escondidas bajo una trama roja.
 * Dentro del lente rojo la trama desaparece (como el filtro rojo físico).
 * El niño, como detective, descubre las sílabas y toca en orden las que
 * forman la palabra de la imagen.
 */
export function LupaMagica({ paso, onTerminar }: Props) {
  const [k, setK] = useState(0)
  const aciertos = useRef(0)

  const alTerminarRonda = (acierto: boolean) => {
    if (acierto) aciertos.current++
    if (k + 1 < paso.objetivos.length) setK(k + 1)
    else onTerminar({ aciertos: aciertos.current, total: paso.objetivos.length })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PuntosRetos actual={k} total={paso.objetivos.length} />
      <Ronda key={k} objetivo={paso.objetivos[k]} onFin={alTerminarRonda} />
    </div>
  )
}

const RADIO = 58
/** Centros de una cuadrícula 3×3 (en fracción del ancho/alto). La celda 0 queda libre para la lupa. */
const CELDAS = [0, 1, 2].flatMap((f) => [0, 1, 2].map((c) => ({ x: (2 * c + 1) / 6, y: (2 * f + 1) / 6 })))

interface Escondida {
  i: number
  texto: string
  x: number
  y: number
}

type Estado = 'jugando' | 'bien'

function Ronda({ objetivo, onFin }: { objetivo: ObjetivoLupa; onFin: (ok: boolean) => void }) {
  const registrar = useProgress((s) => s.registrar)
  const silabas = silabasDe(objetivo)
  const trama = useId().replace(/:/g, '')

  const [escondidas] = useState<Escondida[]>(() => {
    const celdas = barajar(CELDAS.slice(1))
    return [...silabas, ...objetivo.distractores].map((texto, i) => ({
      i,
      texto,
      x: celdas[i].x + (Math.random() - 0.5) * 0.06,
      y: celdas[i].y + (Math.random() - 0.5) * 0.06,
    }))
  })
  const tarjeta = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  const [lente, setLente] = useState({ x: CELDAS[0].x, y: CELDAS[0].y })
  const [movida, setMovida] = useState(false)
  const [descubiertas, setDescubiertas] = useState<Set<number>>(new Set())
  const [colocadas, setColocadas] = useState<number[]>([])
  const [descartadas, setDescartadas] = useState<Set<number>>(new Set())
  const [sacudir, setSacudir] = useState<number | null>(null)
  const [pista, setPista] = useState<number | null>(null)
  const [estado, setEstado] = useState<Estado>('jugando')
  const [celebrar, setCelebrar] = useState(false)
  const errores = useRef(0)
  const erroresPos = useRef(0)
  const montado = useRef(true)
  /** Sílabas que ya estaban descubiertas ANTES del toque actual. */
  const previas = useRef<Set<number>>(new Set())

  const decirPalabra = () => audio.palabra(objetivo.texto)

  useLayoutEffect(() => {
    const el = tarjeta.current
    if (!el) return
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    montado.current = true
    const t = setTimeout(() => void audio.secuencia([decirPalabra]), 450)
    return () => {
      montado.current = false
      clearTimeout(t)
      audio.detener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const descubrir = (i: number) => {
    if (descubiertas.has(i)) return
    setDescubiertas((d) => new Set(d).add(i))
    void audio.secuencia([() => audio.silaba(escondidas[i].texto)])
  }

  /** Mueve la lupa y descubre lo que quede bajo el lente. */
  const moverLente = (x: number, y: number) => {
    setLente({ x, y })
    setMovida(true)
    for (const e of escondidas) {
      const dx = (e.x - x) * tam.w
      const dy = (e.y - y) * tam.h
      if (Math.hypot(dx, dy) < RADIO * 0.75) descubrir(e.i)
    }
  }

  const alMover = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.type === 'pointerdown') previas.current = new Set(descubiertas)
    if (ev.pointerType !== 'mouse' && ev.buttons === 0) return
    const r = ev.currentTarget.getBoundingClientRect()
    moverLente((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height)
  }

  /** `teclado`: activado con Enter/Espacio (sin toque previo). */
  const tocar = async (e: Escondida, teclado: boolean) => {
    // Un toque sobre una sílaba aún escondida solo la descubre; hay que verla antes de elegirla.
    const yaVista = teclado ? descubiertas.has(e.i) : previas.current.has(e.i)
    if (!yaVista) {
      moverLente(e.x, e.y)
      return
    }
    if (estado !== 'jugando' || colocadas.includes(e.i) || descartadas.has(e.i)) {
      void audio.secuencia([() => audio.silaba(e.texto)])
      return
    }
    const buscada = silabas[colocadas.length]
    if (e.texto === buscada) {
      registrar('silabas', buscada, erroresPos.current === 0)
      erroresPos.current = 0
      setPista(null)
      const nuevas = [...colocadas, e.i]
      setColocadas(nuevas)
      if (nuevas.length < silabas.length) {
        void audio.secuencia([() => audio.silaba(e.texto)])
        return
      }
      setEstado('bien')
      await audio.secuencia(
        [() => audio.tono('exito'), ...silabas.map((s) => () => audio.silaba(s)), decirPalabra],
        250,
      )
      if (!montado.current) return
      setCelebrar(true)
      await audio.secuencia([() => audio.frase('bien')])
      if (montado.current) onFin(errores.current === 0)
      return
    }

    // Autocorrección: la sílaba que sobra se apaga; si era de la palabra pero fuera de orden, solo se avisa.
    errores.current++
    erroresPos.current++
    if (!silabas.includes(e.texto)) setDescartadas((d) => new Set(d).add(e.i))
    setSacudir(e.i)
    setTimeout(() => montado.current && setSacudir(null), 500)
    if (erroresPos.current >= 2) {
      const correcta = escondidas.find((x) => x.texto === buscada && !colocadas.includes(x.i))!
      setPista(correcta.i)
      setDescubiertas((d) => new Set(d).add(correcta.i))
    }
    void audio.secuencia([() => audio.tono('intento'), decirPalabra])
  }

  const px = (f: number, total: number) => f * total
  const clip = `circle(${RADIO}px at ${px(lente.x, tam.w)}px ${px(lente.y, tam.h)}px)`

  return (
    <LayoutGroup>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-3 pb-4 sm:gap-6">
        <Celebracion visible={celebrar} />

        <div className="flex items-center gap-3 sm:gap-5">
          <span className="text-6xl sm:text-7xl" role="img" aria-label={objetivo.texto}>
            {objetivo.icono}
          </span>
          <div className="flex gap-1 rounded-3xl bg-white/60 p-2" aria-label="Palabra encontrada">
            {silabas.map((_, n) => {
              const i = colocadas[n]
              const siguiente = n === colocadas.length && estado === 'jugando'
              return (
                <div
                  key={n}
                  className={`flex h-20 min-w-20 items-center justify-center rounded-2xl ${
                    i === undefined ? `border-4 border-dashed ${siguiente ? 'border-primario' : 'border-tenue/40'}` : ''
                  }`}
                >
                  {i !== undefined && (
                    <motion.span
                      layoutId={`lupa-${i}`}
                      className="flex h-20 min-w-20 items-center justify-center rounded-2xl bg-white px-2 text-4xl font-bold shadow-[0_5px_0_#15803d]"
                    >
                      <Letras texto={escondidas[i].texto} />
                    </motion.span>
                  )}
                </div>
              )
            })}
          </div>
          <BigButton variante="suave" aria-label="Escuchar la palabra" onClick={() => void audio.secuencia([decirPalabra])}>
            👂
          </BigButton>
        </div>

        {/* Tarjeta con tinta oculta bajo la trama roja */}
        <div
          ref={tarjeta}
          onPointerDown={alMover}
          onPointerMove={alMover}
          className="relative h-72 w-full max-w-xl cursor-none touch-none overflow-hidden rounded-[2rem] bg-white shadow-[0_8px_0_#e2d6c3] sm:h-80"
          aria-label="Tarjeta secreta: pasa la lupa"
        >
          {/* 1. Trama roja que esconde la tinta (sin lupa no se lee nada) */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <pattern id={`${trama}a`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <path d="M0 8 Q4 2 8 8 T16 8" stroke="#ef4444" strokeWidth="3" fill="none" />
                <circle cx="4" cy="14" r="1.8" fill="#f87171" />
              </pattern>
              <pattern id={`${trama}b`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
                <path d="M0 6 H12" stroke="#fb7185" strokeWidth="2.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${trama}b)`} />
            <rect width="100%" height="100%" fill={`url(#${trama}a)`} />
          </svg>

          {/* 2. Lo que se ve a través del lente rojo: sin trama, tinta oscura */}
          <div className="pointer-events-none absolute inset-0 bg-[#fecaca]" style={{ clipPath: clip }} aria-hidden>
            {escondidas
              .filter((e) => !colocadas.includes(e.i) && !descartadas.has(e.i))
              .map((e) => (
              <span
                key={e.i}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl font-bold text-[#3b0d0d]"
                style={{ left: `${e.x * 100}%`, top: `${e.y * 100}%` }}
              >
                {e.texto}
              </span>
              ))}
          </div>

          {/* 3. Sílabas: invisibles hasta descubrirlas; después, fichas que se pueden tocar */}
          {escondidas.map((e) => {
            if (colocadas.includes(e.i)) return null
            const vista = descubiertas.has(e.i)
            const apagada = descartadas.has(e.i)
            return (
              <motion.button
                key={e.i}
                type="button"
                layoutId={`lupa-${e.i}`}
                aria-label={vista ? `Sílaba ${e.texto}` : `Escondite ${e.i + 1}`}
                onClick={(ev) => void tocar(e, ev.detail === 0)}
                onFocus={() => moverLente(e.x, e.y)}
                animate={
                  sacudir === e.i
                    ? { x: [0, -10, 10, -6, 6, 0] }
                    : pista === e.i
                      ? { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 0.9 } }
                      : { x: 0, scale: 1, opacity: apagada ? 0.35 : 1 }
                }
                className={`absolute flex h-20 min-w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl px-2 text-5xl font-bold ${
                  vista ? 'bg-white shadow-[0_5px_0_#e2d6c3]' : 'bg-transparent text-transparent'
                }`}
                style={{
                  left: `${e.x * 100}%`,
                  top: `${e.y * 100}%`,
                  outline: pista === e.i ? '4px solid #2563eb' : undefined,
                }}
              >
                {vista ? <Letras texto={e.texto} /> : e.texto}
              </motion.button>
            )
          })}

          {/* 4. Aro de la lupa */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute rounded-full border-[7px] border-[#44403c]"
            style={{
              width: RADIO * 2,
              height: RADIO * 2,
              left: px(lente.x, tam.w) - RADIO,
              top: px(lente.y, tam.h) - RADIO,
            }}
            animate={movida ? { scale: 1 } : { scale: [1, 1.12, 1], transition: { repeat: Infinity, duration: 1.2 } }}
          >
            <span className="absolute -right-7 -bottom-7 h-5 w-12 rotate-45 rounded-full bg-[#44403c]" />
          </motion.div>
        </div>
      </div>
    </LayoutGroup>
  )
}
