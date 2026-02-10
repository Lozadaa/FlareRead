/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'

interface DatabaseAPI {
  books: {
    getAll: () => Promise<unknown[]>
    getById: (id: string) => Promise<unknown>
    create: (data: {
      title: string
      author?: string
      cover_path?: string
      file_path: string
      total_words_estimate?: number
    }) => Promise<unknown>
    update: (id: string, data: Record<string, unknown>) => Promise<unknown>
    delete: (id: string) => Promise<unknown>
  }
  progress: {
    get: (bookId: string) => Promise<unknown>
    upsert: (data: {
      book_id: string
      cfi_position?: string
      percent_complete?: number
      current_chapter?: string
    }) => Promise<unknown>
  }
  sessions: {
    getByBook: (bookId: string) => Promise<unknown[]>
    create: (data: { book_id: string; session_type?: string }) => Promise<unknown>
    update: (id: string, data: Record<string, unknown>) => Promise<unknown>
    delete: (id: string) => Promise<unknown>
  }
  highlights: {
    getByBook: (bookId: string) => Promise<unknown[]>
    create: (data: {
      book_id: string
      cfi_range: string
      text: string
      color?: string
    }) => Promise<unknown>
    update: (id: string, data: Record<string, unknown>) => Promise<unknown>
    delete: (id: string) => Promise<unknown>
  }
  notes: {
    getByBook: (bookId: string) => Promise<unknown[]>
    getByHighlight: (highlightId: string) => Promise<unknown[]>
    create: (data: {
      book_id: string
      highlight_id?: string
      content: string
      tags?: string
    }) => Promise<unknown>
    update: (id: string, data: Record<string, unknown>) => Promise<unknown>
    delete: (id: string) => Promise<unknown>
  }
  dashboard: {
    currentlyReading: () => Promise<unknown[]>
    recent: () => Promise<unknown[]>
    metrics: () => Promise<unknown>
  }
  recap: {
    staleBooks: (inactivityDays: number) => Promise<unknown[]>
    getForBook: (bookId: string) => Promise<unknown>
  }
  settings: {
    get: (key: string) => Promise<string | null>
    getAll: () => Promise<unknown[]>
    set: (key: string, value: string) => Promise<unknown>
    delete: (key: string) => Promise<unknown>
  }
  tracks: {
    getByCategory: (categoryId: string) => Promise<unknown>
    upsert: (data: {
      categoryId: string
      targetHoursTotal?: number
      weeklyTargetHours?: number
      targetDeadline?: string
      manualBaseHours?: number
      notes?: string
      sourceLabel?: string
    }) => Promise<unknown>
    delete: (categoryId: string) => Promise<unknown>
    computeProgress: (categoryId: string) => Promise<unknown>
    getTopForDashboard: (limit?: number) => Promise<unknown[]>
    getAll: () => Promise<unknown[]>
  }
  manualTime: {
    add: (data: {
      categoryId: string
      deltaMinutes: number
      occurredAt: string
      note?: string
    }) => Promise<unknown>
    getRecent: (categoryId: string, limit?: number) => Promise<unknown[]>
  }
}

interface AppAPI {
  openEpubDialog: () => Promise<string | null>
  toggleFullscreen: () => Promise<boolean>
  isFullscreen: () => Promise<boolean>
  getFocusWallSettings?: () => Promise<unknown>
  updateFocusWallSettings?: (settings: Record<string, unknown>) => Promise<unknown>
}

interface SessionAPI {
  start: (config: {
    bookId: string
    pomodoroEnabled?: boolean
    workMinutes?: number
    breakMinutes?: number
    afkTimeoutMinutes?: number
    microbreakIntervalMinutes?: number
  }) => Promise<unknown>
  stop: () => Promise<unknown>
  reportActivity: () => void
  confirmPresence: () => Promise<unknown>
  afkTimeout: () => Promise<unknown>
  skipBreak: () => Promise<unknown>
  getState: () => Promise<unknown>
  getWrapUp: () => Promise<unknown>
  incrementHighlight: () => void
  incrementNote: () => void
  microbreakTake: () => void
  microbreakEnd: () => void
  microbreakPostpone: () => void
  microbreakDisableToday: () => void
  onStateUpdate: (callback: (snapshot: unknown) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DatabaseAPI
    appApi: AppAPI
    sessionApi: SessionAPI
  }
}
