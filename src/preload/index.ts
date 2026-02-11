import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // ─── Books ───────────────────────────────────────────
  books: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:books:getAll'),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('db:books:getById', id),
    create: (data: {
      title: string
      author?: string
      cover_path?: string
      file_path: string
      total_words_estimate?: number
    }): Promise<unknown> => ipcRenderer.invoke('db:books:create', data),
    update: (id: string, data: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('db:books:update', id, data),
    delete: (id: string): Promise<unknown> => ipcRenderer.invoke('db:books:delete', id)
  },

  // ─── Reading Progress ────────────────────────────────
  progress: {
    get: (bookId: string): Promise<unknown> => ipcRenderer.invoke('db:progress:get', bookId),
    upsert: (data: {
      book_id: string
      cfi_position?: string
      percent_complete?: number
      current_chapter?: string
    }): Promise<unknown> => ipcRenderer.invoke('db:progress:upsert', data)
  },

  // ─── Sessions ────────────────────────────────────────
  sessions: {
    getByBook: (bookId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:sessions:getByBook', bookId),
    create: (data: { book_id: string; session_type?: string }): Promise<unknown> =>
      ipcRenderer.invoke('db:sessions:create', data),
    update: (id: string, data: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('db:sessions:update', id, data),
    delete: (id: string): Promise<unknown> => ipcRenderer.invoke('db:sessions:delete', id)
  },

  // ─── Highlights ──────────────────────────────────────
  highlights: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:highlights:getAll'),
    getByBook: (bookId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:highlights:getByBook', bookId),
    create: (data: {
      book_id: string
      cfi_range: string
      text: string
      color?: string
      chapter?: string
    }): Promise<unknown> => ipcRenderer.invoke('db:highlights:create', data),
    update: (id: string, data: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('db:highlights:update', id, data),
    delete: (id: string): Promise<unknown> => ipcRenderer.invoke('db:highlights:delete', id)
  },

  // ─── Notes ───────────────────────────────────────────
  notes: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:notes:getAll'),
    getByBook: (bookId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:notes:getByBook', bookId),
    getByHighlight: (highlightId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:notes:getByHighlight', highlightId),
    create: (data: {
      book_id: string
      highlight_id?: string
      content: string
      tags?: string
    }): Promise<unknown> => ipcRenderer.invoke('db:notes:create', data),
    update: (id: string, data: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('db:notes:update', id, data),
    delete: (id: string): Promise<unknown> => ipcRenderer.invoke('db:notes:delete', id)
  },

  // ─── Dashboard ──────────────────────────────────────
  dashboard: {
    currentlyReading: (): Promise<unknown[]> =>
      ipcRenderer.invoke('db:dashboard:currentlyReading'),
    recent: (): Promise<unknown[]> => ipcRenderer.invoke('db:dashboard:recent'),
    metrics: (): Promise<unknown> => ipcRenderer.invoke('db:dashboard:metrics')
  },

  // ─── Recap (Re-entry) ─────────────────────────────
  recap: {
    staleBooks: (inactivityDays: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:recap:staleBooks', inactivityDays),
    getForBook: (bookId: string): Promise<unknown> =>
      ipcRenderer.invoke('db:recap:getForBook', bookId)
  },

  // ─── Settings ────────────────────────────────────────
  settings: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('db:settings:get', key),
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:settings:getAll'),
    set: (key: string, value: string): Promise<unknown> =>
      ipcRenderer.invoke('db:settings:set', key, value),
    delete: (key: string): Promise<unknown> => ipcRenderer.invoke('db:settings:delete', key)
  },

  // ─── Categories ─────────────────────────────────────
  categories: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:categories:getAll'),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('db:categories:getById', id),
    create: (data: {
      name: string
      color?: string
      icon?: string
    }): Promise<unknown> => ipcRenderer.invoke('db:categories:create', data),
    update: (id: string, data: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('db:categories:update', id, data),
    delete: (id: string): Promise<unknown> => ipcRenderer.invoke('db:categories:delete', id)
  },

  // ─── Learning Tracks ────────────────────────────────
  tracks: {
    getByCategory: (categoryId: string): Promise<unknown> =>
      ipcRenderer.invoke('db:tracks:getByCategory', categoryId),
    upsert: (data: {
      categoryId: string
      targetHoursTotal?: number
      weeklyTargetHours?: number
      targetDeadline?: string
      manualBaseHours?: number
      notes?: string
      sourceLabel?: string
    }): Promise<unknown> => ipcRenderer.invoke('db:tracks:upsert', data),
    delete: (categoryId: string): Promise<unknown> =>
      ipcRenderer.invoke('db:tracks:delete', categoryId),
    computeProgress: (categoryId: string): Promise<unknown> =>
      ipcRenderer.invoke('db:tracks:computeProgress', categoryId),
    getTopForDashboard: (limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:tracks:getTopForDashboard', limit),
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:tracks:getAll')
  },

  // ─── Manual Time Entries ────────────────────────────
  manualTime: {
    add: (data: {
      categoryId: string
      deltaMinutes: number
      occurredAt: string
      note?: string
    }): Promise<unknown> => ipcRenderer.invoke('db:manual-time:add', data),
    getRecent: (categoryId: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:manual-time:getRecent', categoryId, limit)
  }
}

const appApi = {
  openEpubDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openEpub'),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:isFullscreen'),

  // EPUB parse (metadata only, no save)
  parseEpub: (filePath: string): Promise<unknown> => ipcRenderer.invoke('epub:parse', filePath),
  parseEpubDialog: (): Promise<unknown> => ipcRenderer.invoke('epub:parseDialog'),

  // EPUB import
  importEpub: (
    filePath: string,
    options?: { categoryId?: string; readingMode?: string | null }
  ): Promise<unknown> => ipcRenderer.invoke('epub:import', filePath, options),
  importEpubDialog: (): Promise<unknown> => ipcRenderer.invoke('epub:importDialog'),
  deleteBook: (bookId: string): Promise<unknown> => ipcRenderer.invoke('epub:delete', bookId),

  // Export
  exportMarkdown: (bookId: string): Promise<unknown> =>
    ipcRenderer.invoke('export:markdown', bookId),

  // Menu events
  onMenuImportEpub: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:import-epub', handler)
    return () => ipcRenderer.removeListener('menu:import-epub', handler)
  },
  onMenuCloseBook: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:close-book', handler)
    return () => ipcRenderer.removeListener('menu:close-book', handler)
  },
  onMenuToggleFocusMode: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:toggle-focus-mode', handler)
    return () => ipcRenderer.removeListener('menu:toggle-focus-mode', handler)
  },
  onMenuToggleSidebar: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:toggle-sidebar', handler)
    return () => ipcRenderer.removeListener('menu:toggle-sidebar', handler)
  },
  onMenuZoomIn: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:zoom-in', handler)
    return () => ipcRenderer.removeListener('menu:zoom-in', handler)
  },
  onMenuZoomOut: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:zoom-out', handler)
    return () => ipcRenderer.removeListener('menu:zoom-out', handler)
  },
  onMenuZoomReset: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:zoom-reset', handler)
    return () => ipcRenderer.removeListener('menu:zoom-reset', handler)
  },
  onMenuCommandPalette: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:command-palette', handler)
    return () => ipcRenderer.removeListener('menu:command-palette', handler)
  },
  onMenuStartPomodoro: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:start-pomodoro', handler)
    return () => ipcRenderer.removeListener('menu:start-pomodoro', handler)
  },
  onMenuEndSession: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:end-session', handler)
    return () => ipcRenderer.removeListener('menu:end-session', handler)
  },
  onMenuToggleSoundscapes: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:toggle-soundscapes', handler)
    return () => ipcRenderer.removeListener('menu:toggle-soundscapes', handler)
  },
  onMenuAbout: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:about', handler)
    return () => ipcRenderer.removeListener('menu:about', handler)
  },
  onMenuKeyboardShortcuts: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:keyboard-shortcuts', handler)
    return () => ipcRenderer.removeListener('menu:keyboard-shortcuts', handler)
  },

  // Focus Wall
  getFocusWallSettings: (): Promise<unknown> => ipcRenderer.invoke('focuswall:get-settings'),
  updateFocusWallSettings: (settings: Record<string, unknown>): Promise<unknown> =>
    ipcRenderer.invoke('focuswall:update-settings', settings),

  // Window close confirmation
  onCloseRequested: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('window:close-requested', handler)
    return () => ipcRenderer.removeListener('window:close-requested', handler)
  },
  confirmClose: (): void => {
    ipcRenderer.send('window:confirm-close')
  },

  // Dev tools
  seedData: (): Promise<unknown> => ipcRenderer.invoke('db:seed:run'),

  // Menu: seed complete
  onMenuSeedComplete: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:seed-complete', handler)
    return () => ipcRenderer.removeListener('menu:seed-complete', handler)
  }
}

// ─── Study Session API ──────────────────────────────
const sessionApi = {
  start: (config: {
    bookId: string
    pomodoroEnabled?: boolean
    workMinutes?: number
    breakMinutes?: number
    afkTimeoutMinutes?: number
    microbreakIntervalMinutes?: number
  }): Promise<unknown> => ipcRenderer.invoke('session:start', config),

  stop: (): Promise<unknown> => ipcRenderer.invoke('session:stop'),

  reportActivity: (): void => {
    ipcRenderer.send('session:activity')
  },

  confirmPresence: (): Promise<unknown> => ipcRenderer.invoke('session:confirm-presence'),

  afkTimeout: (): Promise<unknown> => ipcRenderer.invoke('session:afk-timeout'),

  skipBreak: (): Promise<unknown> => ipcRenderer.invoke('session:skip-break'),

  getState: (): Promise<unknown> => ipcRenderer.invoke('session:get-state'),

  getWrapUp: (): Promise<unknown> => ipcRenderer.invoke('session:get-wrapup'),

  incrementHighlight: (): void => {
    ipcRenderer.send('session:increment-highlight')
  },

  incrementNote: (): void => {
    ipcRenderer.send('session:increment-note')
  },

  microbreakTake: (): void => {
    ipcRenderer.send('session:microbreak-take')
  },

  microbreakEnd: (): void => {
    ipcRenderer.send('session:microbreak-end')
  },

  microbreakPostpone: (): void => {
    ipcRenderer.send('session:microbreak-postpone')
  },

  microbreakDisableToday: (): void => {
    ipcRenderer.send('session:microbreak-disable-today')
  },

  onStateUpdate: (callback: (snapshot: unknown) => void): (() => void) => {
    const handler = (_event: unknown, snapshot: unknown): void => callback(snapshot)
    ipcRenderer.on('session:state-update', handler as (...args: unknown[]) => void)
    return () =>
      ipcRenderer.removeListener('session:state-update', handler as (...args: unknown[]) => void)
  }
}

export type DatabaseAPI = typeof api
export type AppAPI = typeof appApi
export type SessionAPI = typeof sessionApi

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('appApi', appApi)
    contextBridge.exposeInMainWorld('sessionApi', sessionApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.appApi = appApi
  // @ts-ignore (define in dts)
  window.sessionApi = sessionApi
}
