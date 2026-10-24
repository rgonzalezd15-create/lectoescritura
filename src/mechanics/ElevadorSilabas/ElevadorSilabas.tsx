import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Celebracion, IntentaOtraVez } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import { fonemaPorId } from '../../lib/contentLoader'
import { dividirCV, partirSilaba, unir } from '../../lib/silabas'
import { useProgress } from '../../store/progressStore'
import type { Objetivo, PasoElevador, ResultadoPaso } from '../../types/content'
import { ALTO_ITEM, TiraDeslizable } from './TiraDeslizable'

interface Pos {
  c: number
  v: number
}

interface Props {
  paso: PasoElevador
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Elevador de Sílabas: pares de tiras (consonante | vocal) que se deslizan
 * para formar la sílaba o palabra dictada. Al alinear, suena la unión
 * /m/ + /a/ → "ma" (método sintético).
 */
export function ElevadorSilabas({ paso, onTerminar }: Props) {
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
      <Ronda key={k} paso={paso} objetivo={paso.objetivos[k]} onFin={alTerminarRonda} />
    </div>
  )
}

const azar = (n: number) => Math.floor(Math.random() * n)

/** Posición inicial aleatoria que nunca coincide con la respuesta. */
function posicionesIniciales(paso: PasoElevador, correctas: Pos[]): Pos[] {
  return correctas.map((ok) => {
    let p: Pos
    do {
      p = { c: azar(paso.consonantes.length), v: azar(paso.vocales.length) }
    } while (p.c === ok.c && p.v === ok.v && paso.consonantes.length * paso.vocales.length > 1)
    return p
  })
}

type Estado = 'jugando' | 'bien' | 'casi' | 'ayuda'

function Ronda({ paso, objetivo, onFin }: { paso: PasoElevador; objetivo: Objetivo; onFin: (ok: boolean) => void }) {
  const registrar = useProgress((s) => s.registrar)
  const n = paso.silabas ?? 1
  const silabasObjetivo = n === 1 ? [objetivo.texto] : dividirCV(objetivo.texto)
  const correctas: Pos[] = silabasObjetivo.map((s) => {
    const { consonante, vocal } = partirSilaba(s)
    return { c: paso.consonantes.indexOf(consonante), v: paso.vocales.indexOf(vocal) }
  })

  const [pos, setPos] = useState<Pos[]>(() => posicionesIniciales(paso, correctas))
  const [estado, setEstado] = useState<Estado>('jugando')
  const fallos = useRef(0)
  const montado = useRef(true)

  const silabaEn = (p: Pos) => unir(paso.consonantes[p.c], paso.vocales[p.v])
  const decirObjetivo = () => (n === 1 ? audio.silaba(objetivo.texto) : audio.palabra(objetivo.texto))
  const mezcla = (p: Pos) => [
    () => audio.fonema(fonemaPorId.get(paso.consonantes[p.c])!),
    () => audio.fonema(fonemaPorId.get(paso.vocales[p.v])!),
    () => audio.silaba(silabaEn(p)),
  ]

  // Dictado: al empezar la ronda se escucha lo que hay que formar.
  useEffect(() => {
    montado.current = true
    const t = setTimeout(() => void audio.secuencia([decirObjetivo]), 450)
    return () => {
      montado.current = false
      clearTimeout(t)
      audio.detener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mover = (u: number, cambio: Partial<Pos>) => {
    if (estado !== 'jugando') return
    const nuevo = { ...pos[u], ...cambio }
    setPos(pos.map((p, i) => (i === u ? nuevo : p)))
    void audio.secuencia(mezcla(nuevo), 60)
  }

  const comprobar = async () => {
    if (estado !== 'jugando') return
    const formadas = pos.map(silabaEn)
    formadas.forEach((s, i) => {
      const obj = silabasObjetivo[i]
      const a = partirSilaba(s)
      const b = partirSilaba(obj)
      registrar('silabas', obj, s === obj)
      registrar('fonemas', b.consonante, a.consonante === b.consonante)
      registrar('fonemas', b.vocal, a.vocal === b.vocal)
    })
    const ok = formadas.join('') === objetivo.texto

    if (ok) {
      setEstado('bien')
      await audio.secuencia([() => audio.tono('exito'), decirObjetivo, () => audio.frase('bien')])
      if (montado.current) onFin(fallos.current === 0)
      return
    }

    fallos.current++
    if (fallos.current < 2) {
      setEstado('casi')
      const formado = formadas.join('')
      await audio.secuencia([
        () => audio.tono('intento'),
        () => (n === 1 ? audio.silaba(formado) : audio.palabra(formado)),
        () => audio.frase('otra'),
        decirObjetivo,
      ])
      if (montado.current) setEstado('jugando')
      return
    }

    // Segundo intento fallido: la app muestra cómo se forma y avanza.
    setEstado('ayuda')
    setPos(correctas)
    await audio.secuencia([() => audio.frase('ayuda'), ...correctas.flatMap(mezcla), decirObjetivo], 150)
    if (montado.current) onFin(false)
  }

  const bloqueado = estado !== 'jugando'
  const escucharFormado = () => {
    const formado = pos.map(silabaEn).join('')
    void audio.secuencia([...pos.flatMap(mezcla), ...(n > 1 ? [() => audio.palabra(formado)] : [])], 60)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 px-2 pb-3 sm:gap-5">
      <Celebracion visible={estado === 'bien'} />
      <IntentaOtraVez visible={estado === 'casi'} />

      <div className="flex items-center gap-4">
        {objetivo.icono && (
          <span className="text-7xl sm:text-8xl" role="img" aria-label={objetivo.texto}>
            {objetivo.icono}
          </span>
        )}
        <BigButton variante="suave" aria-label="Escuchar qué formar" onClick={() => void audio.secuencia([decirObjetivo])}>
          👂
        </BigButton>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-6">
        {pos.map((p, u) => (
          <Unidad
            key={u}
            paso={paso}
            pos={p}
            bloqueado={bloqueado}
            resaltar={estado === 'ayuda' || estado === 'bien'}
            onCambio={(c) => mover(u, c)}
          />
        ))}
      </div>

      <div className="flex gap-4">
        <BigButton variante="suave" aria-label="Escuchar lo que formé" disabled={bloqueado} onClick={escucharFormado}>
          🔊
        </BigButton>
        <BigButton variante="exito" aria-label="Comprobar" disabled={bloqueado} onClick={() => void comprobar()} className="px-10">
          ✓
        </BigButton>
      </div>
    </div>
  )
}

interface UnidadProps {
  paso: PasoElevador
  pos: Pos
  bloqueado: boolean
  resaltar: boolean
  onCambio: (c: Partial<Pos>) => void
}

function Flecha({ dir, oculta, disabled, onClick, etiqueta }: { dir: '▲' | '▼'; oculta?: boolean; disabled: boolean; onClick: () => void; etiqueta: string }) {
  return (
    <BigButton
      variante="suave"
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-14 min-w-16 text-2xl ${oculta ? 'invisible' : ''}`}
    >
      {dir}
    </BigButton>
  )
}

function Unidad({ paso, pos, bloqueado, resaltar, onCambio }: UnidadProps) {
  const nc = paso.consonantes.length
  const nv = paso.vocales.length
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2rem] bg-white/70 p-1 sm:p-3">
      <div className="flex gap-2">
        <Flecha dir="▲" etiqueta="Consonante anterior" oculta={nc === 1} disabled={bloqueado || pos.c === 0} onClick={() => onCambio({ c: pos.c - 1 })} />
        <Flecha dir="▲" etiqueta="Vocal anterior" disabled={bloqueado || pos.v === 0} onClick={() => onCambio({ v: pos.v - 1 })} />
      </div>

      <div className={`relative flex rounded-3xl bg-white ${bloqueado ? 'pointer-events-none' : ''}`}>
        <TiraDeslizable items={paso.consonantes} indice={pos.c} onCambio={(c) => onCambio({ c })} tipo="consonante" etiqueta="Consonantes" />
        <TiraDeslizable items={paso.vocales} indice={pos.v} onCambio={(v) => onCambio({ v })} tipo="vocal" etiqueta="Vocales" />
        {/* Ventana recortada que enmarca la sílaba formada */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 rounded-3xl border-[6px]"
          style={{ top: ALTO_ITEM, height: ALTO_ITEM }}
          animate={{ borderColor: resaltar ? '#15803d' : '#2563eb', scale: resaltar ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex gap-2">
        <Flecha dir="▼" etiqueta="Consonante siguiente" oculta={nc === 1} disabled={bloqueado || pos.c === nc - 1} onClick={() => onCambio({ c: pos.c + 1 })} />
        <Flecha dir="▼" etiqueta="Vocal siguiente" disabled={bloqueado || pos.v === nv - 1} onClick={() => onCambio({ v: pos.v + 1 })} />
      </div>
    </div>
  )
}
