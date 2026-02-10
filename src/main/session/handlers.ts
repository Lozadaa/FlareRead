import { ipcMain, BrowserWindow } from 'electron'
import { getSessionManager, SessionConfig } from './StudySessionManager'
import { getFocusWallManager } from '../focuswall/FocusWallManager'
import { getDatabase } from '../database'

export function registerSessionHandlers(): void {
  const manager = getSessionManager()

  // Close focus walls when session ends for any reason (AFK timeout, etc.)
  manager.onSessionEnd(() => {
    try {
      getFocusWallManager().closeWalls()
    } catch {
      // Ignore
    }
  })

  // Start a study session
  ipcMain.handle(
    'session:start',
    (_e, config: Partial<SessionConfig> & { bookId: string }) => {
      const snapshot = manager.start(config)

      // Open focus walls on secondary displays and fullscreen main window
      try {
        const fwManager = getFocusWallManager()
        const db = getDatabase()
        const book = db.prepare('SELECT title, author FROM books WHERE id = ?').get(config.bookId) as
          | { title: string; author: string | null }
          | undefined

        const goalMinutes = config.pomodoroEnabled !== false
          ? (config.workMinutes || 25)
          : 45 // default goal for free sessions

        // Get the main window — use multiple fallbacks for reliability
        const mainWindow =
          BrowserWindow.fromWebContents(_e.sender) ??
          BrowserWindow.getFocusedWindow() ??
          BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ??
          null

        fwManager.openWalls(
          {
            bookTitle: book?.title || 'Reading',
            bookAuthor: book?.author || null,
            sessionGoalMinutes: goalMinutes
          },
          mainWindow
        )
      } catch (err) {
        console.error('Failed to open focus walls:', err)
      }

      return snapshot
    }
  )

  // Stop the current session
  // Focus walls are closed automatically via the onSessionEnd callback above
  ipcMain.handle('session:stop', () => {
    return manager.stop()
  })

  // Report user activity (mouse/keyboard) for AFK detection
  ipcMain.on('session:activity', () => {
    manager.reportActivity()
  })

  // User confirms presence after AFK modal
  ipcMain.handle('session:confirm-presence', () => {
    manager.confirmPresence()
    return manager.getSnapshot()
  })

  // User didn't respond to AFK modal
  ipcMain.handle('session:afk-timeout', () => {
    manager.dismissAfkTimeout()
    return manager.getSnapshot()
  })

  // Skip the current break
  ipcMain.handle('session:skip-break', () => {
    manager.skipBreak()
    return manager.getSnapshot()
  })

  // Get current session state
  ipcMain.handle('session:get-state', () => {
    if (!manager.isActive()) return null
    return manager.getSnapshot()
  })

  // Get wrap-up data (stats + top highlights)
  ipcMain.handle('session:get-wrapup', () => {
    return manager.getWrapUpData()
  })

  // Increment session metrics (called when highlight/note created during session)
  ipcMain.on('session:increment-highlight', () => {
    manager.incrementHighlights()
  })

  ipcMain.on('session:increment-note', () => {
    manager.incrementNotes()
  })

  // ─── Microbreak handlers ────────────────────────────
  ipcMain.on('session:microbreak-take', () => {
    manager.microbreakTake()
  })

  ipcMain.on('session:microbreak-end', () => {
    manager.microbreakEnd()
  })

  ipcMain.on('session:microbreak-postpone', () => {
    manager.microbreakPostpone()
  })

  ipcMain.on('session:microbreak-disable-today', () => {
    manager.microbreakDisableToday()
  })
}
