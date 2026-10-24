/** Puntos que indican el reto actual dentro de un paso. */
export function PuntosRetos({ actual, total }: { actual: number; total: number }) {
  return (
    <div className="flex gap-2" aria-label={`Reto ${actual + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full ${i < actual ? 'bg-exito' : i === actual ? 'bg-primario' : 'bg-suave'}`}
        />
      ))}
    </div>
  )
}
