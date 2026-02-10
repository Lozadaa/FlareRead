import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getDatabase } from '../database'

export interface FocusWallSettings {
  enabled: boolean
  preset: 'minimal' | 'gradient' | 'monochrome' | 'illustration'
  showTitle: boolean
  showTimer: boolean
  showProgress: boolean
  showMetric: boolean
  metric: 'wpm' | 'pagesPerHour'
}

export const DEFAULT_FOCUS_WALL_SETTINGS: FocusWallSettings = {
  enabled: true,
  preset: 'minimal',
  showTitle: true,
  showTimer: true,
  showProgress: true,
  showMetric: true,
  metric: 'wpm'
}

export interface FocusWallSessionData {
  bookTitle: string
  bookAuthor: string | null
  sessionGoalMinutes: number
}

export class FocusWallManager {
  private windows: BrowserWindow[] = []
  private sessionData: FocusWallSessionData | null = null
  private settings: FocusWallSettings = DEFAULT_FOCUS_WALL_SETTINGS
  private mainWindowWasFullscreen = false
  private mainWindowRef: BrowserWindow | null = null

  constructor() {
    this.loadSettings()
  }

  /** Load settings from the database */
  loadSettings(): void {
    try {
      const db = getDatabase()
      const row = db.prepare("SELECT value FROM settings WHERE key = 'focusWall'").get() as
        | { value: string }
        | undefined
      if (row) {
        this.settings = { ...DEFAULT_FOCUS_WALL_SETTINGS, ...JSON.parse(row.value) }
      }
    } catch {
      // Use defaults if DB unavailable
    }
  }

  /** Save settings to the database */
  saveSettings(settings: Partial<FocusWallSettings>): void {
    this.settings = { ...this.settings, ...settings }
    try {
      const db = getDatabase()
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('focusWall', ?) ON CONFLICT(key) DO UPDATE SET value = ?"
      ).run(JSON.stringify(this.settings), JSON.stringify(this.settings))
    } catch (err) {
      console.error('Failed to save focus wall settings:', err)
    }
  }

  getSettings(): FocusWallSettings {
    return { ...this.settings }
  }

  /** Open focus wall windows on all secondary displays and fullscreen the main window */
  openWalls(sessionData: FocusWallSessionData, mainWindow?: BrowserWindow | null): void {
    if (!this.settings.enabled) return

    this.sessionData = sessionData
    this.closeWalls()

    // Set the main window to fullscreen on the primary display
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.mainWindowWasFullscreen = mainWindow.isFullScreen()
      this.mainWindowRef = mainWindow
      if (!mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(true)
      }
      mainWindow.focus()
    }

    // Create focus walls on all secondary displays
    const displays = screen.getAllDisplays()
    const primary = screen.getPrimaryDisplay()
    const secondaryDisplays = displays.filter((d) => d.id !== primary.id)

    for (const display of secondaryDisplays) {
      const win = this.createFocusWallWindow(display)
      this.windows.push(win)
    }
  }

  /** Close all focus wall windows and restore main window */
  closeWalls(): void {
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.close()
      }
    }
    this.windows = []
    this.sessionData = null

    // Restore the main window's previous fullscreen state
    if (this.mainWindowRef && !this.mainWindowRef.isDestroyed()) {
      if (!this.mainWindowWasFullscreen && this.mainWindowRef.isFullScreen()) {
        this.mainWindowRef.setFullScreen(false)
      }
    }
    this.mainWindowRef = null
    this.mainWindowWasFullscreen = false
  }

  /** Send settings update to all focus wall windows */
  broadcastSettings(): void {
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('focuswall:settings-update', this.settings)
      }
    }
  }

  /** Send session data to all focus wall windows */
  broadcastSessionData(): void {
    if (!this.sessionData) return
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('focuswall:session-data', this.sessionData)
      }
    }
  }

  /** Get the IDs of focus wall windows (to distinguish from main window) */
  getWindowIds(): number[] {
    return this.windows.filter((w) => !w.isDestroyed()).map((w) => w.id)
  }

  isOpen(): boolean {
    return this.windows.some((w) => !w.isDestroyed())
  }

  private createFocusWallWindow(display: Electron.Display): BrowserWindow {
    const { x, y, width, height } = display.bounds

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      fullscreen: true,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      backgroundColor: '#000000',
      webPreferences: {
        preload: join(__dirname, '../preload/focuswall.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    win.once('ready-to-show', () => {
      win.show()
      // Send initial data after showing
      if (this.sessionData) {
        win.webContents.send('focuswall:session-data', this.sessionData)
      }
      win.webContents.send('focuswall:settings-update', this.settings)
    })

    // Clean up reference when window is closed
    win.on('closed', () => {
      this.windows = this.windows.filter((w) => w !== win)
    })

    // Load the focus wall renderer
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/focuswall.html`)
    } else {
      win.loadFile(join(__dirname, '../renderer/focuswall.html'))
    }

    return win
  }

  destroy(): void {
    this.closeWalls()
  }
}

// Singleton
let instance: FocusWallManager | null = null

export function getFocusWallManager(): FocusWallManager {
  if (!instance) {
    instance = new FocusWallManager()
  }
  return instance
}
