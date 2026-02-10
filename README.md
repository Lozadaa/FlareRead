# FlareRead

A desktop EPUB reader for focused study and reading, built with Electron, React, and TypeScript.

FlareRead combines a distraction-free reading experience with productivity tools like study sessions, learning tracks, and ambient soundscapes to help you stay focused and retain more from your reading.

---

## Features

- **EPUB Import and Management** -- Import, organize, and manage your EPUB library with metadata extraction and cover art
- **Study Sessions** -- Pomodoro-style timed sessions with AFK detection, break reminders, and wrap-up summaries
- **Learning Tracks and Goals** -- Create reading tracks, set goals, and log hours to measure your progress over time
- **Annotations** -- Highlight text with multiple colors and attach notes directly to passages
- **Category Organization** -- Organize books into custom categories for quick filtering and browsing
- **Focus Wall** -- A full-screen overlay that blocks distractions during study sessions, with multiple visual presets
- **Ambient Soundscapes** -- Background audio to help you concentrate while reading
- **Command Palette** -- Quick access to actions and navigation with keyboard-driven commands
- **Dark Mode** -- Full dark theme support with system preference detection
- **Keyboard Shortcuts** -- Navigate, annotate, and control sessions entirely from the keyboard
- **Offline-First with SQLite** -- All data stored locally using better-sqlite3; no internet connection required

---

## Screenshots

> Screenshots coming soon.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.0 or later
- npm 10.0 or later (included with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/flareread.git
cd flareread

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will open in a new Electron window with hot module replacement enabled.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `electron-vite dev` | Start the development server with HMR |
| `build` | `electron-vite build` | Build the application for production |
| `start` | `electron-vite preview` | Preview the production build locally |
| `package` | `npm run build && electron-builder` | Build and package for the current platform |
| `package:win` | `npm run build && electron-builder --win` | Package for Windows (NSIS installer + portable) |
| `package:mac` | `npm run build && electron-builder --mac` | Package for macOS (DMG + ZIP) |
| `package:linux` | `npm run build && electron-builder --linux` | Package for Linux (AppImage + deb) |
| `package:all` | `npm run build && electron-builder --win --mac --linux` | Package for all platforms |
| `release` | Build + `gh release create` | Package all platforms and create a GitHub release |
| `release:win` | Build + `gh release create` | Package for Windows and create a GitHub release |

---

## Project Structure

```
src/
├── main/                          # Electron main process
│   ├── categories/
│   │   └── handlers.ts            # IPC handlers for categories
│   ├── database/
│   │   ├── index.ts               # Database initialization & connection
│   │   ├── handlers.ts            # IPC handlers for database operations
│   │   ├── migrations.ts          # Schema migrations
│   │   ├── schema.ts              # SQLite schema definitions
│   │   └── seed.ts                # Sample data seeding
│   ├── epub/
│   │   ├── importer.ts            # EPUB file import & storage
│   │   └── parser.ts              # EPUB metadata extraction
│   ├── focuswall/
│   │   ├── FocusWallManager.ts    # Focus mode window management
│   │   └── handlers.ts            # IPC handlers for focus wall
│   ├── session/
│   │   ├── StudySessionManager.ts # Pomodoro & session state management
│   │   └── handlers.ts            # IPC handlers for study sessions
│   └── index.ts                   # Main process entry point
│
├── preload/                       # Preload scripts (context bridge)
│   ├── index.ts                   # Main preload with contextBridge APIs
│   ├── index.d.ts                 # TypeScript definitions for exposed APIs
│   └── focuswall.ts               # Focus wall preload script
│
└── renderer/                      # React frontend (Vite-served)
    ├── index.html                 # Main window HTML entry
    ├── focuswall.html             # Focus wall window HTML entry
    └── src/
        ├── components/
        │   ├── categories/        # Category selection and filtering
        │   ├── dashboard/         # Dashboard overview and goal cards
        │   ├── goals/             # Learning tracks and goal management
        │   ├── import/            # EPUB import dialogs
        │   ├── layout/            # App shell, sidebar, and top bar
        │   ├── library/           # Book library grid and list views
        │   ├── notes/             # Notes management view
        │   ├── reader/            # EPUB reader, annotations, TOC, settings
        │   ├── recap/             # Re-entry recap screen
        │   ├── session/           # Study session timer, breaks, AFK modal
        │   ├── settings/          # Settings and first-run wizard
        │   ├── soundscape/        # Ambient sound mini player
        │   ├── ui/                # Shared UI primitives (shadcn/ui)
        │   ├── CommandPalette.tsx
        │   ├── KeyboardShortcutsDialog.tsx
        │   └── ThemeProvider.tsx
        ├── focuswall/             # Focus wall React app and presets
        ├── hooks/                 # Custom React hooks
        ├── lib/                   # Utility functions and audio engine
        ├── App.tsx                # Root React component
        ├── main.tsx               # React entry point
        ├── types.ts               # Shared TypeScript types
        └── index.css              # Global styles (Tailwind directives)
```

---

## Architecture

FlareRead follows a strict multi-process architecture with security boundaries enforced at the IPC layer.

### Process Model

```
┌─────────────────┐     IPC (invoke/on)     ┌──────────────────┐
│  Main Process    │ <--------------------> │  Preload Script   │
│  (Node.js)       │                         │  (contextBridge)  │
│                  │                         └────────┬─────────┘
│  - SQLite DB     │                                  │
│  - EPUB parsing  │                         exposeInMainWorld
│  - File system   │                                  │
│  - Focus wall    │                         ┌────────▼─────────┐
│  - Sessions      │                         │  Renderer Process │
└─────────────────┘                         │  (React app)      │
                                             │                   │
                                             │  - UI components  │
                                             │  - State hooks    │
                                             │  - EPUB viewer    │
                                             └───────────────────┘
```

### IPC Communication

The preload script exposes four namespaced API objects to the renderer via `contextBridge.exposeInMainWorld`:

| Namespace | Purpose |
|-----------|---------|
| `window.electron` | Standard Electron utilities from `@electron-toolkit` |
| `window.api` | Database operations (books, progress, sessions, highlights, notes, categories, tracks) |
| `window.appApi` | Application features (EPUB import/parse, dialogs, export, window controls) |
| `window.sessionApi` | Study session management (Pomodoro, AFK detection, breaks, state updates) |

All IPC calls use `ipcRenderer.invoke()` for async request/response patterns and `ipcRenderer.on()` for event listeners, with proper cleanup functions to prevent memory leaks.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Electron | 33.2.1 |
| Frontend | React | 18.3.1 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | 3.4.17 |
| Database | better-sqlite3 | 12.6.2 |
| EPUB | epubjs | 0.3.93 |
| UI Primitives | Radix UI | Various |
| Animation | Framer Motion | 12.34.0 |
| Icons | Lucide React | 0.563.0 |
| Build | electron-vite | 2.3.0 |
| Packaging | electron-builder | 25.1.8 |

---

## Security

FlareRead follows Electron security best practices to minimize the attack surface of the renderer process.

- **`nodeIntegration: false`** -- The renderer process has no direct access to Node.js APIs, preventing arbitrary file system or process access from frontend code.
- **`contextIsolation: true`** -- The renderer's JavaScript context is fully isolated from the preload script, ensuring that exposed APIs cannot be tampered with by third-party content.
- **Preload bridge** -- All communication between the renderer and main process goes through a typed `contextBridge` layer. Only explicitly exposed functions are available to the frontend.
- **Custom protocol** -- Local files (EPUB covers, assets) are served through a registered `local-file://` protocol with controlled access, rather than using `file://` URLs directly.

---

## License

This project is not yet licensed. A license will be added in a future release.
