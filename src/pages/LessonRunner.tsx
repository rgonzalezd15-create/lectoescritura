import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Celebracion } from '../components/feedback/Celebracion'
import { BarraSuperior } from '../components/ui/BarraSuperior'
import { BigButton } from '../components/ui/BigButton'
import { Estrellas } from '../components/ui/Estrellas'
import { audio } from '../lib/audio/AudioEngine'
import { urlFonema, urlPalabra, urlSilaba } from '../lib/audio/rutas'
import { getLeccion } from '../lib/contentLoader'
import { dividirCV } from '../lib/silabas'
import { RenderMecanica } from '../mechanics'
import { estrellasPara, useProgress } from '../store/progressStore'
import type { Leccion, ResultadoPaso } from '../types/content'

/** Lista de audios de una lección, para precargarlos al entrar. */
function audiosDeLeccion(l: Leccion): string[] {
  const urls: string[] = []
  for (const p of l.pasos) {
    if (p.mecanica === 'presentacion_fonema') urls.push(urlFonema(p.fonema))
    else {
      urls.push(...[...p.consonantes, ...p.vocales].map(urlFonema))
      for (const o of p.objetivos) {
        if ((p.silabas ?? 1) === 1) urls.push(urlSilaba(o.texto))
        else urls.push(urlPalabra(o.texto), ...dividirCV(o.texto).map(urlSilaba))
      }
    }
  }
  return urls
}

export function LessonRunner() {
  const { id = '' } = useParams()
  const leccion = getLeccion(id)
  const [intento, setIntento] = useState(0)
  if (!leccion) return <Navigate to="/" replace />
  // Cambiar la key reinicia la lección completa al repetirla.
  return <Runner key={`${id}-${intento}`} leccion={leccion} onRepetir={() => setIntento((n) => n + 1)} />
}

function Runner({ leccion, onRepetir }: { leccion: Leccion; onRepetir: () => void }) {
  const navigate = useNavigate()
  const completar = useProgress((s) => s.completarLeccion)
  const [indice, setIndice] = useState(0)
  const [estrellas, setEstrellas] = useState<number | null>(null)
  const acumulado = useRef<ResultadoPaso>({ aciertos: 0, total: 0 })
  const volverA = `/modulo/${leccion.modulo}`

  useEffect(() => {
    audio.precargar(audiosDeLeccion(leccion))
    return () => audio.detener()
  }, [leccion])

  const alTerminarPaso = (r: ResultadoPaso) => {
    acumulado.current.aciertos += r.aciertos
    acumulado.current.total += r.total
    if (indice + 1 < leccion.pasos.length) {
      setIndice(indice + 1)
      return
    }
    const n = estrellasPara(acumulado.current.aciertos, acumulado.current.total)
    completar(leccion.id, n)
    setEstrellas(n)
    void audio.secuencia([() => audio.tono('exito'), () => audio.frase('fin')])
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <BarraSuperior volverA={volverA}>
        <div className="flex gap-2" aria-label={`Paso ${indice + 1} de ${leccion.pasos.length}`}>
          {leccion.pasos.map((_, i) => (
            <span
              key={i}
              className={`h-4 w-8 rounded-full ${estrellas !== null || i < indice ? 'bg-exito' : i === indice ? 'bg-primario' : 'bg-suave'}`}
            />
          ))}
        </div>
      </BarraSuperior>

      {estrellas === null ? (
        <RenderMecanica key={indice} paso={leccion.pasos[indice]} onTerminar={alTerminarPaso} />
      ) : (
        <motion.section
          className="flex flex-1 flex-col items-center justify-center gap-8 p-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Celebracion visible />
          <Estrellas n={estrellas} className="text-7xl sm:text-8xl" />
          <div className="flex gap-6">
            <BigButton variante="suave" aria-label="Repetir lección" onClick={onRepetir}>
              🔁
            </BigButton>
            <BigButton variante="exito" aria-label="Continuar" onClick={() => navigate(volverA)}>
              ➜
            </BigButton>
          </div>
        </motion.section>
      )}
    </main>
  )
}
