import { app, BrowserWindow, shell, ipcMain, dialog, Menu, protocol, net } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase, getDatabase } from './database'
import { registerDatabaseHandlers } from './database/handlers'
import { importEpub, deleteBookFiles, parseEpubFile } from './epub/importer'
import { registerSessionHandlers } from './session/handlers'
import { getSessionManager } from './session/StudySessionManager'
import { registerFocusWallHandlers } from './focuswall/handlers'
import { registerCategoryHandlers } from './categories/handlers'
import { getFocusWallManager } from './focuswall/FocusWallManager'
import { seedSampleData } from './database/seed'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function buildMenu(mainWindow: BrowserWindow): void {
  const send = (channel: string): void => {
    mainWindow.webContents.send(channel)
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import EPUB...',
          accelerator: 'CmdOrCtrl+O',
          click: (): void => send('menu:import-epub')
        },
        {
          label: 'Close Book',
          accelerator: 'CmdOrCtrl+W',
          click: (): void => send('menu:close-book')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'selectAll' },
        { type: 'separator' },
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Focus Mode\tEsc',
          click: (): void => send('menu:toggle-focus-mode')
        },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: (): void => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen())
          }
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: (): void => send('menu:toggle-sidebar')
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: (): void => send('menu:zoom-in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (): void => send('menu:zoom-out')
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: (): void => send('menu:zoom-reset')
        },
        { type: 'separator' },
        {
          label: 'Command Palette\tCtrl+K',
          click: (): void => send('menu:command-palette')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Session',
      submenu: [
        {
          label: 'Start Pomodoro',
          click: (): void => send('menu:start-pomodoro')
        },
        {
          label: 'End Session',
          click: (): void => send('menu:end-session')
        },
        { type: 'separator' },
        {
          label: 'Toggle Soundscapes',
          click: (): void => send('menu:toggle-soundscapes')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About FlareRead',
          click: (): void => send('menu:about')
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: (): void => send('menu:keyboard-shortcuts')
        }
      ]
    },
    ...(is.dev
      ? [
          {
            label: 'Dev',
            submenu: [
              {
                label: 'Seed Sample Data',
                click: (): void => {
                  const result = seedSampleData()
                  if (result.success) {
                    dialog.showMessageBox(mainWindow, {
                      type: 'info',
                      title: 'Seed Data',
                      message: result.summary
                    })
                    send('menu:seed-complete')
                  } else {
                    dialog.showMessageBox(mainWindow, {
                      type: 'warning',
                      title: 'Seed Data',
                      message: result.summary
                    })
                  }
                }
              }
            ]
          } as Electron.MenuItemConstructorOptions
        ]
      : [])
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Register custom protocol for serving local files (covers, etc.)
// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
])

app.whenReady().then(() => {
  // Handle local-file:// protocol to serve cover images and other local assets
  protocol.handle('local-file', (request) => {
    const filePath = request.url.slice('local-file://'.length)
    return net.fetch('file://' + filePath)
  })

  initDatabase()
  registerDatabaseHandlers()
  registerSessionHandlers()
  registerFocusWallHandlers()
  registerCategoryHandlers()

  // ─── Seed Data Handler (dev only) ──────────────────
  if (is.dev) {
    ipcMain.handle('db:seed:run', () => {
      return seedSampleData()
    })
  }

  // ─── File Dialog Handler ─────────────────────────────
  ipcMain.handle('dialog:openEpub', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'EPUB Files', extensions: ['epub'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ─── EPUB Parse Handler (metadata only, no save) ────
  ipcMain.handle('epub:parse', (_e, filePath: string) => {
    return parseEpubFile(filePath)
  })

  ipcMain.handle('epub:parseDialog', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) return { success: false, error: 'No window', code: 'UNKNOWN' }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'EPUB Files', extensions: ['epub'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return parseEpubFile(result.filePaths[0])
  })

  // ─── EPUB Import Handler ─────────────────────────────
  ipcMain.handle(
    'epub:import',
    (
      _e,
      filePath: string,
      options?: { categoryId?: string; readingMode?: string | null }
    ) => {
      return importEpub(filePath, options)
    }
  )

  ipcMain.handle('epub:importDialog', async () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) return { success: false, error: 'No window', code: 'UNKNOWN' }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'EPUB Files', extensions: ['epub'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return importEpub(result.filePaths[0])
  })

  // ─── Book Delete Handler (with file cleanup) ─────────
  ipcMain.handle('epub:delete', (_e, bookId: string) => {
    deleteBookFiles(bookId)
    getDatabase().prepare('DELETE FROM books WHERE id = ?').run(bookId)
    return { success: true }
  })

  // ─── Markdown Export Handler ─────────────────────────
  ipcMain.handle(
    'export:markdown',
    async (_e, bookId: string) => {
      const mainWindow = BrowserWindow.getFocusedWindow()
      if (!mainWindow) return { success: false, error: 'No window' }

      const db = getDatabase()
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as
        | { title: string; author: string | null }
        | undefined
      if (!book) return { success: false, error: 'Book not found' }

      const highlights = db
        .prepare('SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at ASC')
        .all(bookId) as Array<{
        id: string
        text: string
        color: string
        chapter: string | null
        cfi_range: string
        created_at: string
      }>

      const notes = db
        .prepare(
          `SELECT n.*, h.text as highlight_text, h.cfi_range as highlight_cfi
           FROM notes n
           LEFT JOIN highlights h ON n.highlight_id = h.id
           WHERE n.book_id = ?
           ORDER BY n.created_at ASC`
        )
        .all(bookId) as Array<{
        id: string
        content: string
        tags: string
        highlight_text: string | null
        highlight_cfi: string | null
        highlight_id: string | null
        created_at: string
      }>

      // Build markdown
      let md = `# ${book.title}\n`
      if (book.author) md += `*by ${book.author}*\n`
      md += `\n---\n\n`

      // Group highlights by chapter
      const chapterMap = new Map<string, typeof highlights>()
      for (const h of highlights) {
        const chapter = h.chapter || 'Uncategorized'
        if (!chapterMap.has(chapter)) chapterMap.set(chapter, [])
        chapterMap.get(chapter)!.push(h)
      }

      if (chapterMap.size > 0) {
        md += `## Highlights\n\n`
        for (const [chapter, chapterHighlights] of chapterMap) {
          md += `### ${chapter}\n\n`
          for (const h of chapterHighlights) {
            md += `> ${h.text}\n\n`
            // Find associated notes
            const relatedNotes = notes.filter((n) => n.highlight_id === h.id)
            for (const n of relatedNotes) {
              md += `**Note:** ${n.content}\n\n`
              const tags: string[] = JSON.parse(n.tags || '[]')
              if (tags.length > 0) {
                md += `Tags: ${tags.map((t) => `\`${t}\``).join(', ')}\n\n`
              }
            }
          }
        }
      }

      // Standalone notes (not linked to highlights)
      const standaloneNotes = notes.filter((n) => !n.highlight_id)
      if (standaloneNotes.length > 0) {
        md += `## Notes\n\n`
        for (const n of standaloneNotes) {
          md += `- ${n.content}\n`
          const tags: string[] = JSON.parse(n.tags || '[]')
          if (tags.length > 0) {
            md += `  Tags: ${tags.map((t) => `\`${t}\``).join(', ')}\n`
          }
          md += `\n`
        }
      }

      md += `---\n*Exported from FlareRead on ${new Date().toLocaleDateString()}*\n`

      const safeTitle = book.title.replace(/[<>:"/\\|?*]/g, '_')
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `${safeTitle} - Notes & Highlights.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })

      if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' }

      try {
        writeFileSync(result.filePath, md, 'utf-8')
        return { success: true, filePath: result.filePath }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ─── Fullscreen Handler ──────────────────────────────
  ipcMain.handle('window:toggleFullscreen', () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) return false
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
    return mainWindow.isFullScreen()
  })

  ipcMain.handle('window:isFullscreen', () => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    return mainWindow?.isFullScreen() ?? false
  })

  const mainWindow = createWindow()
  buildMenu(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow()
      buildMenu(win)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  getFocusWallManager().destroy()
  getSessionManager().destroy()
  closeDatabase()
})
