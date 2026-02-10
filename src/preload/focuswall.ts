import { contextBridge, ipcRenderer } from 'electron'

/** API exposed to the focus wall renderer */
const focusWallApi = {
  /** Listen for session state updates (same broadcast as main renderer) */
  onSessionUpdate: (callback: (snapshot: unknown) => void): (() => void) => {
    const handler = (_event: unknown, snapshot: unknown): void => callback(snapshot)
    ipcRenderer.on('session:state-update', handler as (...args: unknown[]) => void)
    return () =>
      ipcRenderer.removeListener('session:state-update', handler as (...args: unknown[]) => void)
  },

  /** Listen for focus wall session data (book title, author, goal) */
  onSessionData: (callback: (data: unknown) => void): (() => void) => {
    const handler = (_event: unknown, data: unknown): void => callback(data)
    ipcRenderer.on('focuswall:session-data', handler as (...args: unknown[]) => void)
    return () =>
      ipcRenderer.removeListener('focuswall:session-data', handler as (...args: unknown[]) => void)
  },

  /** Listen for settings updates */
  onSettingsUpdate: (callback: (settings: unknown) => void): (() => void) => {
    const handler = (_event: unknown, settings: unknown): void => callback(settings)
    ipcRenderer.on('focuswall:settings-update', handler as (...args: unknown[]) => void)
    return () =>
      ipcRenderer.removeListener(
        'focuswall:settings-update',
        handler as (...args: unknown[]) => void
      )
  }
}

export type FocusWallAPI = typeof focusWallApi

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('focusWallApi', focusWallApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.focusWallApi = focusWallApi
}
