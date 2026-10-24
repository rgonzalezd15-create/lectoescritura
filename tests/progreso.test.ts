import { beforeEach, describe, expect, it } from 'vitest'
import { estadoDominio, estrellasPara, useProgress } from '../src/store/progressStore'

describe('progreso', () => {
  beforeEach(() => useProgress.getState().reiniciar())

  it('registra intentos y aciertos', () => {
    const { registrar } = useProgress.getState()
    registrar('silabas', 'ma', true)
    registrar('silabas', 'ma', false)
    expect(useProgress.getState().silabas.ma).toMatchObject({ intentos: 2, aciertos: 1 })
  })

  it('clasifica el dominio', () => {
    expect(estadoDominio(undefined)).toBe('sin_empezar')
    expect(estadoDominio({ intentos: 4, aciertos: 4, ultimo: 0 })).toBe('dominado')
    expect(estadoDominio({ intentos: 3, aciertos: 1, ultimo: 0 })).toBe('reforzar')
    expect(estadoDominio({ intentos: 2, aciertos: 1, ultimo: 0 })).toBe('practicando')
  })

  it('guarda la mejor puntuación de una lección', () => {
    const { completarLeccion } = useProgress.getState()
    completarLeccion('cons-m', 3)
    completarLeccion('cons-m', 1)
    expect(useProgress.getState().lecciones['cons-m']).toMatchObject({ estrellas: 3, veces: 2 })
  })

  it('calcula estrellas', () => {
    expect(estrellasPara(5, 5)).toBe(3)
    expect(estrellasPara(3, 5)).toBe(2)
    expect(estrellasPara(1, 5)).toBe(1)
    expect(estrellasPara(0, 0)).toBe(3)
  })
})
