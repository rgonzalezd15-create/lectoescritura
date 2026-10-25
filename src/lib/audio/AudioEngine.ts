import type { Fonema, Sintesis } from '../../types/content'
import {
  FRASES,
  estrategiaFonema,
  urlFeedback,
  urlFonema,
  urlPalabra,
  urlSilaba,
  type FraseId,
} from './rutas'

type Paso = () => Promise<void>
interface Activo {
  detener: () => void
}

const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Motor de audio basado en Web Audio API.
 * - Grabaciones en /public/audio con caché y precarga.
 * - Si falta una grabación: voz del sistema para vocales, sílabas y palabras;
 *   síntesis aproximada para consonantes (ver `estrategiaFonema`).
 * - `secuencia()` encadena sonidos y cancela la secuencia anterior, para que
 *   tocar rápido varias veces no superponga audios.
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private cache = new Map<string, Promise<AudioBuffer | null>>()
  private activos = new Set<Activo>()
  private token = 0
  private volumen = 1
  private ruidoBuffer: AudioBuffer | null = null
  readonly faltantes = new Set<string>()

  private contexto(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volumen
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setVolumen(v: number) {
    this.volumen = v
    if (this.master) this.master.gain.value = v
  }

  /** Carga y decodifica un archivo. Devuelve null si no existe. */
  cargar(url: string): Promise<AudioBuffer | null> {
    let p = this.cache.get(url)
    if (!p) {
      p = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status))
          return r.arrayBuffer()
        })
        .then((datos) => this.contexto().decodeAudioData(datos))
        .catch(() => {
          this.faltantes.add(url)
          return null
        })
      this.cache.set(url, p)
    }
    return p
  }

  async existe(url: string) {
    return (await this.cargar(url)) !== null
  }

  precargar(urls: string[]) {
    for (const u of urls) void this.cargar(u)
  }

  /** Detiene todo lo que suena y cancela secuencias pendientes. */
  detener() {
    this.token++
    for (const a of this.activos) a.detener()
    this.activos.clear()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  async secuencia(pasos: Paso[], pausa = 120) {
    this.detener()
    const mio = this.token
    for (const paso of pasos) {
      if (this.token !== mio) return
      await paso()
      if (this.token !== mio) return
      await espera(pausa)
    }
  }

  // ---- API pública por tipo de unidad ----

  async fonema(f: Fonema) {
    const buf = await this.cargar(urlFonema(f.id))
    switch (estrategiaFonema(f, buf !== null)) {
      case 'archivo':
        return this.reproducir(buf!)
      case 'voz':
        return this.hablar(f.grafema, 0.6)
      case 'sintesis':
        return this.sintetizar(f.sintesis, f.continuo)
    }
  }

  async silaba(texto: string) {
    const buf = await this.cargar(urlSilaba(texto))
    return buf ? this.reproducir(buf) : this.hablar(texto, 0.7)
  }

  async palabra(texto: string) {
    const buf = await this.cargar(urlPalabra(texto))
    return buf ? this.reproducir(buf) : this.hablar(texto, 0.75)
  }

  async frase(id: FraseId) {
    const buf = await this.cargar(urlFeedback(id))
    return buf ? this.reproducir(buf) : this.hablar(FRASES[id], 0.9)
  }

  /** Golpe de tambor breve (palmadas). */
  golpe(): Promise<void> {
    const ctx = this.contexto()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(160, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.18)
    g.gain.setValueAtTime(0.6, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    osc.connect(g).connect(this.master!)
    osc.start(t)
    osc.stop(t + 0.24)
    return espera(220)
  }

  /** Tonos breves de refuerzo (no requieren archivos). */
  tono(tipo: 'exito' | 'intento'): Promise<void> {
    const ctx = this.contexto()
    const notas = tipo === 'exito' ? [523.25, 659.25, 783.99] : [392, 329.63]
    const paso = tipo === 'exito' ? 0.11 : 0.18
    const t0 = ctx.currentTime
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = t0 + i * paso
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(tipo === 'exito' ? 0.25 : 0.15, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.connect(g).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.4)
    })
    return espera((notas.length - 1) * paso * 1000 + 400)
  }

  // ---- Internos ----

  private registrar(nodo: AudioScheduledSourceNode): Promise<void> {
    return new Promise((resolve) => {
      const activo: Activo = {
        detener: () => {
          try {
            nodo.stop()
          } catch {
            /* ya detenido */
          }
          resolve()
        },
      }
      this.activos.add(activo)
      nodo.onended = () => {
        this.activos.delete(activo)
        resolve()
      }
    })
  }

  private reproducir(buf: AudioBuffer): Promise<void> {
    const ctx = this.contexto()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.master!)
    const fin = this.registrar(src)
    src.start()
    return fin
  }

  private vozEspanol(): SpeechSynthesisVoice | undefined {
    const voces = window.speechSynthesis.getVoices()
    return voces.find((v) => v.lang === 'es-ES') ?? voces.find((v) => v.lang.startsWith('es'))
  }

  private hablar(texto: string, velocidad: number): Promise<void> {
    if (!('speechSynthesis' in window)) return Promise.resolve()
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(texto)
      u.lang = 'es-ES'
      const voz = this.vozEspanol()
      if (voz) u.voice = voz
      u.rate = velocidad
      u.volume = this.volumen
      let listo = false
      const fin = () => {
        if (!listo) {
          listo = true
          resolve()
        }
      }
      u.onend = fin
      u.onerror = fin
      setTimeout(fin, 1200 + texto.length * 250)
      window.speechSynthesis.speak(u)
    })
  }

  private ruido(ctx: AudioContext): AudioBufferSourceNode {
    if (!this.ruidoBuffer) {
      const len = ctx.sampleRate
      this.ruidoBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.ruidoBuffer.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = this.ruidoBuffer
    src.loop = true
    return src
  }

  /**
   * Aproximación PROVISIONAL de consonantes hasta tener grabaciones:
   * zumbido nasal (/mmm/, /nnn/), lateral (/lll/), ruido agudo (/sss/),
   * ruido suave (/fff/) y explosión breve (/p/).
   */
  private sintetizar(tipo: Sintesis, continuo: boolean): Promise<void> {
    const ctx = this.contexto()
    const t = ctx.currentTime
    const env = ctx.createGain()
    env.connect(this.master!)

    let fuente: AudioScheduledSourceNode
    let filtro: BiquadFilterNode = ctx.createBiquadFilter()

    if (tipo === 'nasal' || tipo === 'lateral' || tipo === 'vocal') {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 165
      filtro.type = 'lowpass'
      filtro.frequency.value = tipo === 'nasal' ? 380 : 950
      fuente = osc
    } else {
      fuente = this.ruido(ctx)
      if (tipo === 'fricativa_aguda') {
        filtro.type = 'highpass'
        filtro.frequency.value = 4200
      } else if (tipo === 'fricativa_suave') {
        filtro.type = 'bandpass'
        filtro.frequency.value = 1800
        filtro.Q.value = 0.6
      } else {
        filtro.type = 'lowpass'
        filtro.frequency.value = 1200
      }
    }
    fuente.connect(filtro).connect(env)

    const pico = tipo === 'fricativa_suave' ? 0.35 : tipo === 'oclusiva' ? 0.6 : 0.3
    let dur: number
    if (tipo === 'oclusiva' || !continuo) {
      dur = 0.09
      env.gain.setValueAtTime(pico, t)
      env.gain.exponentialRampToValueAtTime(0.001, t + dur)
    } else {
      dur = 0.9
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(pico, t + 0.05)
      env.gain.setValueAtTime(pico, t + dur - 0.1)
      env.gain.linearRampToValueAtTime(0, t + dur)
    }
    const fin = this.registrar(fuente)
    fuente.start(t)
    fuente.stop(t + dur + 0.02)
    return fin
  }
}

export const audio = new AudioEngine()
