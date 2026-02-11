import { BrowserWindow } from 'electron'
import { KokoroManager } from './KokoroManager'
import { TtsCache } from './TtsCache'

export type TtsState = 'idle' | 'loading' | 'speaking' | 'paused'

export interface TtsSnapshot {
  state: TtsState
  bookId: string | null
  chapterHref: string | null
  voiceId: string
  rate: number
  currentChunkIndex: number
  totalChunks: number
}

interface ChunkData {
  index: number
  text: string
  startOffset: number
}

const DEFAULT_VOICE = 'af_heart'
const DEFAULT_RATE = 1.0

/**
 * Encode Float32 audio samples into a WAV buffer (mono, 16-bit PCM).
 */
function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const dataSize = samples.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2)
  }

  return buffer
}

export class TtsService {
  private kokoroManager: KokoroManager
  private cache: TtsCache

  private state: TtsState = 'idle'
  private bookId: string | null = null
  private chapterHref: string | null = null
  private voiceId: string = DEFAULT_VOICE
  private rate: number = DEFAULT_RATE
  private chunks: ChunkData[] = []
  private currentChunkIndex: number = 0

  // Cancellation
  private activeAbort: AbortController | null = null
  private preBufferAbort: AbortController | null = null

  // Pre-buffered next chunk
  private preBufferedChunkIndex: number = -1
  private preBufferedWavPath: string | null = null

  // State change callback (for session integration)
  private onStateChangeCallbacks: Array<(state: TtsState) => void> = []

  constructor() {
    this.kokoroManager = new KokoroManager()
    this.cache = new TtsCache()
  }

  // ─── Public API ────────────────────────────────────

  getSnapshot(): TtsSnapshot {
    return {
      state: this.state,
      bookId: this.bookId,
      chapterHref: this.chapterHref,
      voiceId: this.voiceId,
      rate: this.rate,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length
    }
  }

  getKokoroManager(): KokoroManager {
    return this.kokoroManager
  }

  getCache(): TtsCache {
    return this.cache
  }

  onStateChange(callback: (state: TtsState) => void): void {
    this.onStateChangeCallbacks.push(callback)
  }

  async speak(params: {
    bookId: string
    chapterHref: string
    chunks: ChunkData[]
    startChunkIndex?: number
    voiceId?: string
    rate?: number
  }): Promise<TtsSnapshot> {
    this.cancelAll()

    this.bookId = params.bookId
    this.chapterHref = params.chapterHref
    this.chunks = params.chunks
    this.currentChunkIndex = params.startChunkIndex ?? 0
    if (params.voiceId) this.voiceId = params.voiceId
    if (params.rate) this.rate = params.rate

    if (this.chunks.length === 0) {
      this.setState('idle')
      return this.getSnapshot()
    }

    if (!this.kokoroManager.isReady()) {
      this.broadcastError('Kokoro TTS is not installed', 'NOT_INSTALLED')
      this.setState('idle')
      return this.getSnapshot()
    }

    this.setState('loading')
    await this.synthesizeAndSendChunk(this.currentChunkIndex)
    this.setState('speaking')

    this.preBufferNext()

    return this.getSnapshot()
  }

  pause(): TtsSnapshot {
    if (this.state === 'speaking') {
      this.setState('paused')
    }
    return this.getSnapshot()
  }

  resume(): TtsSnapshot {
    if (this.state === 'paused') {
      this.setState('speaking')
    }
    return this.getSnapshot()
  }

  stop(): TtsSnapshot {
    this.cancelAll()
    this.chunks = []
    this.currentChunkIndex = 0
    this.bookId = null
    this.chapterHref = null
    this.setState('idle')
    return this.getSnapshot()
  }

  async nextChunk(): Promise<TtsSnapshot> {
    if (this.currentChunkIndex >= this.chunks.length - 1) {
      return this.stop()
    }

    this.currentChunkIndex++
    this.cancelActive()

    this.setState('loading')

    // Use pre-buffered WAV if available
    if (this.preBufferedWavPath && this.preBufferedChunkIndex === this.currentChunkIndex) {
      const url = this.cache.getUrl(this.preBufferedWavPath)
      this.broadcastChunkReady(this.currentChunkIndex, url)
      this.preBufferedWavPath = null
      this.preBufferedChunkIndex = -1
      this.setState('speaking')
      this.preBufferNext()
      return this.getSnapshot()
    }

    await this.synthesizeAndSendChunk(this.currentChunkIndex)
    this.setState('speaking')
    this.preBufferNext()
    return this.getSnapshot()
  }

  async prevChunk(): Promise<TtsSnapshot> {
    if (this.currentChunkIndex <= 0) {
      return this.getSnapshot()
    }

    this.currentChunkIndex--
    this.cancelActive()

    this.setState('loading')
    await this.synthesizeAndSendChunk(this.currentChunkIndex)
    this.setState('speaking')
    this.preBufferNext()
    return this.getSnapshot()
  }

  async setVoice(voiceId: string): Promise<TtsSnapshot> {
    this.voiceId = voiceId
    if (this.state === 'speaking' || this.state === 'paused') {
      this.cancelAll()
      this.setState('loading')
      await this.synthesizeAndSendChunk(this.currentChunkIndex)
      this.setState('speaking')
      this.preBufferNext()
    }
    return this.getSnapshot()
  }

  async setRate(rate: number): Promise<TtsSnapshot> {
    this.rate = rate
    if (this.state === 'speaking' || this.state === 'paused') {
      this.cancelAll()
      this.setState('loading')
      await this.synthesizeAndSendChunk(this.currentChunkIndex)
      this.setState('speaking')
      this.preBufferNext()
    }
    return this.getSnapshot()
  }

  getState(): TtsState {
    return this.state
  }

  isSpeaking(): boolean {
    return this.state === 'speaking'
  }

  destroy(): void {
    this.cancelAll()
    this.state = 'idle'
    this.chunks = []
  }

  // ─── Private ───────────────────────────────────────

  private setState(newState: TtsState): void {
    const oldState = this.state
    this.state = newState
    this.broadcastState()

    if (oldState !== newState) {
      for (const cb of this.onStateChangeCallbacks) {
        try {
          cb(newState)
        } catch {
          // Ignore callback errors
        }
      }
    }
  }

  private async synthesizeAndSendChunk(chunkIndex: number): Promise<void> {
    const chunk = this.chunks[chunkIndex]
    if (!chunk) return

    const cacheKey = TtsCache.makeKey(
      this.bookId!,
      this.chapterHref!,
      this.voiceId,
      this.rate,
      chunkIndex,
      chunk.text
    )

    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached) {
      const url = this.cache.getUrl(cached)
      this.broadcastChunkReady(chunkIndex, url)
      return
    }

    // Synthesize with Kokoro
    const wavPath = await this.synthesizeChunk(chunk.text, cacheKey)
    if (wavPath) {
      const url = this.cache.getUrl(wavPath)
      this.broadcastChunkReady(chunkIndex, url)
    }
  }

  private async synthesizeChunk(text: string, cacheKey: string): Promise<string | null> {
    const abort = new AbortController()
    this.activeAbort = abort

    try {
      const kokoro = await this.kokoroManager.ensureLoaded()
      if (abort.signal.aborted) return null

      const result = await kokoro.generate(text, {
        voice: this.voiceId,
        speed: this.rate
      })
      if (abort.signal.aborted) return null

      // Extract audio data — kokoro-js returns object with audio/waveform + sampling_rate
      const samples: Float32Array = result.audio ?? result.waveform
      const sampleRate: number = result.sampling_rate ?? result.sampleRate ?? 24000

      const wavBuffer = encodeWav(samples, sampleRate)
      const wavPath = this.cache.put(cacheKey, wavBuffer)
      return wavPath
    } catch (err) {
      if (abort.signal.aborted) return null
      console.error('Kokoro synthesis failed:', err)
      this.broadcastError(
        `Synthesis failed: ${err instanceof Error ? err.message : String(err)}`,
        'SYNTHESIS_ERROR'
      )
      return null
    } finally {
      if (this.activeAbort === abort) {
        this.activeAbort = null
      }
    }
  }

  private preBufferNext(): void {
    const nextIndex = this.currentChunkIndex + 1
    if (nextIndex >= this.chunks.length) return

    const chunk = this.chunks[nextIndex]
    if (!chunk) return

    const cacheKey = TtsCache.makeKey(
      this.bookId!,
      this.chapterHref!,
      this.voiceId,
      this.rate,
      nextIndex,
      chunk.text
    )

    // Already cached?
    const cached = this.cache.get(cacheKey)
    if (cached) {
      this.preBufferedChunkIndex = nextIndex
      this.preBufferedWavPath = cached
      return
    }

    // Cancel existing pre-buffer
    this.cancelPreBuffer()

    const abort = new AbortController()
    this.preBufferAbort = abort

    // Fire-and-forget synthesis
    ;(async () => {
      try {
        const kokoro = await this.kokoroManager.ensureLoaded()
        if (abort.signal.aborted) return

        const result = await kokoro.generate(chunk.text, {
          voice: this.voiceId,
          speed: this.rate
        })
        if (abort.signal.aborted) return

        const samples: Float32Array = result.audio ?? result.waveform
        const sampleRate: number = result.sampling_rate ?? result.sampleRate ?? 24000

        const wavBuffer = encodeWav(samples, sampleRate)
        const wavPath = this.cache.put(cacheKey, wavBuffer)

        if (!abort.signal.aborted) {
          this.preBufferedChunkIndex = nextIndex
          this.preBufferedWavPath = wavPath
        }
      } catch {
        // Pre-buffer failure is non-critical
      } finally {
        if (this.preBufferAbort === abort) {
          this.preBufferAbort = null
        }
      }
    })()
  }

  private cancelActive(): void {
    if (this.activeAbort) {
      this.activeAbort.abort()
      this.activeAbort = null
    }
  }

  private cancelPreBuffer(): void {
    if (this.preBufferAbort) {
      this.preBufferAbort.abort()
      this.preBufferAbort = null
    }
    this.preBufferedChunkIndex = -1
    this.preBufferedWavPath = null
  }

  private cancelAll(): void {
    this.cancelActive()
    this.cancelPreBuffer()
  }

  private broadcastState(): void {
    const snapshot = this.getSnapshot()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('tts:state-update', snapshot)
      }
    }
  }

  private broadcastChunkReady(chunkIndex: number, wavUrl: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('tts:chunk-ready', { chunkIndex, wavUrl })
      }
    }
  }

  private broadcastError(message: string, code: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('tts:error', { message, code })
      }
    }
  }
}

// Singleton
let instance: TtsService | null = null

export function getTtsService(): TtsService {
  if (!instance) {
    instance = new TtsService()
  }
  return instance
}
