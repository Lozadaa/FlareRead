import { ElectronAPI } from '@electron-toolkit/preload'
import { DatabaseAPI, AppAPI, SessionAPI } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: DatabaseAPI
    appApi: AppAPI
    sessionApi: SessionAPI
  }
}
