import { motion, type PanInfo } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Celebracion, IntentaOtraVez } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { Letras } from '../../components/ui/Letra'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import { barajar, bloquesDe } from '../../lib/silabas'
import { useProgress } from '../../store/progressStore'
import type { ObjetivoBloques, PasoBloques, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoBloques
  onTerminar: (r: ResultadoPaso) => void
}

/**
 * Bloques de Construcción: el niño ve la imagen, escucha la palabra y la arma
 * encajando bloques de sílabas (arrastrando o tocando). Al completarla, la
 * app la desglosa sílaba a sílaba y la vuelve a leer entera (global → analítico → síntesis).
 */
export function BloquesConstruccion({ paso, onTerminar }: Props) {
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

interface Bloque {
  id: number
  texto: string
}

type Estado = 'jugando' | 'casi' | 'bien' | 'ayuda'

function Ronda({ objetivo, onFin }: { objetivo: ObjetivoBloques; onFin: (ok: boolean) => void }) {
  const registrar = useProgress((s) => s.registrar)
  const correctas = bloquesDe(objetivo)

  const [bloques] = useState<Bloque[]>(() =>
    barajar([...correctas, ...objetivo.distractores].map((texto, id) => ({ id, texto }))),
  )
  /** Id del bloque colocado en cada hueco (null = vacío). */
  const [huecos, setHuecos] = useState<(number | null)[]>(() => correctas.map(() => null))
  /** Huecos ya acertados en un intento anterior: quedan fijos. */
  const [fijos, setFijos] = useState<boolean[]>(() => correctas.map(() => false))
  const [estado, setEstado] = useState<Estado>('jugando')
  /** Índice del hueco que está sonando durante la lectura final (-1 = toda la palabra). */
  const [sonando, setSonando] = useState<number | null>(null)
  const [celebrar, setCelebrar] = useState(false)
  const fallos = useRef(0)
  const montado = useRef(true)

  const texto = (id: number) => bloques.find((b) => b.id === id)!.texto
  const decirPalabra = () => audio.palabra(objetivo.texto)

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

  /** Lee la palabra sílaba a sílaba, iluminando cada bloque, y luego entera. */
  const leerConstruida = (ids: number[], previo: () => Promise<void>) =>
    audio.secuencia(
      [
        previo,
        ...ids.map((id, i) => async () => {
          setSonando(i)
          await audio.silaba(texto(id))
        }),
        async () => {
          setSonando(-1)
          await decirPalabra()
        },
      ],
      250,
    )

  const comprobar = async (actual: number[]) => {
    const oks = actual.map((id, i) => texto(id) === correctas[i])
    oks.forEach((ok, i) => {
      if (!fijos[i]) registrar('silabas', correctas[i], ok)
    })

    if (oks.every(Boolean)) {
      setEstado('bien')
      // Primero se lee la palabra construida (bloques visibles); luego la fiesta.
      await leerConstruida(actual, () => audio.tono('exito'))
      if (!montado.current) return
      setCelebrar(true)
      await audio.secuencia([() => audio.frase('bien')])
      if (montado.current) onFin(fallos.current === 0)
      return
    }

    fallos.current++
    if (fallos.current < 2) {
      setEstado('casi')
      setFijos(oks)
      await audio.secuencia([() => audio.tono('intento'), () => audio.frase('otra'), decirPalabra])
      if (!montado.current) return
      // Los bloques incorrectos vuelven al montón; los correctos se quedan.
      setHuecos(actual.map((id, i) => (oks[i] ? id : null)))
      setEstado('jugando')
      return
    }

    // Segundo intento fallido: la app arma la palabra y la lee.
    setEstado('ayuda')
    const usados = new Set<number>()
    const solucion = correctas.map((s) => {
      const b = bloques.find((x) => x.texto === s && !usados.has(x.id))!
      usados.add(b.id)
      return b.id
    })
    setHuecos(solucion)
    await leerConstruida(solucion, () => audio.frase('ayuda'))
    if (montado.current) onFin(false)
  }

  const colocar = (id: number, destino?: number) => {
    if (estado !== 'jugando') return
    const i = destino ?? huecos.findIndex((h, j) => h === null && !fijos[j])
    if (i < 0 || fijos[i]) {
      void audio.secuencia([() => audio.silaba(texto(id))])
      return
    }
    // Si el bloque ya estaba en otro hueco, se mueve; si el destino estaba ocupado, ese vuelve al montón.
    const nuevo = huecos.map((h) => (h === id ? null : h))
    nuevo[i] = id
    setHuecos(nuevo)
    if (nuevo.every((h) => h !== null)) {
      void audio.secuencia([() => audio.silaba(texto(id))]).then(() => {
        if (montado.current) void comprobar(nuevo as number[])
      })
    } else {
      void audio.secuencia([() => audio.silaba(texto(id))])
    }
  }

  const quitar = (i: number) => {
    if (estado !== 'jugando' || fijos[i]) return
    setHuecos(huecos.map((h, j) => (j === i ? null : h)))
  }

  /** Al soltar un bloque: si cae sobre un hueco se encaja ahí; si no, vuelve. */
  const alSoltar = (id: number, desdeHueco: number | null, info: PanInfo) => {
    const x = info.point.x - window.scrollX
    const y = info.point.y - window.scrollY
    const destino = document
      .elementsFromPoint(x, y)
      .map((el) => (el as HTMLElement).dataset?.hueco)
      .find((v) => v !== undefined)
    if (destino !== undefined) colocar(id, Number(destino))
    else if (desdeHueco !== null) quitar(desdeHueco)
  }

  const enHuecos = new Set(huecos.filter((h): h is number => h !== null))
  const bloqueado = estado !== 'jugando'

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-3 pb-4 sm:gap-10">
      <Celebracion visible={celebrar} />
      <IntentaOtraVez visible={estado === 'casi'} />

      <div className="flex items-center gap-4">
        {objetivo.icono && (
          <span className="text-7xl sm:text-8xl" role="img" aria-label={objetivo.texto}>
            {objetivo.icono}
          </span>
        )}
        <BigButton variante="suave" aria-label="Escuchar la palabra" onClick={() => void audio.secuencia([decirPalabra])}>
          👂
        </BigButton>
      </div>

      {/* Base donde se encajan los bloques, de izquierda a derecha */}
      <div className="flex items-end gap-1 rounded-3xl bg-white/60 p-2" aria-label="Palabra en construcción">
        {huecos.map((id, i) => (
          <div
            key={i}
            data-hueco={i}
            aria-label={`Hueco ${i + 1}`}
            className={`flex h-24 min-w-24 items-center justify-center rounded-2xl sm:h-28 sm:min-w-28 ${
              id === null ? 'border-4 border-dashed border-tenue/40' : ''
            }`}
          >
            {id !== null && (
              <PiezaBloque
                bloque={{ id, texto: texto(id) }}
                fijo={fijos[i] || bloqueado}
                resaltado={sonando === i || sonando === -1}
                exito={estado === 'bien' || fijos[i]}
                onTap={() => quitar(i)}
                onSoltar={(info) => alSoltar(id, i, info)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Montón de bloques disponibles */}
      <div className="flex min-h-28 flex-wrap items-center justify-center gap-4" aria-label="Bloques">
        {bloques
          .filter((b) => !enHuecos.has(b.id))
          .map((b) => (
            <PiezaBloque
              key={b.id}
              bloque={b}
              fijo={bloqueado}
              onTap={() => colocar(b.id)}
              onSoltar={(info) => alSoltar(b.id, null, info)}
            />
          ))}
      </div>
    </div>
  )
}

interface PiezaProps {
  bloque: Bloque
  fijo: boolean
  resaltado?: boolean
  exito?: boolean
  onTap: () => void
  onSoltar: (info: PanInfo) => void
}

/** Bloque encajable con dos "tetones" arriba, como una pieza de construcción. */
function PiezaBloque({ bloque, fijo, resaltado, exito, onTap, onSoltar }: PiezaProps) {
  const color = exito ? '#15803d' : '#e2d6c3'
  return (
    <motion.button
      type="button"
      layoutId={`bloque-${bloque.id}`}
      aria-label={`Sílaba ${bloque.texto}`}
      drag={!fijo}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.12, zIndex: 50, rotate: -3 }}
      whileTap={fijo ? undefined : { scale: 0.95 }}
      animate={{ scale: resaltado ? 1.15 : 1, y: resaltado ? -8 : 0 }}
      onTap={onTap}
      onDragEnd={(_, info) => onSoltar(info)}
      className={`relative flex h-24 min-w-24 touch-none items-center justify-center rounded-2xl bg-white px-3 text-5xl font-bold sm:h-28 sm:min-w-28 sm:text-6xl ${
        fijo ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ boxShadow: `0 6px 0 ${color}`, outline: resaltado ? '4px solid #2563eb' : undefined }}
    >
      <span aria-hidden className="absolute -top-3 left-[22%] h-3 w-5 rounded-t-md bg-white" />
      <span aria-hidden className="absolute -top-3 right-[22%] h-3 w-5 rounded-t-md bg-white" />
      <Letras texto={bloque.texto} />
    </motion.button>
  )
}
