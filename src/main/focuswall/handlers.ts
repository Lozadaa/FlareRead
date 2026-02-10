import { ipcMain } from 'electron'
import { getFocusWallManager, FocusWallSettings } from './FocusWallManager'

export function registerFocusWallHandlers(): void {
  const manager = getFocusWallManager()

  // Get current focus wall settings
  ipcMain.handle('focuswall:get-settings', () => {
    return manager.getSettings()
  })

  // Update focus wall settings
  ipcMain.handle('focuswall:update-settings', (_e, settings: Partial<FocusWallSettings>) => {
    manager.saveSettings(settings)
    manager.broadcastSettings()
    return manager.getSettings()
  })
}
