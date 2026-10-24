import { describe, expect, it } from 'vitest'
import { fonemas, lecciones, modulos, validarContenido } from '../src/lib/contentLoader'
import { estrategiaFonema } from '../src/lib/audio/rutas'

describe('contenido', () => {
  it('es coherente (lecciones, fonemas y objetivos formables)', () => {
    expect(validarContenido()).toEqual([])
  })

  it('las letras se presentan en minúscula', () => {
    for (const f of fonemas) expect(f.grafema).toBe(f.grafema.toLowerCase())
  })

  it('el sonido nunca es el nombre de la letra', () => {
    const nombres = ['eme', 'ese', 'ele', 'ene', 'efe', 'pe']
    for (const f of fonemas) {
      expect(f.sonido).toMatch(/^\/.+\/$/)
      expect(nombres).not.toContain(f.sonido.replaceAll('/', ''))
    }
  })

  it('la ruta de consonantes empieza por el bloque 1 en el módulo 4', () => {
    const m4 = modulos.find((m) => m.id === 4)!
    expect(m4.lecciones[0]).toBe('cons-m')
    expect(lecciones.length).toBeGreaterThan(0)
  })
})

describe('regla de oro del audio', () => {
  it('una consonante sin grabación NUNCA usa la voz del sistema', () => {
    for (const f of fonemas.filter((x) => x.tipo === 'consonante')) {
      expect(estrategiaFonema(f, false)).toBe('sintesis')
      expect(estrategiaFonema(f, true)).toBe('archivo')
    }
  })
  it('las vocales pueden usar la voz (nombre = sonido)', () => {
    for (const f of fonemas.filter((x) => x.tipo === 'vocal')) expect(estrategiaFonema(f, false)).toBe('voz')
  })
})
