import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, chmodSync, unlinkSync, createReadStream, writeFileSync } from 'fs'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import { Readable } from 'stream'

export interface VoiceInfo {
  id: string
  name: string
  language: string
  quality: string
  modelUrl: string
  configUrl: string
  sizeBytes: number
}

// Available voices — can be extended
const VOICES: VoiceInfo[] = [
  {
    id: 'en_US-amy-medium',
    name: 'Amy (US)',
    language: 'en',
    quality: 'medium',
    modelUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx',
    configUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json',
    sizeBytes: 16_000_000
  },
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac (US)',
    language: 'en',
    quality: 'medium',
    modelUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
    configUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json',
    sizeBytes: 16_000_000
  },
  {
    id: 'en_GB-alba-medium',
    name: 'Alba (UK)',
    language: 'en',
    quality: 'medium',
    modelUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx',
    configUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json',
    sizeBytes: 16_000_000
  },
  {
    id: 'es_ES-davefx-medium',
    name: 'Dave (ES)',
    language: 'es',
    quality: 'medium',
    modelUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx',
    configUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json',
    sizeBytes: 16_000_000
  },
  {
    id: 'es_MX-ald-medium',
    name: 'Ald (MX)',
    language: 'es',
    quality: 'medium',
    modelUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx',
    configUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx.json',
    sizeBytes: 16_000_000
  }
]

// Piper binary release info per platform
function getPiperDownloadUrl(): { url: string; isArchive: boolean; archiveType: 'tar.gz' | 'zip' } {
  const platform = process.platform
  const arch = process.arch

  // Use Piper release v2023.11.14-2 as stable reference
  const version = '2023.11.14-2'
  const base = `https://github.com/rhasspy/piper/releases/download/${version}`

  if (platform === 'win32') {
    return { url: `${base}/piper_windows_amd64.zip`, isArchive: true, archiveType: 'zip' }
  } else if (platform === 'darwin') {
    const archSuffix = arch === 'arm64' ? 'aarch64' : 'x64'
    return { url: `${base}/piper_macos_${archSuffix}.tar.gz`, isArchive: true, archiveType: 'tar.gz' }
  } else {
    const archSuffix = arch === 'arm64' ? 'aarch64' : 'x86_64'
    return { url: `${base}/piper_linux_${archSuffix}.tar.gz`, isArchive: true, archiveType: 'tar.gz' }
  }
}

export class PiperManager {
  private baseDir: string
  private piperDir: string
  private voicesDir: string

  constructor() {
    this.baseDir = join(app.getPath('userData'), 'tts')
    this.piperDir = join(this.baseDir, 'piper')
    this.voicesDir = join(this.baseDir, 'voices')
    mkdirSync(this.piperDir, { recursive: true })
    mkdirSync(this.voicesDir, { recursive: true })
  }

  /**
   * Get the path to the Piper binary.
   */
  getBinaryPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : ''
    return join(this.piperDir, `piper${ext}`)
  }

  /**
   * Check if Piper binary is installed.
   */
  isInstalled(): boolean {
    return existsSync(this.getBinaryPath())
  }

  /**
   * Check if Piper binary AND at least one voice are ready to use.
   */
  isReady(): boolean {
    if (!this.isInstalled()) return false
    return VOICES.some((v) => this.isVoiceInstalled(v.id))
  }

  /**
   * Get model path for a voice.
   */
  getModelPath(voiceId: string): string {
    return join(this.voicesDir, `${voiceId}.onnx`)
  }

  /**
   * Get config path for a voice.
   */
  getConfigPath(voiceId: string): string {
    return join(this.voicesDir, `${voiceId}.onnx.json`)
  }

  /**
   * Check if a voice model is installed.
   */
  isVoiceInstalled(voiceId: string): boolean {
    return existsSync(this.getModelPath(voiceId)) && existsSync(this.getConfigPath(voiceId))
  }

  /**
   * Get all available voices with install status.
   */
  getVoices(): Array<VoiceInfo & { installed: boolean }> {
    return VOICES.map((v) => ({
      ...v,
      installed: this.isVoiceInstalled(v.id)
    }))
  }

  /**
   * Download and install the Piper binary.
   */
  async installBinary(): Promise<void> {
    if (this.isInstalled()) return

    const { url, archiveType } = getPiperDownloadUrl()
    const tmpFile = join(this.baseDir, `piper-download.${archiveType}`)

    this.broadcast('tts:download-progress', { percent: 0, label: 'Downloading Piper TTS...' })

    await this.downloadFile(url, tmpFile)

    this.broadcast('tts:download-progress', { percent: 80, label: 'Extracting Piper...' })

    await this.extractArchive(tmpFile, this.baseDir, archiveType)

    // Clean up downloaded archive
    try {
      unlinkSync(tmpFile)
    } catch {
      // Non-critical
    }

    // Make binary executable on Unix
    if (process.platform !== 'win32') {
      try {
        chmodSync(this.getBinaryPath(), 0o755)
      } catch {
        // Non-critical
      }
    }

    this.broadcast('tts:download-progress', { percent: 100, label: 'Piper installed!' })
  }

  /**
   * Download a voice model.
   */
  async downloadVoice(voiceId: string): Promise<void> {
    const voice = VOICES.find((v) => v.id === voiceId)
    if (!voice) throw new Error(`Unknown voice: ${voiceId}`)
    if (this.isVoiceInstalled(voiceId)) return

    this.broadcast('tts:download-progress', { percent: 0, label: `Downloading voice ${voice.name}...` })

    // Download model file
    await this.downloadFile(voice.modelUrl, this.getModelPath(voiceId))

    this.broadcast('tts:download-progress', { percent: 80, label: 'Downloading voice config...' })

    // Download config file
    await this.downloadFile(voice.configUrl, this.getConfigPath(voiceId))

    this.broadcast('tts:download-progress', { percent: 100, label: `Voice ${voice.name} ready!` })
  }

  /**
   * Full install: binary + default voice.
   */
  async install(): Promise<void> {
    await this.installBinary()
    await this.downloadVoice('en_US-amy-medium')
  }

  // ─── Private ───────────────────────────────────────

  private broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`)
    }
    if (!response.body) {
      throw new Error('Download failed: empty response body')
    }
    const nodeStream = Readable.fromWeb(response.body as import('stream/web').ReadableStream)
    const file = createWriteStream(destPath)
    await pipeline(nodeStream, file)
  }

  private async extractArchive(
    archivePath: string,
    destDir: string,
    type: 'tar.gz' | 'zip'
  ): Promise<void> {
    if (type === 'tar.gz') {
      await this.extractTarGz(archivePath, destDir)
    } else {
      await this.extractZip(archivePath, destDir)
    }
  }

  private async extractTarGz(archivePath: string, destDir: string): Promise<void> {
    const tar = await import('tar')
    await pipeline(
      createReadStream(archivePath),
      createGunzip(),
      tar.extract({ cwd: destDir })
    )
  }

  private async extractZip(archivePath: string, destDir: string): Promise<void> {
    // Use Node's built-in approach with yauzl or fallback to child_process
    const { execSync } = await import('child_process')

    if (process.platform === 'win32') {
      // Use PowerShell to extract on Windows
      execSync(
        `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`,
        { stdio: 'ignore' }
      )
    } else {
      execSync(`unzip -o "${archivePath}" -d "${destDir}"`, { stdio: 'ignore' })
    }
  }
}
