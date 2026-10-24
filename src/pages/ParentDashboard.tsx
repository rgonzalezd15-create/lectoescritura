import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Estrellas } from '../components/ui/Estrellas'
import { audio } from '../lib/audio/AudioEngine'
import { audiosRequeridos } from '../lib/audiosRequeridos'
import { fonemas, getLeccion, modulos } from '../lib/contentLoader'
import { estadoDominio, precision, useProgress, type EstadoDominio } from '../store/progressStore'
import { useSettings } from '../store/settingsStore'

/** Puerta para adultos: una suma simple que un niño pre-lector no resuelve. */
function PuertaAdultos({ onAbrir }: { onAbrir: () => void }) {
  const navigate = useNavigate()
  const [{ a, b, opciones }] = useState(() => {
    const a = 4 + Math.floor(Math.random() * 6)
    const b = 3 + Math.floor(Math.random() * 6)
    const opciones = [a + b, a + b + 2, a + b - 3].sort(() => Math.random() - 0.5)
    return { a, b, opciones }
  })
  const [error, setError] = useState(false)
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold">Zona para adultos</h1>
      <p className="text-lg">
        Para entrar, responde: ¿cuánto es {a} + {b}?
      </p>
      <div className="flex gap-4">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => (o === a + b ? onAbrir() : setError(true))}
            className="min-h-16 min-w-20 cursor-pointer rounded-2xl bg-white text-2xl font-bold shadow-[0_5px_0_#e2d6c3]"
          >
            {o}
          </button>
        ))}
      </div>
      {error && <p className="text-aviso">Respuesta incorrecta, prueba de nuevo.</p>}
      <button type="button" onClick={() => navigate('/')} className="cursor-pointer text-tenue underline">
        Volver al inicio
      </button>
    </main>
  )
}

const ETIQUETA: Record<EstadoDominio, { texto: string; clase: string }> = {
  sin_empezar: { texto: 'Sin empezar', clase: 'bg-suave text-tenue' },
  practicando: { texto: 'Practicando', clase: 'bg-blue-100 text-blue-800' },
  dominado: { texto: 'Dominado', clase: 'bg-green-100 text-green-800' },
  reforzar: { texto: 'Reforzar', clase: 'bg-amber-100 text-amber-900' },
}

const pct = (x: number) => `${Math.round(x * 100)} %`

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  )
}

export function ParentDashboard() {
  const [abierto, setAbierto] = useState(false)
  return abierto ? <Panel /> : <PuertaAdultos onAbrir={() => setAbierto(true)} />
}

function Panel() {
  const navigate = useNavigate()
  const { fonemas: regF, silabas: regS, lecciones: regL, reiniciar } = useProgress()
  const ajustes = useSettings()

  const totalLecciones = modulos.flatMap((m) => m.lecciones).length
  const completadas = Object.values(regL).filter((l) => l.completada).length
  const dominados = fonemas.filter((f) => estadoDominio(regF[f.id]) === 'dominado').length
  const silabas = Object.entries(regS).sort((a, b) => precision(a[1]) - precision(b[1]))
  const tot = silabas.reduce((acc, [, r]) => ({ i: acc.i + r.intentos, a: acc.a + r.aciertos }), { i: 0, a: 0 })
  const refuerzo = [
    ...fonemas.filter((f) => estadoDominio(regF[f.id]) === 'reforzar').map((f) => `Sonido ${f.sonido} (${f.grafema})`),
    ...silabas.filter(([, r]) => estadoDominio(r) === 'reforzar').map(([s]) => `Sílaba "${s}"`),
  ]

  return (
    <main className="seleccionable mx-auto flex min-h-dvh max-w-4xl flex-col gap-5 p-4 text-base">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de progreso</h1>
        <button type="button" onClick={() => navigate('/')} className="cursor-pointer rounded-xl bg-white px-4 py-2 font-bold shadow-sm">
          🏠 Inicio
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumen valor={`${completadas}/${totalLecciones}`} etiqueta="Lecciones completadas" />
        <Resumen valor={`${dominados}/${fonemas.length}`} etiqueta="Sonidos dominados" />
        <Resumen valor={tot.i ? pct(tot.a / tot.i) : '—'} etiqueta="Precisión silábica" />
      </div>

      <Seccion titulo="Áreas de refuerzo">
        {refuerzo.length ? (
          <ul className="list-disc space-y-1 pl-6">
            {refuerzo.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-tenue">Nada que reforzar por ahora. Aparece aquí lo que tenga menos de 60 % de acierto en 3 o más intentos.</p>
        )}
      </Seccion>

      <Seccion titulo="Sonidos (fonemas)">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fonemas.map((f) => {
            const r = regF[f.id]
            const e = ETIQUETA[estadoDominio(r)]
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-suave p-3">
                <span className={`text-4xl font-bold ${f.tipo === 'vocal' ? 'text-vocal' : 'text-consonante'}`}>{f.grafema}</span>
                <div className="flex flex-col text-sm">
                  <span className="font-bold">{f.sonido}</span>
                  <span className={`w-fit rounded-full px-2 ${e.clase}`}>{e.texto}</span>
                  {r && (
                    <span className="text-tenue">
                      {r.aciertos}/{r.intentos} · {pct(precision(r))}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Seccion>

      <Seccion titulo="Sílabas practicadas">
        {silabas.length ? (
          <ul className="space-y-2">
            {silabas.map(([s, r]) => (
              <li key={s} className="grid grid-cols-[3rem_1fr_6rem] items-center gap-3">
                <span className="text-2xl font-bold">{s}</span>
                <div className="h-3 overflow-hidden rounded-full bg-suave" role="img" aria-label={`Precisión ${pct(precision(r))}`}>
                  <div className="h-full rounded-full bg-exito" style={{ width: pct(precision(r)).replace(' ', '') }} />
                </div>
                <span className="text-right text-sm text-tenue">
                  {r.aciertos}/{r.intentos} · {pct(precision(r))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-tenue">Aún no hay sílabas practicadas.</p>
        )}
      </Seccion>

      <Seccion titulo="Lecciones">
        <ul className="space-y-1">
          {modulos
            .filter((m) => m.lecciones.length)
            .flatMap((m) => m.lecciones)
            .map((id) => {
              const l = getLeccion(id)!
              const r = regL[id]
              return (
                <li key={id} className="flex items-center justify-between border-b border-suave py-1">
                  <span>
                    M{l.modulo} · {l.titulo}
                  </span>
                  {r ? (
                    <span className="flex items-center gap-2 text-sm text-tenue">
                      <Estrellas n={r.estrellas} /> ×{r.veces}
                    </span>
                  ) : (
                    <span className="text-sm text-tenue">Pendiente</span>
                  )}
                </li>
              )
            })}
        </ul>
      </Seccion>

      <Seccion titulo="Ajustes">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            Nombre del niño o niña
            <input
              value={ajustes.nombre}
              onChange={(e) => ajustes.setNombre(e.target.value)}
              className="rounded-xl border border-suave px-3 py-2 text-lg"
              maxLength={20}
            />
          </label>
          <label className="flex flex-col gap-1">
            Volumen
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={ajustes.volumen}
              onChange={(e) => ajustes.setVolumen(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={ajustes.desbloquearTodo}
              onChange={(e) => ajustes.setDesbloquearTodo(e.target.checked)}
            />
            Desbloquear todas las lecciones
          </label>
          <button
            type="button"
            onClick={() => window.confirm('¿Borrar todo el progreso? No se puede deshacer.') && reiniciar()}
            className="w-fit cursor-pointer rounded-xl border-2 border-aviso px-4 py-2 font-bold text-aviso"
          >
            Reiniciar progreso
          </button>
        </div>
      </Seccion>

      <AudiosPendientes />
    </main>
  )
}

function Resumen({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="text-4xl font-bold">{valor}</div>
      <div className="text-tenue">{etiqueta}</div>
    </div>
  )
}

/** Lista de grabaciones necesarias y cuáles ya existen en /public/audio. */
function AudiosPendientes() {
  const lista = useMemo(() => audiosRequeridos(), [])
  const [existe, setExiste] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let vivo = true
    Promise.all(lista.map(async (a) => [a.url, await audio.existe(a.url)] as const)).then((pares) => {
      if (vivo) setExiste(Object.fromEntries(pares))
    })
    return () => {
      vivo = false
    }
  }, [lista])

  const faltan = lista.filter((a) => existe[a.url] === false)
  return (
    <Seccion titulo={`Audios por grabar (${faltan.length} de ${lista.length})`}>
      <p className="mb-3 text-sm text-tenue">
        Mientras falte un archivo, la app usa la voz del sistema para vocales, sílabas y palabras, y un sonido
        sintético aproximado para las consonantes (nunca el nombre de la letra). Graba voz humana clara, en MP3, y
        guarda cada archivo en la ruta indicada.
      </p>
      <ul className="max-h-80 space-y-1 overflow-auto font-mono text-sm">
        {lista.map((a) => (
          <li key={a.url} className="flex gap-2">
            <span aria-label={existe[a.url] ? 'Existe' : 'Falta'}>{existe[a.url] === undefined ? '⏳' : existe[a.url] ? '✅' : '⬜'}</span>
            <span className="font-bold">{a.archivo}</span>
            <span className="text-tenue">— {a.decir}</span>
          </li>
        ))}
      </ul>
    </Seccion>
  )
}
