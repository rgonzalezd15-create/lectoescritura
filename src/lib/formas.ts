/** Formas que acompañan a cada color (accesibilidad para daltonismo). */
export const FORMAS = ['circulo', 'triangulo', 'cuadrado', 'estrella', 'corazon', 'rombo'] as const
export type Forma = (typeof FORMAS)[number]
