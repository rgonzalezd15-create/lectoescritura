import { motion } from 'framer-motion'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Celebracion } from '../../components/feedback/Celebracion'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import type { Dibujo, PasoUnirPuntos, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoUnirPuntos
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Unir puntos: el siguiente punto late; el niño lo toca o pasa el dedo por
 * encima. Al cerrar la figura aparece el dibujo y se dice su nombre.
 */
export function UnirPuntos({ paso, onTerminar }: Props) {
  const [k, setK] = useState(0)
  const aciertos = useRef(0)

  useEffect(() => {
    void audio.secuencia([() => audio.frase('puntos')])
  }, [])

  const alTerminar = (limpio: boolean) => {
    if (limpio) aciertos.current++
    if (k + 1 < paso.dibujos.length) setK(k + 1)
    else onTerminar({ aciertos: aciertos.current, total: paso.dibujos.length })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PuntosRetos actual={k} total={paso.dibujos.length} />
      <Figura key={k} dibujo={paso.dibujos[k]} onFin={alTerminar} />
    </div>
  )
}

/** Radio (en unidades 0–100) dentro del cual el dedo "toca" un punto. */
const ALCANCE = 7

function Figura({ dibujo, onFin }: { dibujo: Dibujo; onFin: (limpio: boolean) => void }) {
  const { puntos } = dibujo
  const [unidos, setUnidos] = useState(1) // el punto 1 ya está "tomado"
  const [dedo, setDedo] = useState<{ x: number; y: number } | null>(null)
  const [sacudir, setSacudir] = useState(0)
  const [completo, setCompleto] = useState(false)
  const errores = useRef(0)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const local = (ev: PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * 100, y: ((ev.clientY - r.top) / r.height) * 100 }
  }

  const terminar = async () => {
    setCompleto(true)
    setDedo(null)
    await audio.secuencia([() => audio.tono('exito'), () => audio.palabra(dibujo.palabra)])
    if (montado.current) setTimeout(() => montado.current && onFin(errores.current === 0), 900)
  }

  /** Revisa si el dedo está sobre el siguiente punto (o sobre uno equivocado al tocar). */
  const revisar = (p: { x: number; y: number }, esToque: boolean) => {
    if (completo) return
    const sig = puntos[unidos]
    if (Math.hypot(p.x - sig[0], p.y - sig[1]) < ALCANCE) {
      const n = unidos + 1
      setUnidos(n)
      void audio.secuencia([() => audio.tono('exito')])
      if (n === puntos.length) void terminar()
      return
    }
    if (esToque) {
      const otro = puntos.findIndex((q, i) => i > unidos && Math.hypot(p.x - q[0], p.y - q[1]) < ALCANCE)
      if (otro >= 0) {
        errores.current++
        setSacudir((s) => s + 1)
        void audio.secuencia([() => audio.tono('intento')])
      }
    }
  }

  const alPresionar = (ev: PointerEvent<SVGSVGElement>) => {
    const p = local(ev)
    ev.currentTarget.setPointerCapture(ev.pointerId)
    setDedo(p)
    revisar(p, true)
  }
  const alMover = (ev: PointerEvent<SVGSVGElement>) => {
    if (!dedo) return
    const p = local(ev)
    setDedo(p)
    revisar(p, false)
  }

  const linea = puntos
    .slice(0, unidos)
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`)
    .join(' ')
  const ultimo = puntos[unidos - 1]

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-3 pb-4">
      <Celebracion visible={completo} />
      <svg
        viewBox="-4 -4 108 108"
        className="aspect-square w-[min(88vw,60vh,520px)] touch-none rounded-[2rem] bg-white shadow-[0_8px_0_#e2d6c3]"
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={() => setDedo(null)}
        onPointerCancel={() => setDedo(null)}
        aria-label={`Une los puntos: ${dibujo.palabra}`}
      >
        {completo && (
          <motion.polygon
            points={puntos.map((q) => q.join(',')).join(' ')}
            fill="#dbeafe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
        <path d={completo ? `${linea} Z` : linea} fill="none" stroke="#2563eb" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Línea elástica desde el último punto hasta el dedo */}
        {dedo && !completo && (
          <line x1={ultimo[0]} y1={ultimo[1]} x2={dedo.x} y2={dedo.y} stroke="#93c5fd" strokeWidth={1.6} strokeDasharray="2 2" />
        )}
        {puntos.map(([x, y], i) => {
          const hecho = i < unidos
          const siguiente = i === unidos && !completo
          return (
            <g key={i}>
              {siguiente && (
                <motion.circle
                  key={sacudir}
                  cx={x}
                  cy={y}
                  fill="#2563eb"
                  opacity={0.25}
                  animate={{ r: [5, 9, 5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
              <circle cx={x} cy={y} r={4.2} fill={hecho ? '#2563eb' : '#ffffff'} stroke="#2563eb" strokeWidth={1.4} />
              <text
                x={x}
                y={y + 0.3}
                fontSize={4.2}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                fill={hecho ? '#ffffff' : '#1d4ed8'}
                style={{ pointerEvents: 'none' }}
              >
                {i + 1}
              </text>
            </g>
          )
        })}
        {completo && (
          <motion.text
            x={50}
            y={52}
            fontSize={30}
            textAnchor="middle"
            dominantBaseline="central"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ originX: '50px', originY: '52px' }}
          >
            {dibujo.icono}
          </motion.text>
        )}
      </svg>
    </div>
  )
}
