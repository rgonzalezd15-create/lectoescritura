import { esVocal } from '../../lib/silabas'

/** Pinta cada letra con su color: vocales naranja, consonantes azul. */
export function Letras({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <span className={className}>
      {[...texto].map((ch, i) => (
        <span key={i} className={esVocal(ch) ? 'text-vocal' : 'text-consonante'}>
          {ch}
        </span>
      ))}
    </span>
  )
}
