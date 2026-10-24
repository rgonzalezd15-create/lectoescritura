export function Estrellas({ n, max = 3, className = '' }: { n: number; max?: number; className?: string }) {
  return (
    <span className={className} aria-label={`${n} de ${max} estrellas`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? '' : 'opacity-20 grayscale'}>
          ⭐
        </span>
      ))}
    </span>
  )
}
