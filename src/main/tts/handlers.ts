import { ipcMain } from 'electron'
import { getTtsService } from './TtsService'
import { getSessionManager } from '../session/StudySessionManager'

export function registerTtsHandlers(): void {
  const tts = getTtsService()

  // ─── Request-Response Handlers ─────────────────────

  ipcMain.handle('tts:speak', async (_e, params) => {
    return tts.speak(params)
  })

  ipcMain.handle('tts:pause', () => {
    return tts.pause()
  })

  ipcMain.handle('tts:resume', () => {
    return tts.resume()
  })

  ipcMain.handle('tts:stop', () => {
    return tts.stop()
  })

  ipcMain.handle('tts:next-chunk', async () => {
    return tts.nextChunk()
  })

  ipcMain.handle('tts:prev-chunk', async () => {
    return tts.prevChunk()
  })

  ipcMain.handle('tts:set-voice', async (_e, voiceId: string) => {
    return tts.setVoice(voiceId)
  })

  ipcMain.handle('tts:set-rate', async (_e, rate: number) => {
    return tts.setRate(rate)
  })

  ipcMain.handle('tts:get-status', () => {
    return tts.getSnapshot()
  })

  ipcMain.handle('tts:get-voices', () => {
    return tts.getKokoroManager().getVoices()
  })

  ipcMain.handle('tts:is-installed', () => {
    return tts.getKokoroManager().isReady()
  })

  ipcMain.handle('tts:install', async () => {
    try {
      await tts.getKokoroManager().install()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tts:download-voice', async (_e, voiceId: string) => {
    try {
      await tts.getKokoroManager().downloadVoice(voiceId)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tts:clear-cache', () => {
    const freedBytes = tts.getCache().clear()
    return { success: true, freedBytes }
  })

  // ─── Session Integration ───────────────────────────

  const sessionManager = getSessionManager()

  // Track whether TTS was paused by session (AFK/break)
  let pausedBySession = false

  // Anti-AFK: while TTS is speaking, periodically report activity
  let antiAfkInterval: ReturnType<typeof setInterval> | null = null

  tts.onStateChange((ttsState) => {
    if (ttsState === 'speaking') {
      // Start anti-AFK reporting (user is listening)
      if (!antiAfkInterval && sessionManager.isActive()) {
        antiAfkInterval = setInterval(() => {
          if (tts.isSpeaking() && sessionManager.isActive()) {
            sessionManager.reportActivity()
          } else {
            clearInterval(antiAfkInterval!)
            antiAfkInterval = null
          }
        }, 30000) // Every 30 seconds
      }
    } else {
      // Stop anti-AFK when not speaking
      if (antiAfkInterval) {
        clearInterval(antiAfkInterval)
        antiAfkInterval = null
      }
    }
  })

  // Listen for session state changes to pause/resume TTS
  let sessionWatchInterval: ReturnType<typeof setInterval> | null = null
  let lastSessionState: string | null = null

  function startSessionWatch(): void {
    if (sessionWatchInterval) return
    sessionWatchInterval = setInterval(() => {
      if (!tts.isSpeaking() && tts.getState() !== 'paused') {
        stopSessionWatch()
        return
      }

      if (!sessionManager.isActive()) {
        // Session ended — stop TTS
        if (tts.getState() !== 'idle') {
          tts.stop()
          pausedBySession = false
        }
        stopSessionWatch()
        return
      }

      const snapshot = sessionManager.getSnapshot()
      const currentState = snapshot.state

      if (currentState !== lastSessionState) {
        const prevState = lastSessionState
        lastSessionState = currentState

        if (currentState === 'paused_afk' || currentState === 'break') {
          // Pause TTS during AFK or break
          if (tts.isSpeaking()) {
            tts.pause()
            pausedBySession = true
          }
        } else if (currentState === 'running' && prevState && (prevState === 'paused_afk' || prevState === 'break')) {
          // Resume TTS when session resumes
          if (pausedBySession && tts.getState() === 'paused') {
            tts.resume()
            pausedBySession = false
          }
        }
      }
    }, 1000)
  }

  function stopSessionWatch(): void {
    if (sessionWatchInterval) {
      clearInterval(sessionWatchInterval)
      sessionWatchInterval = null
    }
    lastSessionState = null
  }

  // Start session watch when TTS starts speaking
  tts.onStateChange((state) => {
    if (state === 'speaking' && sessionManager.isActive()) {
      lastSessionState = sessionManager.getSnapshot().state
      startSessionWatch()
    }
  })
}
