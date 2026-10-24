import { motion } from 'framer-motion'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BarraSuperior } from '../components/ui/BarraSuperior'
import { Estrellas } from '../components/ui/Estrellas'
import { Letras } from '../components/ui/Letra'
import { getLeccion, getModulo } from '../lib/contentLoader'
import { leccionDesbloqueada } from '../lib/desbloqueo'
import { useProgress } from '../store/progressStore'
import { useSettings } from '../store/settingsStore'

export function ModulePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const modulo = getModulo(Number(id))
  const progreso = useProgress((s) => s.lecciones)
  const desbloquearTodo = useSettings((s) => s.desbloquearTodo)

  if (!modulo || !modulo.disponible) return <Navigate to="/" replace />

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <BarraSuperior>
        <span className="text-5xl" aria-hidden>
          {modulo.icono}
        </span>
        <h1 className="sr-only">{modulo.nombre}</h1>
      </BarraSuperior>

      <ul className="grid flex-1 grid-cols-2 content-start gap-5 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {modulo.lecciones.map((lid, i) => {
          const leccion = getLeccion(lid)!
          const abierta = leccionDesbloqueada(modulo, i, progreso, desbloquearTodo)
          const estado = progreso[lid]
          const esLetra = /^\p{L}/u.test(leccion.icono)
          return (
            <motion.li key={lid} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <motion.button
                type="button"
                disabled={!abierta}
                onClick={() => navigate(`/leccion/${lid}`)}
                whileTap={abierta ? { scale: 0.92 } : undefined}
                aria-label={`Lección ${leccion.titulo}${abierta ? '' : ' (bloqueada)'}`}
                className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] bg-white shadow-[0_8px_0_#e2d6c3] disabled:cursor-default disabled:opacity-40"
              >
                {esLetra ? (
                  <Letras texto={leccion.icono} className="text-8xl leading-none font-bold" />
                ) : (
                  <span className="text-7xl">{leccion.icono}</span>
                )}
                {leccion.titulo.length > 1 && (
                  <Letras texto={leccion.titulo} className="mt-1 text-2xl font-bold tracking-widest" />
                )}
                {!abierta && <span className="absolute top-3 right-4 text-2xl">🔒</span>}
                {estado?.completada && <Estrellas n={estado.estrellas} className="absolute bottom-2 text-xl" />}
              </motion.button>
            </motion.li>
          )
        })}
      </ul>
    </main>
  )
}
