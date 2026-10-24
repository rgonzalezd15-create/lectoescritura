import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from './BigButton'

/** Barra con botón de volver (icono) y contenido opcional a la derecha. */
export function BarraSuperior({ volverA = '/', children }: { volverA?: string; children?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3">
      <BigButton variante="suave" aria-label="Volver" onClick={() => navigate(volverA)}>
        {volverA === '/' ? '🏠' : '⬅️'}
      </BigButton>
      <div className="flex flex-1 items-center justify-end gap-3">{children}</div>
    </header>
  )
}
