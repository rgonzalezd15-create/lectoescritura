import { animate, motion, useMotionValue, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Celebracion, IntentaOtraVez } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { Letras } from '../../components/ui/Letra'
import { audio } from '../../lib/audio/AudioEngine'
import { esVocal } from '../../lib/silabas'
import type { Objetivo, PasoRuleta, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoRuleta
  onTerminar: (r: ResultadoPaso) => void
}

// Geometría del SVG (viewBox 320×320)
const C = 160
const R_EXT = 148
const R_EXT_IN = 96
const R_INT = 92
const R_TXT_EXT = 122
const R_TXT_INT = 58

const resorte = { type: 'spring', stiffness: 260, damping: 30 } as const
const mod = (a: number, n: number) => ((a % n) + n) % n

function punto(r: number, grados: number) {
  const a = (grados * Math.PI) / 180
  return `${C + r * Math.sin(a)} ${C - r * Math.cos(a)}`
}

/** Sector de anillo entre r0 y r1, ángulos en grados (0 = arriba, sentido horario). */
function sector(r0: number, r1: number, a0: number, a1: number) {
  const grande = a1 - a0 > 180 ? 1 : 0
  if (r0 === 0) return `M${C} ${C} L${punto(r1, a0)} A${r1} ${r1} 0 ${grande} 1 ${punto(r1, a1)} Z`
  return `M${punto(r1, a0)} A${r1} ${r1} 0 ${grande} 1 ${punto(r1, a1)} L${punto(r0, a1)} A${r0} ${r0} 0 ${grande} 0 ${punto(r0, a0)} Z`
}

/** Índice que queda arriba (bajo la ventana) para una rotación dada. */
const indiceArriba = (rot: number, n: number) => mod(-Math.round(rot / (360 / n)), n)

/**
 * Ruleta silábica: dos ruedas concéntricas sobre un eje. El anillo de afuera
 * da la primera sílaba (arriba en la ventana) y la rueda de adentro la segunda
 * (debajo), así la ventana se lee en orden de arriba abajo. El niño gira, escucha la
 * combinación y decide si es una palabra de verdad; las que acierta van a su álbum.
 */
export function RuletaSilabica({ paso, onTerminar }: Props) {
  const meta = Math.min(paso.meta ?? 5, paso.palabras.length)
  const rotInt = useMotionValue(0)
  const rotExt = useMotionValue(0)
  const [sel, setSel] = useState({ i: 0, e: 0 })
  const [girando, setGirando] = useState(false)
  const [encontradas, setEncontradas] = useState<Objetivo[]>([])
  const [destello, setDestello] = useState<string | null>(null)
  const [aviso, setAviso] = useState<'bien' | 'no' | null>(null)
  const [terminado, setTerminado] = useState(false)
  const errores = useRef(0)
  const montado = useRef(true)
  const arrastre = useRef<{ anillo: 'i' | 'e'; ultimo: number } | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  const combinacion = paso.primera[sel.e] + paso.segunda[sel.i]
  const bloqueado = girando || terminado

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      audio.detener()
    }
  }, [])

  /** Lee lo que quedó en la ventana: sílaba, sílaba, combinación. */
  const asentar = () => {
    const i = indiceArriba(rotInt.get(), paso.segunda.length)
    const e = indiceArriba(rotExt.get(), paso.primera.length)
    setSel({ i, e })
    const primera = paso.primera[e]
    const segunda = paso.segunda[i]
    void audio.secuencia([() => audio.silaba(primera), () => audio.silaba(segunda), () => audio.palabra(primera + segunda)], 250)
  }

  const ajustar = async (mv: MotionValue<number>, n: number, destino?: number) => {
    const seg = 360 / n
    await animate(mv, destino ?? Math.round(mv.get() / seg) * seg, resorte)
    if (montado.current) asentar()
  }

  // ---- Arrastre circular ----
  const local = (ev: PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * 320, y: ((ev.clientY - r.top) / r.height) * 320 }
  }
  const angulo = (p: { x: number; y: number }) => (Math.atan2(p.x - C, -(p.y - C)) * 180) / Math.PI

  const alPresionar = (ev: PointerEvent<SVGSVGElement>) => {
    if (bloqueado) return
    const p = local(ev)
    const dist = Math.hypot(p.x - C, p.y - C)
    if (dist < 20 || dist > R_EXT + 6) return
    arrastre.current = { anillo: dist > R_EXT_IN - 2 ? 'e' : 'i', ultimo: angulo(p) }
    ev.currentTarget.setPointerCapture(ev.pointerId)
  }
  const alMover = (ev: PointerEvent<SVGSVGElement>) => {
    const a = arrastre.current
    if (!a) return
    const nuevo = angulo(local(ev))
    const delta = mod(nuevo - a.ultimo + 180, 360) - 180
    const mv = a.anillo === 'i' ? rotInt : rotExt
    mv.set(mv.get() + delta)
    a.ultimo = nuevo
  }
  const alSoltar = () => {
    const a = arrastre.current
    if (!a) return
    arrastre.current = null
    if (a.anillo === 'i') void ajustar(rotInt, paso.segunda.length)
    else void ajustar(rotExt, paso.primera.length)
  }

  const conTeclado = (anillo: 'i' | 'e') => (ev: KeyboardEvent) => {
    if (bloqueado || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight')) return
    ev.preventDefault()
    const [mv, n] = anillo === 'i' ? [rotInt, paso.segunda.length] : [rotExt, paso.primera.length]
    const seg = 360 / n
    void ajustar(mv, n, Math.round(mv.get() / seg) * seg + (ev.key === 'ArrowRight' ? -seg : seg))
  }

  /** Giro sorpresa: las dos ruedas en sentidos opuestos. */
  const girar = async () => {
    if (bloqueado) return
    setGirando(true)
    const sI = 360 / paso.segunda.length
    const sE = 360 / paso.primera.length
    const azar = (n: number) => 1 + Math.floor(Math.random() * n)
    const curva = { duration: 1.8, ease: [0.15, 0.7, 0.2, 1] as const }
    await Promise.all([
      animate(rotInt, Math.round(rotInt.get() / sI) * sI - 360 - azar(paso.segunda.length) * sI, curva),
      animate(rotExt, Math.round(rotExt.get() / sE) * sE + 720 + azar(paso.primera.length) * sE, curva),
    ])
    if (!montado.current) return
    setGirando(false)
    asentar()
  }

  const mostrarAviso = (a: 'bien' | 'no') => {
    setAviso(a)
    setTimeout(() => montado.current && setAviso(null), 1300)
  }

  const comprobar = async () => {
    if (bloqueado) return
    const palabra = paso.palabras.find((p) => p.texto === combinacion)
    if (!palabra) {
      errores.current++
      mostrarAviso('no')
      void audio.secuencia([() => audio.tono('intento'), () => audio.palabra(combinacion)])
      return
    }
    if (encontradas.some((p) => p.texto === palabra.texto)) {
      setDestello(palabra.texto)
      setTimeout(() => montado.current && setDestello(null), 900)
      void audio.secuencia([() => audio.palabra(palabra.texto)])
      return
    }
    const nuevas = [...encontradas, palabra]
    setEncontradas(nuevas)
    mostrarAviso('bien')
    if (nuevas.length < meta) {
      void audio.secuencia([() => audio.tono('exito'), () => audio.palabra(palabra.texto)])
      return
    }
    setTerminado(true)
    await audio.secuencia([() => audio.tono('exito'), () => audio.palabra(palabra.texto), () => audio.frase('bien')])
    if (montado.current) onTerminar({ aciertos: Math.max(0, meta - errores.current), total: meta })
  }

  const segI = 360 / paso.segunda.length
  const segE = 360 / paso.primera.length

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-3 pb-4">
      <Celebracion visible={aviso === 'bien'} />
      <IntentaOtraVez visible={aviso === 'no'} />

      {/* Álbum de palabras encontradas */}
      <div className="flex flex-wrap justify-center gap-2" aria-label={`Palabras encontradas: ${encontradas.length} de ${meta}`}>
        {Array.from({ length: meta }, (_, n) => {
          const p = encontradas[n]
          return (
            <motion.button
              key={n}
              type="button"
              disabled={!p}
              aria-label={p ? `Palabra ${p.texto}` : 'Hueco del álbum'}
              onClick={() => p && void audio.secuencia([() => audio.palabra(p.texto)])}
              initial={false}
              animate={{ scale: p && destello === p.texto ? [1, 1.25, 1] : 1 }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl sm:h-20 sm:w-20 sm:text-5xl ${
                p ? 'bg-white shadow-[0_4px_0_#15803d]' : 'border-4 border-dashed border-tenue/40'
              }`}
            >
              {p && (p.icono ? <span>{p.icono}</span> : <Letras texto={p.texto} className="text-2xl font-bold" />)}
            </motion.button>
          )
        })}
      </div>

      {/* Ruedas concéntricas */}
      <svg
        ref={svg}
        viewBox="0 0 320 320"
        className="h-auto w-[min(84vw,340px)] cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        aria-label="Ruleta de sílabas"
      >
        <motion.g
          style={{ rotate: rotExt }}
          tabIndex={0}
          role="slider"
          aria-label="Rueda de afuera"
          aria-valuetext={paso.primera[sel.e]}
          onKeyDown={conTeclado('e')}
        >
          {paso.primera.map((s, n) => (
            <g key={s}>
              <path
                d={sector(R_EXT_IN, R_EXT, n * segE - segE / 2, n * segE + segE / 2)}
                fill={n % 2 ? '#f1e9dc' : '#ffffff'}
                stroke="#e2d6c3"
                strokeWidth={2}
              />
              <TextoRadial texto={s} radio={R_TXT_EXT} angulo={n * segE} tam={30} />
            </g>
          ))}
        </motion.g>

        <motion.g
          style={{ rotate: rotInt }}
          tabIndex={0}
          role="slider"
          aria-label="Rueda de adentro"
          aria-valuetext={paso.segunda[sel.i]}
          onKeyDown={conTeclado('i')}
        >
          {paso.segunda.map((s, n) => (
            <g key={s}>
              <path
                d={sector(0, R_INT, n * segI - segI / 2, n * segI + segI / 2)}
                fill={n % 2 ? '#dbeafe' : '#eff6ff'}
                stroke="#bfdbfe"
                strokeWidth={2}
              />
              <TextoRadial texto={s} radio={R_TXT_INT} angulo={n * segI} tam={30} />
            </g>
          ))}
        </motion.g>

        {/* Eje, ventana y flecha (no giran) */}
        <circle cx={C} cy={C} r={18} fill="#44403c" />
        <circle cx={C} cy={C} r={7} fill="#a8a29e" />
        <rect x={C - 38} y={C - R_EXT - 2} width={76} height={R_EXT - 22} rx={16} fill="none" stroke="#2563eb" strokeWidth={6} />
        <path d={`M${C - 14} 0 L${C + 14} 0 L${C} 16 Z`} fill="#2563eb" />
      </svg>

      {/* Ventana de lectura y botones */}
      <div className="flex items-center gap-3 sm:gap-5">
        <BigButton variante="suave" aria-label="Girar la ruleta" disabled={bloqueado} onClick={() => void girar()}>
          🎲
        </BigButton>
        <button
          type="button"
          aria-label={`Escuchar ${combinacion}`}
          onClick={asentar}
          className="flex h-20 cursor-pointer items-center gap-1 rounded-2xl bg-white px-4 text-5xl font-bold shadow-[0_5px_0_#e2d6c3]"
        >
          <Letras texto={paso.primera[sel.e]} />
          <span className="text-tenue/40">·</span>
          <Letras texto={paso.segunda[sel.i]} />
        </button>
        <BigButton variante="exito" aria-label="¡Es una palabra!" disabled={bloqueado} onClick={() => void comprobar()}>
          ✓
        </BigButton>
      </div>
    </div>
  )
}

/** Sílaba escrita en su sector, derecha cuando queda arriba, con colores de vocal/consonante. */
function TextoRadial({ texto, radio, angulo, tam }: { texto: string; radio: number; angulo: number; tam: number }) {
  return (
    <text
      transform={`rotate(${angulo} ${C} ${C})`}
      x={C}
      y={C - radio}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={tam}
      fontWeight={700}
      fontFamily="Andika, sans-serif"
      style={{ pointerEvents: 'none' }}
    >
      {[...texto].map((ch, i) => (
        <tspan key={i} fill={esVocal(ch) ? '#c2410c' : '#1d4ed8'}>
          {ch}
        </tspan>
      ))}
    </text>
  )
}
