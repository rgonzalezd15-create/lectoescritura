import { motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Celebracion } from '../../components/feedback/Celebracion'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import { CAMINOS } from '../../lib/trazos'
import type { PasoTrazo, ResultadoPaso, Trazo } from '../../types/content'

interface Props {
  paso: PasoTrazo
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Trazo guiado (motricidad fina y coordinación ojo-mano): el niño lleva un
 * personaje con el dedo por un camino, siempre de izquierda a derecha.
 * Si se sale, el personaje se queda donde iba (no se pierde lo avanzado).
 */
export function TrazoGuiado({ paso, onTerminar }: Props) {
  const [k, setK] = useState(0)
  const aciertos = useRef(0)

  useEffect(() => {
    void audio.secuencia([() => audio.frase('camino')])
  }, [])

  const alTerminar = (limpio: boolean) => {
    if (limpio) aciertos.current++
    if (k + 1 < paso.trazos.length) setK(k + 1)
    else onTerminar({ aciertos: aciertos.current, total: paso.trazos.length })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PuntosRetos actual={k} total={paso.trazos.length} />
      <Camino key={k} trazo={paso.trazos[k]} onFin={alTerminar} />
    </div>
  )
}

const MUESTRAS = 240
/** Distancia (en unidades del viewBox) para seguir avanzando por el camino. */
const TOLERANCIA = 30
/** Más lejos que esto, el dedo "se salió" del camino. */
const SALIDA = 62
/** Cuánto puede adelantarse el dedo de una vez (evita saltos por atajos). */
const VENTANA = 14

function Camino({ trazo, onFin }: { trazo: Trazo; onFin: (limpio: boolean) => void }) {
  const ruta = useRef<SVGPathElement>(null)
  const [puntos, setPuntos] = useState<{ x: number; y: number }[]>([])
  const [largo, setLargo] = useState(0)
  const [prog, setProg] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const [sacudir, setSacudir] = useState(0)
  const [completo, setCompleto] = useState(false)
  const salidas = useRef(0)
  const montado = useRef(true)
  const d = CAMINOS[trazo.forma]

  useLayoutEffect(() => {
    const p = ruta.current
    if (!p || typeof p.getTotalLength !== 'function') return
    const total = p.getTotalLength()
    setLargo(total)
    setPuntos(
      Array.from({ length: MUESTRAS }, (_, i) => {
        const q = p.getPointAtLength((i / (MUESTRAS - 1)) * total)
        return { x: q.x, y: q.y }
      }),
    )
  }, [d])

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const local = (ev: PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    return { x: ((ev.clientX - r.left) / r.width) * 400, y: ((ev.clientY - r.top) / r.height) * 200 }
  }
  const actual = puntos[prog] ?? { x: 30, y: 100 }

  const alPresionar = (ev: PointerEvent<SVGSVGElement>) => {
    if (completo || !puntos.length) return
    const p = local(ev)
    if (Math.hypot(p.x - actual.x, p.y - actual.y) > SALIDA) {
      setSacudir((n) => n + 1) // "empieza aquí"
      return
    }
    ev.currentTarget.setPointerCapture(ev.pointerId)
    setArrastrando(true)
  }

  const alMover = (ev: PointerEvent<SVGSVGElement>) => {
    if (!arrastrando || completo) return
    const p = local(ev)
    let mejor = prog
    let dist = Math.hypot(p.x - actual.x, p.y - actual.y)
    for (let i = prog + 1; i <= Math.min(prog + VENTANA, MUESTRAS - 1); i++) {
      const dd = Math.hypot(p.x - puntos[i].x, p.y - puntos[i].y)
      if (dd < dist) {
        dist = dd
        mejor = i
      }
    }
    if (dist < TOLERANCIA && mejor > prog) {
      setProg(mejor)
      if (mejor >= MUESTRAS - 2) terminar()
      return
    }
    if (Math.hypot(p.x - actual.x, p.y - actual.y) > SALIDA) {
      salidas.current++
      setArrastrando(false)
      setSacudir((n) => n + 1)
      void audio.secuencia([() => audio.tono('intento')])
    }
  }

  const terminar = async () => {
    setArrastrando(false)
    setCompleto(true)
    setProg(MUESTRAS - 1)
    await audio.secuencia([() => audio.tono('exito'), () => audio.frase('bien')])
    if (montado.current) setTimeout(() => montado.current && onFin(salidas.current <= 2), 300)
  }

  const fin = puntos[MUESTRAS - 1] ?? { x: 370, y: 100 }
  const fraccion = prog / (MUESTRAS - 1)

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-3 pb-4">
      <Celebracion visible={completo} />
      <svg
        viewBox="0 0 400 200"
        className="h-auto w-full max-w-3xl touch-none select-none"
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={() => setArrastrando(false)}
        onPointerCancel={() => setArrastrando(false)}
        aria-label={`Camino de ${trazo.forma}`}
      >
        {/* Camino ancho, guía punteada y parte ya recorrida */}
        <path ref={ruta} d={d} fill="none" stroke="#e8dcc8" strokeWidth={42} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#ffffff" strokeWidth={5} strokeDasharray="2 14" strokeLinecap="round" />
        {largo > 0 && (
          <path
            d={d}
            fill="none"
            stroke="#2563eb"
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={largo}
            strokeDashoffset={largo * (1 - fraccion)}
            opacity={0.85}
          />
        )}
        <text x={fin.x} y={fin.y} fontSize={44} textAnchor="middle" dominantBaseline="central">
          {trazo.fin}
        </text>
        {/* Personaje: late hasta que se empieza a mover; tiembla si el dedo se sale */}
        <motion.g
          key={sacudir}
          animate={
            sacudir
              ? { x: [0, -6, 6, -4, 4, 0] }
              : prog === 0
                ? { scale: [1, 1.18, 1], transition: { repeat: Infinity, duration: 1 } }
                : {}
          }
          style={{ originX: `${actual.x}px`, originY: `${actual.y}px` }}
        >
          <circle cx={actual.x} cy={actual.y} r={30} fill="#ffffff" stroke={arrastrando ? '#2563eb' : '#e2d6c3'} strokeWidth={4} />
          <text x={actual.x} y={actual.y + 2} fontSize={38} textAnchor="middle" dominantBaseline="central">
            {trazo.inicio}
          </text>
        </motion.g>
      </svg>
    </div>
  )
}
