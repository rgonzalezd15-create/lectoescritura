import { describe, expect, it } from 'vitest'
import { dividirCV, partirSilaba, unir } from '../src/lib/silabas'

describe('sílabas', () => {
  it('une sonido consonante + vocal', () => {
    expect(unir('m', 'a')).toBe('ma')
  })
  it('divide palabras CV del vocabulario inicial', () => {
    expect(dividirCV('mapa')).toEqual(['ma', 'pa'])
    expect(dividirCV('mamá')).toEqual(['ma', 'má'])
    expect(dividirCV('sopa')).toEqual(['so', 'pa'])
    expect(dividirCV('sol')).toEqual(['sol'])
  })
  it('separa consonante y vocal (incluye dígrafos)', () => {
    expect(partirSilaba('ma')).toEqual({ consonante: 'm', vocal: 'a' })
    expect(partirSilaba('lla')).toEqual({ consonante: 'll', vocal: 'a' })
  })
})

describe('bloques', () => {
  it('usa los bloques del JSON o divide la palabra', async () => {
    const { bloquesDe, barajar } = await import('../src/lib/silabas')
    expect(bloquesDe({ texto: 'mamá', bloques: ['ma', 'má'] })).toEqual(['ma', 'má'])
    expect(bloquesDe({ texto: 'maleta' })).toEqual(['ma', 'le', 'ta'])
    expect(barajar([1, 2, 3]).sort()).toEqual([1, 2, 3])
  })
})
