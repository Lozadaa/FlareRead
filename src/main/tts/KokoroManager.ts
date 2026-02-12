import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'

export interface KokoroVoice {
  id: string
  name: string
  language: string
  gender: 'female' | 'male'
}

const LANGUAGE_MAP: Record<string, string> = {
  a: 'en-US',
  b: 'en-GB',
  e: 'es-ES',
  f: 'fr-FR',
  h: 'hi-IN',
  i: 'it-IT',
  j: 'ja-JP',
  z: 'zh-CN',
  p: 'pt-BR'
}

const LANGUAGE_LABELS: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'hi-IN': 'Hindi',
  'it-IT': 'Italian',
  'ja-JP': 'Japanese',
  'zh-CN': 'Chinese',
  'pt-BR': 'Portuguese (BR)'
}

function deriveVoiceMetadata(voiceId: string): KokoroVoice {
  const prefix = voiceId.substring(0, 2)
  const language = LANGUAGE_MAP[prefix[0]] || 'en-US'
  const gender: 'female' | 'male' = prefix[1] === 'm' ? 'male' : 'female'

  const rawName = voiceId.substring(3)
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const langLabel = LANGUAGE_LABELS[language] || language

  return { id: voiceId, name: `${name} (${langLabel})`, language, gender }
}

// Known voices in Kokoro v1.0 — derived at runtime via list_voices() if available
const KNOWN_VOICE_IDS = [
  // American Female
  'af_heart', 'af_alloy', 'af_aoede', 'af_bella', 'af_jessica',
  'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky',
  // American Male
  'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam',
  'am_michael', 'am_onyx', 'am_puck', 'am_santa',
  // British Female
  'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily',
  // British Male
  'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis'
]

const KOKORO_VOICES: KokoroVoice[] = KNOWN_VOICE_IDS.map(deriveVoiceMetadata)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KokoroTTSInstance = any

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const MARKER_FILE = '.kokoro-installed'

export class KokoroManager {
  private modelDir: string
  private ttsInstance: KokoroTTSInstance | null = null
  private loadingPromise: Promise<KokoroTTSInstance> | null = null

  constructor() {
    const baseDir = join(app.getPath('userData'), 'tts')
    this.modelDir = join(baseDir, 'kokoro')
    mkdirSync(this.modelDir, { recursive: true })
  }

  isInstalled(): boolean {
    return existsSync(join(this.modelDir, MARKER_FILE))
  }

  isReady(): boolean {
    return this.isInstalled()
  }

  getVoices(): Array<KokoroVoice & { installed: boolean }> {
    const installed = this.isInstalled()
    return KOKORO_VOICES.map((v) => ({ ...v, installed }))
  }

  async install(): Promise<void> {
    if (this.isInstalled() && this.ttsInstance) return

    // If marker exists but instance is null, the model may be corrupted — wipe marker
    if (this.isInstalled() && !this.ttsInstance) {
      try {
        rmSync(join(this.modelDir, MARKER_FILE), { force: true })
      } catch { /* ignore */ }
    }

    this.broadcast('tts:download-progress', { percent: 0, label: 'Preparando instalación...' })

    // Import kokoro-js first — fail fast if module is broken
    let KokoroTTS: KokoroTTSInstance
    try {
      this.broadcast('tts:download-progress', { percent: 2, label: 'Cargando motor TTS...' })
      const mod = await import('kokoro-js')
      KokoroTTS = mod.KokoroTTS
    } catch (importErr) {
      const msg = importErr instanceof Error ? importErr.message : String(importErr)
      console.error('Failed to import kokoro-js:', msg)
      this.broadcast('tts:download-progress', { percent: 0, label: '' })
      throw new Error(`No se pudo cargar el motor TTS: ${msg}`)
    }

    const attemptInstall = async (label: string): Promise<void> => {
      this.ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: 'cpu',
        cache_dir: this.modelDir,
        progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            this.broadcast('tts:download-progress', {
              percent: Math.max(5, Math.round(progress.progress)),
              label
            })
          } else if (progress.status === 'initiate') {
            this.broadcast('tts:download-progress', {
              percent: 3,
              label: `Descargando ${progress.file ? progress.file.split('/').pop() : ''}...`
            })
          } else if (progress.status === 'download') {
            this.broadcast('tts:download-progress', {
              percent: 5,
              label: `Descargando ${progress.file ? progress.file.split('/').pop() : 'modelo'}...`
            })
          }
        }
      })
    }

    try {
      await attemptInstall('Descargando modelo TTS...')
    } catch (err) {
      // First attempt failed — wipe cache and retry once
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Kokoro install failed, wiping cache and retrying:', msg)
      this.ttsInstance = null

      try {
        rmSync(this.modelDir, { recursive: true, force: true })
        mkdirSync(this.modelDir, { recursive: true })
      } catch { /* ignore cleanup errors */ }

      this.broadcast('tts:download-progress', { percent: 0, label: 'Reintentando descarga...' })

      try {
        await attemptInstall('Reintentando descarga...')
      } catch (retryErr) {
        this.ttsInstance = null
        this.broadcast('tts:download-progress', { percent: 0, label: '' })
        throw retryErr
      }
    }

    writeFileSync(join(this.modelDir, MARKER_FILE), 'ok')
    this.broadcast('tts:download-progress', { percent: 100, label: 'Kokoro TTS listo!' })
  }

  async ensureLoaded(): Promise<KokoroTTSInstance> {
    if (this.ttsInstance) return this.ttsInstance

    // Prevent concurrent loads
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = (async () => {
      try {
        this.broadcast('tts:download-progress', { percent: 5, label: 'Cargando motor TTS...' })

        let KokoroTTS: KokoroTTSInstance
        try {
          const mod = await import('kokoro-js')
          KokoroTTS = mod.KokoroTTS
        } catch (importErr) {
          const msg = importErr instanceof Error ? importErr.message : String(importErr)
          console.error('Failed to import kokoro-js:', msg)
          this.broadcast('tts:error', {
            message: `No se pudo cargar el motor TTS: ${msg}`,
            code: 'IMPORT_ERROR'
          })
          throw new Error(`No se pudo cargar kokoro-js: ${msg}`)
        }

        this.broadcast('tts:download-progress', { percent: 15, label: 'Cargando modelo...' })

        this.ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: 'q8',
          device: 'cpu',
          cache_dir: this.modelDir,
          progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
            if (progress.status === 'progress' && typeof progress.progress === 'number') {
              // Map 0-100 of file progress to 15-95 range for overall progress
              const mapped = 15 + Math.round(progress.progress * 0.8)
              this.broadcast('tts:download-progress', {
                percent: mapped,
                label: 'Cargando modelo...'
              })
            } else if (progress.status === 'initiate') {
              this.broadcast('tts:download-progress', {
                percent: 10,
                label: `Preparando ${progress.file ? progress.file.split('/').pop() : 'archivos'}...`
              })
            }
          }
        })

        if (!this.isInstalled()) {
          writeFileSync(join(this.modelDir, MARKER_FILE), 'ok')
        }

        this.broadcast('tts:download-progress', { percent: 100, label: 'TTS listo!' })
        return this.ttsInstance
      } catch (err) {
        // ENOTDIR or corrupted cache — wipe and retry once
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('ENOTDIR') || msg.includes('ENOENT') || msg.includes('corrupt')) {
          console.warn('Kokoro cache corrupted, wiping and retrying...', msg)
          try {
            rmSync(this.modelDir, { recursive: true, force: true })
            mkdirSync(this.modelDir, { recursive: true })
          } catch { /* ignore cleanup errors */ }

          this.broadcast('tts:download-progress', { percent: 0, label: 'Re-descargando modelo TTS...' })
          const { KokoroTTS } = await import('kokoro-js')

          this.ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, {
            dtype: 'q8',
            device: 'cpu',
            cache_dir: this.modelDir,
            progress_callback: (progress: { status: string; progress?: number }) => {
              if (progress.status === 'progress' && typeof progress.progress === 'number') {
                this.broadcast('tts:download-progress', {
                  percent: Math.round(progress.progress),
                  label: 'Re-descargando modelo TTS...'
                })
              }
            }
          })

          writeFileSync(join(this.modelDir, MARKER_FILE), 'ok')
          this.broadcast('tts:download-progress', { percent: 100, label: 'TTS listo!' })
          return this.ttsInstance
        }

        // Broadcast the error so the renderer knows
        this.broadcast('tts:download-progress', { percent: 0, label: '' })
        throw err
      } finally {
        this.loadingPromise = null
      }
    })()

    return this.loadingPromise
  }

  async downloadVoice(_voiceId: string): Promise<void> {
    // No-op — all voices are bundled in the model
  }

  private broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}
