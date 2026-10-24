import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Celebracion } from '../../components/feedback/Celebracion'
import { BigButton } from '../../components/ui/BigButton'
import { Ficha } from '../../components/ui/Ficha'
import { FORMAS, type Forma } from '../../lib/formas'
import { Letras } from '../../components/ui/Letra'
import { PuntosRetos } from '../../components/ui/PuntosRetos'
import { audio } from '../../lib/audio/AudioEngine'
import { barajar, silabasDe } from '../../lib/silabas'
import { useProgress } from '../../store/progressStore'
import type { ObjetivoDecodificador, PasoDecodificador, ResultadoPaso } from '../../types/content'

interface Props {
  paso: PasoDecodificador
  onTerminar: (r: ResultadoPaso) => void
}

interface ItemClave {
  silaba: string
  color: string
  forma: Forma
}

/**
 * Decodificador de color: con una clave fija (color+forma = sílaba) el niño
 * descifra un mensaje de fichas, escucha las sílabas SEPARADAS y elige la
 * imagen de la palabra. Él mismo hace la unión (lectura indirecta).
 */
export function DecodificadorColor({ paso, onTerminar }: Props) {
  const [k, setK] = useState(0)
  const aciertos = useRef(0)
  const [clave] = useState<ItemClave[]>(() =>
    Object.entries(paso.clave).map(([silaba, color], i) => ({ silaba, color, forma: FORMAS[i % FORMAS.length] })),
  )

  const alTerminarRonda = (acierto: boolean) => {
    if (acierto) aciertos.current++
    if (k + 1 < paso.objetivos.length) setK(k + 1)
    else onTerminar({ aciertos: aciertos.current, total: paso.objetivos.length })
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PuntosRetos actual={k} total={paso.objetivos.length} />
      <Ronda key={k} clave={clave} objetivo={paso.objetivos[k]} onFin={alTerminarRonda} />
    </div>
  )
}

type Fase = 'decodificar' | 'elegir' | 'bien' | 'ayuda'

function Ronda({ clave, objetivo, onFin }: { clave: ItemClave[]; objetivo: ObjetivoDecodificador; onFin: (ok: boolean) => void }) {
  const registrar = useProgress((s) => s.registrar)
  const silabas = silabasDe(objetivo)
  const fichas = silabas.map((s) => clave.find((c) => c.silaba === s)!)

  const [revelados, setRevelados] = useState(0)
  const [fase, setFase] = useState<Fase>('decodificar')
  const [sacudir, setSacudir] = useState<string | null>(null)
  const [pista, setPista] = useState(false)
  const [descartadas, setDescartadas] = useState<string[]>([])
  const [celebrar, setCelebrar] = useState(false)
  const [opciones] = useState(() => barajar([{ texto: objetivo.texto, icono: objetivo.icono }, ...objetivo.distractores]))
  const erroresPos = useRef(0)
  const errores = useRef(0)
  const montado = useRef(true)

  // Sílabas separadas por una pausa larga: la unión la hace el niño.
  const leerSilabas = () => audio.secuencia(silabas.map((s) => () => audio.silaba(s)), 650)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      audio.detener()
    }
  }, [])

  const elegirClave = (item: ItemClave) => {
    if (fase !== 'decodificar') {
      void audio.secuencia([() => audio.silaba(item.silaba)])
      return
    }
    const objetivoPos = silabas[revelados]
    if (item.silaba === objetivoPos) {
      registrar('silabas', objetivoPos, erroresPos.current === 0)
      erroresPos.current = 0
      setPista(false)
      const siguiente = revelados + 1
      setRevelados(siguiente)
      if (siguiente < silabas.length) {
        void audio.secuencia([() => audio.silaba(item.silaba)])
      } else {
        setFase('elegir')
        void audio.secuencia([() => audio.silaba(item.silaba), () => new Promise((r) => setTimeout(r, 500)), leerSilabas])
      }
      return
    }
    errores.current++
    erroresPos.current++
    if (erroresPos.current >= 2) setPista(true)
    setSacudir(item.silaba)
    setTimeout(() => montado.current && setSacudir(null), 500)
    void audio.secuencia([() => audio.tono('intento')])
  }

  const elegirOpcion = async (texto: string) => {
    if (fase !== 'elegir' || descartadas.includes(texto)) return
    if (texto === objetivo.texto) {
      setFase('bien')
      await audio.secuencia([() => audio.tono('exito'), () => audio.palabra(objetivo.texto)])
      if (!montado.current) return
      setCelebrar(true)
      await audio.secuencia([() => audio.frase('bien')])
      if (montado.current) onFin(errores.current === 0)
      return
    }
    errores.current++
    const nuevas = [...descartadas, texto]
    setDescartadas(nuevas)
    if (nuevas.length < 2) {
      void audio.secuencia([() => audio.tono('intento'), () => audio.frase('otra'), leerSilabas])
      return
    }
    setFase('ayuda')
    await audio.secuencia([() => audio.frase('ayuda'), leerSilabas, () => audio.palabra(objetivo.texto)])
    if (montado.current) onFin(false)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-3 pb-4 sm:gap-8">
      <Celebracion visible={celebrar} />

      {/* Clave: color + forma = sílaba */}
      <div className="flex flex-wrap justify-center gap-2 rounded-3xl bg-white/60 p-2 sm:gap-3 sm:p-3" aria-label="Clave de colores">
        {clave.map((item) => {
          const esPista = pista && item.silaba === silabas[revelados]
          return (
            <motion.button
              key={item.silaba}
              type="button"
              aria-label={`Color de la sílaba ${item.silaba}`}
              onClick={() => elegirClave(item)}
              whileTap={{ scale: 0.92 }}
              animate={
                sacudir === item.silaba
                  ? { x: [0, -10, 10, -6, 6, 0] }
                  : esPista
                    ? { scale: [1, 1.12, 1], transition: { repeat: Infinity, duration: 0.9 } }
                    : { x: 0, scale: 1 }
              }
              className="flex min-h-16 cursor-pointer items-center gap-2 rounded-2xl bg-white px-3 py-1 shadow-[0_5px_0_#e2d6c3] sm:min-h-18"
              style={{ outline: esPista ? `4px solid ${item.color}` : undefined }}
            >
              <Ficha color={item.color} forma={item.forma} className="h-9 w-9 sm:h-11 sm:w-11" />
              <Letras texto={item.silaba} className="text-3xl font-bold sm:text-4xl" />
            </motion.button>
          )
        })}
      </div>

      {/* Mensaje secreto */}
      <div className="flex gap-2" aria-label="Mensaje secreto">
        {fichas.map((f, i) => {
          const revelada = i < revelados
          const siguiente = i === revelados && fase === 'decodificar'
          return (
            <motion.button
              key={i}
              type="button"
              aria-label={revelada ? `Sílaba ${f.silaba}` : `Ficha ${i + 1} sin descifrar`}
              onClick={() => revelada && void audio.secuencia([() => audio.silaba(f.silaba)])}
              animate={siguiente ? { y: [0, -8, 0], transition: { repeat: Infinity, duration: 1 } } : { y: 0 }}
              className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-[0_6px_0_#e2d6c3] sm:h-28 sm:w-28"
              style={{ outline: siguiente ? '4px dashed #2563eb' : `4px solid ${revelada ? f.color : 'transparent'}` }}
            >
              {revelada && <Ficha color={f.color} forma={f.forma} className="absolute top-2 left-2 h-6 w-6" />}
              <AnimatePresence mode="wait" initial={false}>
                {revelada ? (
                  <motion.span key="s" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}>
                    <Letras texto={f.silaba} className="text-5xl font-bold" />
                  </motion.span>
                ) : (
                  <motion.span key="f" exit={{ rotateY: 90 }}>
                    <Ficha color={f.color} forma={f.forma} className="h-16 w-16" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* Elegir la imagen: aparece cuando el mensaje está descifrado */}
      <AnimatePresence>
        {fase !== 'decodificar' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
            <BigButton variante="suave" aria-label="Escuchar las sílabas" onClick={() => void leerSilabas()}>
              🔊
            </BigButton>
            <div className="flex flex-wrap justify-center gap-4" aria-label="¿Qué palabra es?">
              {opciones.map((op) => {
                const correcta = op.texto === objetivo.texto
                const marcada = (fase === 'bien' || fase === 'ayuda') && correcta
                const descartada = descartadas.includes(op.texto)
                return (
                  <motion.button
                    key={op.texto}
                    type="button"
                    aria-label={`Imagen ${op.texto}`}
                    disabled={descartada || fase === 'bien' || fase === 'ayuda'}
                    onClick={() => void elegirOpcion(op.texto)}
                    whileTap={{ scale: 0.92 }}
                    animate={{ opacity: descartada ? 0.3 : 1, scale: marcada ? 1.12 : 1 }}
                    className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-3xl bg-white text-6xl shadow-[0_6px_0_#e2d6c3] disabled:cursor-default sm:h-28 sm:w-28 sm:text-7xl"
                    style={{ outline: marcada ? '5px solid #15803d' : undefined }}
                  >
                    {op.icono}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
