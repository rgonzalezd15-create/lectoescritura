import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { modulos } from '../lib/contentLoader'
import { useProgress } from '../store/progressStore'
import { useSettings } from '../store/settingsStore'

export function Home() {
  const navigate = useNavigate()
  const nombre = useSettings((s) => s.nombre)
  const progreso = useProgress((s) => s.lecciones)

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col p-4">
      <header className="flex items-center justify-between py-2">
        <h1 className="text-3xl font-bold sm:text-4xl">
          👋 {nombre ? `¡Hola, ${nombre}!` : '¡Hola!'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/adultos')}
          className="cursor-pointer rounded-2xl px-3 py-2 text-sm text-tenue underline-offset-4 hover:underline"
        >
          👪 Adultos
        </button>
      </header>

      <ul className="grid flex-1 grid-cols-1 content-center gap-5 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m, i) => {
          const hechas = m.lecciones.filter((id) => progreso[id]?.completada).length
          return (
            <motion.li key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <motion.button
                type="button"
                disabled={!m.disponible}
                onClick={() => navigate(`/modulo/${m.id}`)}
                whileTap={m.disponible ? { scale: 0.94 } : undefined}
                whileHover={m.disponible ? { y: -4 } : undefined}
                aria-label={m.disponible ? m.nombre : `${m.nombre} (próximamente)`}
                className="relative flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[2rem] bg-white p-4 shadow-[0_8px_0_#e2d6c3] disabled:cursor-default disabled:opacity-45"
                style={{ borderBottom: `8px solid ${m.color}` }}
              >
                <span className="text-7xl" aria-hidden>
                  {m.icono}
                </span>
                <span className="text-lg font-bold text-tenue">{m.nombre}</span>
                {!m.disponible && <span className="absolute top-3 right-4 text-3xl">🔒</span>}
                {m.disponible && m.lecciones.length > 0 && (
                  <span className="absolute top-3 right-4 rounded-full bg-suave px-3 py-1 text-sm font-bold">
                    {hechas}/{m.lecciones.length}
                  </span>
                )}
              </motion.button>
            </motion.li>
          )
        })}
      </ul>
    </main>
  )
}
