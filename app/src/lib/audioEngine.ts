// ─── Procedural Ambient Audio Engine ────────────────
// Uses Web Audio API to generate ambient soundscapes procedurally.
// No audio files needed - all sounds are synthesized in real-time.

export type SoundscapeId = 'rain' | 'coffeeshop' | 'whitenoise' | 'fireplace' | 'forest'

export interface SoundscapeInfo {
  id: SoundscapeId
  name: string
  icon: string
  description: string
}

export const SOUNDSCAPES: SoundscapeInfo[] = [
  { id: 'rain', name: 'Rain', icon: 'cloud-rain', description: 'Gentle rainfall' },
  { id: 'coffeeshop', name: 'Coffee Shop', icon: 'coffee', description: 'Ambient cafe murmur' },
  { id: 'whitenoise', name: 'White Noise', icon: 'radio', description: 'Steady white noise' },
  { id: 'fireplace', name: 'Fireplace', icon: 'flame', description: 'Crackling fire' },
  { id: 'forest', name: 'Forest', icon: 'trees', description: 'Forest ambience with birds' }
]

// ─── Noise Generators ─────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, duration: number, type: 'white' | 'pink' | 'brown'): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1

      if (type === 'white') {
        data[i] = white * 0.5
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      } else {
        // Brown noise
        data[i] = (b0 = (b0 + (0.02 * white)) / 1.02) * 3.5
      }
    }
  }

  return buffer
}

// ─── Soundscape Creators ──────────────────────────────

interface SoundscapeNodes {
  nodes: AudioNode[]
  sources: AudioBufferSourceNode[]
  gainNode: GainNode
}

function createRain(ctx: AudioContext, output: GainNode): SoundscapeNodes {
  const nodes: AudioNode[] = []
  const sources: AudioBufferSourceNode[] = []

  // Main rain body - filtered brown noise
  const rainBuffer = createNoiseBuffer(ctx, 4, 'brown')
  const rainSource = ctx.createBufferSource()
  rainSource.buffer = rainBuffer
  rainSource.loop = true

  const rainFilter = ctx.createBiquadFilter()
  rainFilter.type = 'bandpass'
  rainFilter.frequency.value = 800
  rainFilter.Q.value = 0.5

  const rainGain = ctx.createGain()
  rainGain.gain.value = 0.6

  rainSource.connect(rainFilter)
  rainFilter.connect(rainGain)
  rainGain.connect(output)
  rainSource.start()

  nodes.push(rainFilter, rainGain)
  sources.push(rainSource)

  // High-frequency patter
  const patterBuffer = createNoiseBuffer(ctx, 4, 'white')
  const patterSource = ctx.createBufferSource()
  patterSource.buffer = patterBuffer
  patterSource.loop = true

  const patterFilter = ctx.createBiquadFilter()
  patterFilter.type = 'highpass'
  patterFilter.frequency.value = 4000

  const patterGain = ctx.createGain()
  patterGain.gain.value = 0.15

  patterSource.connect(patterFilter)
  patterFilter.connect(patterGain)
  patterGain.connect(output)
  patterSource.start()

  nodes.push(patterFilter, patterGain)
  sources.push(patterSource)

  // Mid rumble
  const rumbleBuffer = createNoiseBuffer(ctx, 6, 'brown')
  const rumbleSource = ctx.createBufferSource()
  rumbleSource.buffer = rumbleBuffer
  rumbleSource.loop = true

  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 200

  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0.25

  rumbleSource.connect(rumbleFilter)
  rumbleFilter.connect(rumbleGain)
  rumbleGain.connect(output)
  rumbleSource.start()

  nodes.push(rumbleFilter, rumbleGain)
  sources.push(rumbleSource)

  return { nodes, sources, gainNode: output }
}

function createCoffeeShop(ctx: AudioContext, output: GainNode): SoundscapeNodes {
  const nodes: AudioNode[] = []
  const sources: AudioBufferSourceNode[] = []

  // Background murmur
  const murmurBuffer = createNoiseBuffer(ctx, 6, 'pink')
  const murmurSource = ctx.createBufferSource()
  murmurSource.buffer = murmurBuffer
  murmurSource.loop = true

  const murmurFilter = ctx.createBiquadFilter()
  murmurFilter.type = 'bandpass'
  murmurFilter.frequency.value = 400
  murmurFilter.Q.value = 0.8

  const murmurGain = ctx.createGain()
  murmurGain.gain.value = 0.45

  murmurSource.connect(murmurFilter)
  murmurFilter.connect(murmurGain)
  murmurGain.connect(output)
  murmurSource.start()

  nodes.push(murmurFilter, murmurGain)
  sources.push(murmurSource)

  // Higher conversation layer
  const chatBuffer = createNoiseBuffer(ctx, 5, 'pink')
  const chatSource = ctx.createBufferSource()
  chatSource.buffer = chatBuffer
  chatSource.loop = true

  const chatFilter = ctx.createBiquadFilter()
  chatFilter.type = 'bandpass'
  chatFilter.frequency.value = 1200
  chatFilter.Q.value = 1.2

  const chatGain = ctx.createGain()
  chatGain.gain.value = 0.12

  chatSource.connect(chatFilter)
  chatFilter.connect(chatGain)
  chatGain.connect(output)
  chatSource.start()

  nodes.push(chatFilter, chatGain)
  sources.push(chatSource)

  // Subtle clinking
  const clinkBuffer = createNoiseBuffer(ctx, 3, 'white')
  const clinkSource = ctx.createBufferSource()
  clinkSource.buffer = clinkBuffer
  clinkSource.loop = true

  const clinkFilter = ctx.createBiquadFilter()
  clinkFilter.type = 'bandpass'
  clinkFilter.frequency.value = 3000
  clinkFilter.Q.value = 3

  const clinkGain = ctx.createGain()
  clinkGain.gain.value = 0.04

  clinkSource.connect(clinkFilter)
  clinkFilter.connect(clinkGain)
  clinkGain.connect(output)
  clinkSource.start()

  nodes.push(clinkFilter, clinkGain)
  sources.push(clinkSource)

  return { nodes, sources, gainNode: output }
}

function createWhiteNoise(ctx: AudioContext, output: GainNode): SoundscapeNodes {
  const nodes: AudioNode[] = []
  const sources: AudioBufferSourceNode[] = []

  // Smooth white noise with gentle high-cut
  const buffer = createNoiseBuffer(ctx, 4, 'white')
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 10000

  const gain = ctx.createGain()
  gain.gain.value = 0.3

  source.connect(filter)
  filter.connect(gain)
  gain.connect(output)
  source.start()

  nodes.push(filter, gain)
  sources.push(source)

  // Pink noise layer for warmth
  const pinkBuffer = createNoiseBuffer(ctx, 5, 'pink')
  const pinkSource = ctx.createBufferSource()
  pinkSource.buffer = pinkBuffer
  pinkSource.loop = true

  const pinkGain = ctx.createGain()
  pinkGain.gain.value = 0.15

  pinkSource.connect(pinkGain)
  pinkGain.connect(output)
  pinkSource.start()

  nodes.push(pinkGain)
  sources.push(pinkSource)

  return { nodes, sources, gainNode: output }
}

function createFireplace(ctx: AudioContext, output: GainNode): SoundscapeNodes {
  const nodes: AudioNode[] = []
  const sources: AudioBufferSourceNode[] = []

  // Base crackle
  const crackleBuffer = createNoiseBuffer(ctx, 4, 'brown')
  const crackleSource = ctx.createBufferSource()
  crackleSource.buffer = crackleBuffer
  crackleSource.loop = true

  const crackleFilter = ctx.createBiquadFilter()
  crackleFilter.type = 'bandpass'
  crackleFilter.frequency.value = 600
  crackleFilter.Q.value = 1.5

  const crackleGain = ctx.createGain()
  crackleGain.gain.value = 0.5

  crackleSource.connect(crackleFilter)
  crackleFilter.connect(crackleGain)
  crackleGain.connect(output)
  crackleSource.start()

  nodes.push(crackleFilter, crackleGain)
  sources.push(crackleSource)

  // Pop/snap layer
  const popBuffer = createNoiseBuffer(ctx, 3, 'white')
  const popSource = ctx.createBufferSource()
  popSource.buffer = popBuffer
  popSource.loop = true

  const popFilter = ctx.createBiquadFilter()
  popFilter.type = 'bandpass'
  popFilter.frequency.value = 2500
  popFilter.Q.value = 4

  const popGain = ctx.createGain()
  popGain.gain.value = 0.08

  popSource.connect(popFilter)
  popFilter.connect(popGain)
  popGain.connect(output)
  popSource.start()

  nodes.push(popFilter, popGain)
  sources.push(popSource)

  // Low roar
  const roarBuffer = createNoiseBuffer(ctx, 5, 'brown')
  const roarSource = ctx.createBufferSource()
  roarSource.buffer = roarBuffer
  roarSource.loop = true

  const roarFilter = ctx.createBiquadFilter()
  roarFilter.type = 'lowpass'
  roarFilter.frequency.value = 150

  const roarGain = ctx.createGain()
  roarGain.gain.value = 0.35

  roarSource.connect(roarFilter)
  roarFilter.connect(roarGain)
  roarGain.connect(output)
  roarSource.start()

  nodes.push(roarFilter, roarGain)
  sources.push(roarSource)

  return { nodes, sources, gainNode: output }
}

function createForest(ctx: AudioContext, output: GainNode): SoundscapeNodes {
  const nodes: AudioNode[] = []
  const sources: AudioBufferSourceNode[] = []

  // Wind through leaves
  const windBuffer = createNoiseBuffer(ctx, 6, 'pink')
  const windSource = ctx.createBufferSource()
  windSource.buffer = windBuffer
  windSource.loop = true

  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 500
  windFilter.Q.value = 0.3

  const windGain = ctx.createGain()
  windGain.gain.value = 0.3

  windSource.connect(windFilter)
  windFilter.connect(windGain)
  windGain.connect(output)
  windSource.start()

  nodes.push(windFilter, windGain)
  sources.push(windSource)

  // Bird chirps layer
  const birdBuffer = createNoiseBuffer(ctx, 4, 'white')
  const birdSource = ctx.createBufferSource()
  birdSource.buffer = birdBuffer
  birdSource.loop = true

  const birdFilter = ctx.createBiquadFilter()
  birdFilter.type = 'bandpass'
  birdFilter.frequency.value = 3500
  birdFilter.Q.value = 8

  const birdGain = ctx.createGain()
  birdGain.gain.value = 0.035

  birdSource.connect(birdFilter)
  birdFilter.connect(birdGain)
  birdGain.connect(output)
  birdSource.start()

  nodes.push(birdFilter, birdGain)
  sources.push(birdSource)

  // Rustling leaves
  const rustleBuffer = createNoiseBuffer(ctx, 5, 'pink')
  const rustleSource = ctx.createBufferSource()
  rustleSource.buffer = rustleBuffer
  rustleSource.loop = true

  const rustleFilter = ctx.createBiquadFilter()
  rustleFilter.type = 'bandpass'
  rustleFilter.frequency.value = 2000
  rustleFilter.Q.value = 1.5

  const rustleGain = ctx.createGain()
  rustleGain.gain.value = 0.08

  rustleSource.connect(rustleFilter)
  rustleFilter.connect(rustleGain)
  rustleGain.connect(output)
  rustleSource.start()

  nodes.push(rustleFilter, rustleGain)
  sources.push(rustleSource)

  // Deep forest base
  const baseBuffer = createNoiseBuffer(ctx, 6, 'brown')
  const baseSource = ctx.createBufferSource()
  baseSource.buffer = baseBuffer
  baseSource.loop = true

  const baseFilter = ctx.createBiquadFilter()
  baseFilter.type = 'lowpass'
  baseFilter.frequency.value = 250

  const baseGain = ctx.createGain()
  baseGain.gain.value = 0.15

  baseSource.connect(baseFilter)
  baseFilter.connect(baseGain)
  baseGain.connect(output)
  baseSource.start()

  nodes.push(baseFilter, baseGain)
  sources.push(baseSource)

  return { nodes, sources, gainNode: output }
}

// ─── Audio Engine ──────────────────────────────────────

const CREATORS: Record<SoundscapeId, (ctx: AudioContext, output: GainNode) => SoundscapeNodes> = {
  rain: createRain,
  coffeeshop: createCoffeeShop,
  whitenoise: createWhiteNoise,
  fireplace: createFireplace,
  forest: createForest
}

interface ActiveSound {
  nodes: SoundscapeNodes
  volume: number
}

const FADE_DURATION = 0.3

class AmbientAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeSounds: Map<SoundscapeId, ActiveSound> = new Map()
  private _masterVolume = 0.5
  private _paused = false

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this._masterVolume
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private async ensureRunning(): Promise<AudioContext> {
    const ctx = this.getContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    return ctx
  }

  private getMasterGain(): GainNode {
    this.getContext()
    return this.masterGain!
  }

  get masterVolume(): number {
    return this._masterVolume
  }

  set masterVolume(value: number) {
    this._masterVolume = Math.max(0, Math.min(1, value))
    if (this.masterGain && !this._paused) {
      this.masterGain.gain.setTargetAtTime(this._masterVolume, this.ctx!.currentTime, 0.05)
    }
  }

  get paused(): boolean {
    return this._paused
  }

  isPlaying(id: SoundscapeId): boolean {
    return this.activeSounds.has(id)
  }

  getVolume(id: SoundscapeId): number {
    return this.activeSounds.get(id)?.volume ?? 0.5
  }

  getActiveSounds(): SoundscapeId[] {
    return [...this.activeSounds.keys()]
  }

  play(id: SoundscapeId, volume = 0.5): void {
    if (this.activeSounds.has(id)) return

    this.ensureRunning().then((ctx) => {
      if (this.activeSounds.has(id)) return

      const master = this.getMasterGain()
      const soundGain = ctx.createGain()
      soundGain.gain.value = 0
      soundGain.connect(master)

      const creator = CREATORS[id]
      const nodes = creator(ctx, soundGain)

      this.activeSounds.set(id, { nodes, volume })

      if (!this._paused) {
        soundGain.gain.setTargetAtTime(volume, ctx.currentTime, FADE_DURATION)
      }
    }).catch(() => {
      // Failed to play - likely blocked by browser autoplay policy
    })
  }

  stop(id: SoundscapeId): void {
    const active = this.activeSounds.get(id)
    if (!active) return

    const ctx = this.ctx
    if (ctx) {
      const gain = active.nodes.gainNode
      gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_DURATION)

      setTimeout(() => {
        active.nodes.sources.forEach((s) => {
          try { s.stop() } catch { /* already stopped */ }
        })
        active.nodes.nodes.forEach((n) => {
          try { n.disconnect() } catch { /* already disconnected */ }
        })
        try { gain.disconnect() } catch { /* already disconnected */ }
      }, FADE_DURATION * 3 * 1000)
    }

    this.activeSounds.delete(id)
  }

  setVolume(id: SoundscapeId, volume: number): void {
    const active = this.activeSounds.get(id)
    if (!active) return

    const clamped = Math.max(0, Math.min(1, volume))
    active.volume = clamped

    if (this.ctx && !this._paused) {
      active.nodes.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05)
    }
  }

  pause(): void {
    if (this._paused) return
    this._paused = true

    if (this.ctx) {
      this.masterGain?.gain.setTargetAtTime(0, this.ctx.currentTime, FADE_DURATION)
    }
  }

  resume(): void {
    if (!this._paused) return
    this._paused = false

    if (this.ctx) {
      const ctx = this.ctx
      const doFade = (): void => {
        this.masterGain?.gain.setTargetAtTime(this._masterVolume, ctx.currentTime, FADE_DURATION)
      }
      if (ctx.state === 'suspended') {
        ctx.resume().then(doFade).catch(() => { /* blocked */ })
      } else {
        doFade()
      }
    }
  }

  stopAll(): void {
    const ids = [...this.activeSounds.keys()]
    ids.forEach((id) => this.stop(id))
  }

  destroy(): void {
    this.stopAll()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
      this.masterGain = null
    }
  }
}

// Singleton engine instance
export const audioEngine = new AmbientAudioEngine()
