import { app } from 'electron'
import { join } from 'path'
import { createHash } from 'crypto'
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync
} from 'fs'

interface CacheEntry {
  key: string
  file: string
  sizeBytes: number
  accessedAt: number
}

interface CacheManifest {
  entries: CacheEntry[]
  totalBytes: number
}

const MAX_CACHE_BYTES = 500 * 1024 * 1024 // 500MB default

export class TtsCache {
  private cacheDir: string
  private manifestPath: string
  private manifest: CacheManifest

  constructor() {
    this.cacheDir = join(app.getPath('userData'), 'tts-cache')
    this.manifestPath = join(this.cacheDir, 'manifest.json')

    mkdirSync(this.cacheDir, { recursive: true })
    this.manifest = this.loadManifest()
  }

  /**
   * Generate a cache key for a chunk.
   */
  static makeKey(
    bookId: string,
    chapterHref: string,
    voiceId: string,
    rate: number,
    chunkIndex: number,
    chunkText: string
  ): string {
    const input = `${bookId}|${chapterHref}|${voiceId}|${rate}|${chunkIndex}|${chunkText}`
    return createHash('sha256').update(input).digest('hex').slice(0, 16)
  }

  /**
   * Get cached WAV file path if it exists.
   */
  get(key: string): string | null {
    const entry = this.manifest.entries.find((e) => e.key === key)
    if (!entry) return null

    const filePath = join(this.cacheDir, entry.file)
    if (!existsSync(filePath)) {
      // File was deleted externally; clean up manifest
      this.manifest.entries = this.manifest.entries.filter((e) => e.key !== key)
      this.recalcTotal()
      this.saveManifest()
      return null
    }

    // Update access time for LRU
    entry.accessedAt = Date.now()
    this.saveManifest()
    return filePath
  }

  /**
   * Store a WAV file in the cache and return its path.
   */
  put(key: string, wavBuffer: Buffer): string {
    const fileName = `${key}.wav`
    const filePath = join(this.cacheDir, fileName)

    writeFileSync(filePath, wavBuffer)

    // Remove existing entry if overwriting
    this.manifest.entries = this.manifest.entries.filter((e) => e.key !== key)

    this.manifest.entries.push({
      key,
      file: fileName,
      sizeBytes: wavBuffer.length,
      accessedAt: Date.now()
    })

    this.recalcTotal()

    // Evict LRU entries if over budget
    this.evict()

    this.saveManifest()
    return filePath
  }

  /**
   * Get the local-file:// URL for a cached WAV.
   */
  getUrl(filePath: string): string {
    return 'local-file:///' + filePath.replace(/\\/g, '/')
  }

  /**
   * Clear entire cache. Returns freed bytes.
   */
  clear(): number {
    const freed = this.manifest.totalBytes

    for (const entry of this.manifest.entries) {
      const filePath = join(this.cacheDir, entry.file)
      try {
        if (existsSync(filePath)) unlinkSync(filePath)
      } catch {
        // Ignore individual file deletion errors
      }
    }

    this.manifest = { entries: [], totalBytes: 0 }
    this.saveManifest()
    return freed
  }

  /**
   * Get cache stats.
   */
  getStats(): { totalBytes: number; fileCount: number; maxBytes: number } {
    return {
      totalBytes: this.manifest.totalBytes,
      fileCount: this.manifest.entries.length,
      maxBytes: MAX_CACHE_BYTES
    }
  }

  // ─── Private ───────────────────────────────────────

  private loadManifest(): CacheManifest {
    try {
      if (existsSync(this.manifestPath)) {
        const data = JSON.parse(readFileSync(this.manifestPath, 'utf-8'))
        if (data && Array.isArray(data.entries)) {
          return data as CacheManifest
        }
      }
    } catch {
      // Corrupted manifest — start fresh
    }
    return { entries: [], totalBytes: 0 }
  }

  private saveManifest(): void {
    try {
      writeFileSync(this.manifestPath, JSON.stringify(this.manifest), 'utf-8')
    } catch {
      // Non-critical
    }
  }

  private recalcTotal(): void {
    this.manifest.totalBytes = this.manifest.entries.reduce((sum, e) => sum + e.sizeBytes, 0)
  }

  private evict(): void {
    while (this.manifest.totalBytes > MAX_CACHE_BYTES && this.manifest.entries.length > 0) {
      // Sort by accessedAt ascending (oldest first)
      this.manifest.entries.sort((a, b) => a.accessedAt - b.accessedAt)
      const oldest = this.manifest.entries.shift()!
      const filePath = join(this.cacheDir, oldest.file)
      try {
        if (existsSync(filePath)) unlinkSync(filePath)
      } catch {
        // Ignore
      }
      this.recalcTotal()
    }
  }
}
