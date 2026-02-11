import { useState, useEffect, useCallback, useRef } from 'react'
import { TtsSnapshot, TtsVoice, TextChunk, TtsRate } from '@/types'
import { extractChapterText, cleanTextForTts, chunkText } from '@/lib/chunker'

const STORAGE_KEY_VOICE = 'flareread-tts-voice'
const STORAGE_KEY_RATE = 'flareread-tts-rate'
const STORAGE_KEY_VOLUME = 'flareread-tts-volume'

export interface UseTtsReturn {
  snapshot: TtsSnapshot | null
  voices: TtsVoice[]
  installed: boolean | null
  installing: boolean
  downloadProgress: { percent: number; label: string } | null
  error: string | null
  volume: number
  currentChunkText: string | null

  // Actions
  speakChapter: (bookId: string, chapterHref: string, rendition: unknown, startChunkIndex?: number) => Promise<void>
  speakFromText: (bookId: string, chapterHref: string, text: string, startChunkIndex?: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  nextChunk: () => Promise<void>
  prevChunk: () => Promise<void>
  setVoice: (voiceId: string) => Promise<void>
  setRate: (rate: TtsRate) => Promise<void>
  setVolume: (volume: number) => void
  install: () => Promise<void>
  downloadVoice: (voiceId: string) => Promise<void>
  clearCache: () => Promise<void>
  refreshVoices: () => Promise<void>
}

export function useTts(): UseTtsReturn {
  const [snapshot, setSnapshot] = useState<TtsSnapshot | null>(null)
  const [voices, setVoices] = useState<TtsVoice[]>([])
  const [installed, setInstalled] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_VOLUME)
    return stored ? parseFloat(stored) : 1.0
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentChunkRef = useRef<number>(-1)
  const chunksRef = useRef<TextChunk[]>([])
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  // Initialize: check install status and load voices
  useEffect(() => {
    // Migrate old Piper voice IDs to default Kokoro voice
    const savedVoice = localStorage.getItem(STORAGE_KEY_VOICE)
    if (savedVoice && savedVoice.includes('-')) {
      // Old Piper voice IDs use hyphens (e.g. "en_US-amy-medium"), Kokoro uses underscores (e.g. "af_heart")
      localStorage.removeItem(STORAGE_KEY_VOICE)
    }

    window.ttsApi.isInstalled().then(setInstalled)
    window.ttsApi.getVoices().then((v) => setVoices(v as TtsVoice[]))
    window.ttsApi.getStatus().then((s) => {
      const snap = s as TtsSnapshot
      if (snap && snap.state !== 'idle') setSnapshot(snap)
    })
  }, [])

  // Play a WAV url using HTMLAudioElement
  const playWav = useCallback((wavUrl: string, chunkIndex: number) => {
    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    const audio = new Audio(wavUrl)
    audio.volume = volumeRef.current
    audioRef.current = audio
    currentChunkRef.current = chunkIndex

    audio.onended = () => {
      // Auto-advance to next chunk
      window.ttsApi.nextChunk()
    }

    audio.onerror = () => {
      console.error('TTS audio error:', wavUrl, audio.error)
      setError('Failed to play audio')
      setTimeout(() => setError(null), 3000)
    }

    audio.play().catch((err) => {
      console.error('TTS play() rejected:', err)
      setError('Audio playback blocked — click play to retry')
    })
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const cleanups = [
      window.ttsApi.onStateUpdate((snap) => {
        setSnapshot(snap as TtsSnapshot)
      }),
      window.ttsApi.onChunkReady((data) => {
        playWav(data.wavUrl, data.chunkIndex)
      }),
      window.ttsApi.onDownloadProgress((data) => {
        setDownloadProgress(data)
        if (data.percent >= 100) {
          setTimeout(() => setDownloadProgress(null), 2000)
        }
      }),
      window.ttsApi.onError((data) => {
        setError(data.message)
        setTimeout(() => setError(null), 5000)
      })
    ]

    return () => cleanups.forEach((fn) => fn())
  }, [playWav])

  // Update audio volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume))
  }, [volume])

  // Handle pause/resume by controlling the audio element
  useEffect(() => {
    if (!audioRef.current) return

    if (snapshot?.state === 'paused') {
      audioRef.current.pause()
    } else if (snapshot?.state === 'speaking' && audioRef.current.paused && audioRef.current.src) {
      audioRef.current.play().catch(() => {})
    }
  }, [snapshot?.state])

  // Stop audio when TTS goes idle
  useEffect(() => {
    if (snapshot?.state === 'idle' && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }, [snapshot?.state])

  // ─── Actions ───────────────────────────────────────

  const speakChapter = useCallback(async (
    bookId: string,
    chapterHref: string,
    rendition: unknown,
    startChunkIndex?: number
  ) => {
    setError(null)
    // Re-check actual install status from main process (self-heal stale state)
    const actuallyInstalled = await window.ttsApi.isInstalled()
    if (!actuallyInstalled) {
      setInstalled(false)
      return
    }
    const raw = extractChapterText(rendition)
    if (!raw.trim()) {
      setError('No readable text found in this chapter')
      return
    }
    const clean = cleanTextForTts(raw)
    const chunks = chunkText(clean)
    if (chunks.length === 0) {
      setError('No text to read')
      return
    }
    chunksRef.current = chunks

    const savedVoice = localStorage.getItem(STORAGE_KEY_VOICE) || undefined
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE)
    const rate = savedRate ? parseFloat(savedRate) : undefined

    await window.ttsApi.speak({
      bookId,
      chapterHref,
      chunks,
      startChunkIndex,
      voiceId: savedVoice,
      rate
    })
  }, [])

  const speakFromText = useCallback(async (
    bookId: string,
    chapterHref: string,
    text: string,
    startChunkIndex?: number
  ) => {
    setError(null)
    // Re-check actual install status from main process (self-heal stale state)
    const actuallyInstalled = await window.ttsApi.isInstalled()
    if (!actuallyInstalled) {
      setInstalled(false)
      return
    }
    const clean = cleanTextForTts(text)
    const chunks = chunkText(clean)
    if (chunks.length === 0) {
      setError('No text to read')
      return
    }
    chunksRef.current = chunks

    const savedVoice = localStorage.getItem(STORAGE_KEY_VOICE) || undefined
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE)
    const rate = savedRate ? parseFloat(savedRate) : undefined

    await window.ttsApi.speak({
      bookId,
      chapterHref,
      chunks,
      startChunkIndex,
      voiceId: savedVoice,
      rate
    })
  }, [])

  const pause = useCallback(async () => {
    await window.ttsApi.pause()
  }, [])

  const resume = useCallback(async () => {
    await window.ttsApi.resume()
  }, [])

  const stop = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    chunksRef.current = []
    await window.ttsApi.stop()
  }, [])

  const nextChunk = useCallback(async () => {
    await window.ttsApi.nextChunk()
  }, [])

  const prevChunk = useCallback(async () => {
    await window.ttsApi.prevChunk()
  }, [])

  const setVoice = useCallback(async (voiceId: string) => {
    localStorage.setItem(STORAGE_KEY_VOICE, voiceId)
    await window.ttsApi.setVoice(voiceId)
  }, [])

  const setRate = useCallback(async (rate: TtsRate) => {
    localStorage.setItem(STORAGE_KEY_RATE, String(rate))
    await window.ttsApi.setRate(rate)
  }, [])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
  }, [])

  const installTts = useCallback(async () => {
    setInstalling(true)
    setError(null)
    try {
      const result = await window.ttsApi.install() as { success: boolean; error?: string }
      if (!result?.success) {
        throw new Error(result?.error || 'Unknown install error')
      }
      setInstalled(true)
      // Refresh voices after install
      const v = await window.ttsApi.getVoices()
      setVoices(v as TtsVoice[])
    } catch (err) {
      setInstalled(false)
      setError(`Installation failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setInstalling(false)
    }
  }, [])

  const downloadVoice = useCallback(async (voiceId: string) => {
    setError(null)
    try {
      const result = await window.ttsApi.downloadVoice(voiceId) as { success: boolean; error?: string }
      if (!result?.success) {
        throw new Error(result?.error || 'Unknown download error')
      }
      const v = await window.ttsApi.getVoices()
      setVoices(v as TtsVoice[])
    } catch (err) {
      setError(`Voice download failed: ${err instanceof Error ? err.message : err}`)
    }
  }, [])

  const clearCache = useCallback(async () => {
    await window.ttsApi.clearCache()
  }, [])

  const refreshVoices = useCallback(async () => {
    const v = await window.ttsApi.getVoices()
    setVoices(v as TtsVoice[])
  }, [])

  const currentChunkText =
    snapshot && snapshot.state !== 'idle' && snapshot.currentChunkIndex < chunksRef.current.length
      ? chunksRef.current[snapshot.currentChunkIndex]?.text ?? null
      : null

  return {
    snapshot,
    voices,
    installed,
    installing,
    downloadProgress,
    error,
    volume,
    currentChunkText,
    speakChapter,
    speakFromText,
    pause,
    resume,
    stop,
    nextChunk,
    prevChunk,
    setVoice,
    setRate,
    setVolume,
    install: installTts,
    downloadVoice,
    clearCache,
    refreshVoices
  }
}
