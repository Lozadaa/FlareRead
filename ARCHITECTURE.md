# FlareRead Architecture

## Overview

FlareRead is an Electron-based EPUB reader focused on deep reading with study sessions, progress tracking, and annotation management. Built with Electron + Vite + React + TypeScript.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 33 |
| Build tool | electron-vite 2.3 |
| Frontend | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3.4 |
| Database | better-sqlite3 (WAL mode) |
| EPUB parsing | epubjs 0.3 |
| Components | Radix UI (headless) |
| Animations | Framer Motion |

## Process Architecture

```
┌─────────────────────────────────────────────────┐
│                  Main Process                    │
│                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Database  │  │ StudySession │  │ FocusWall │  │
│  │ (SQLite)  │  │  Manager     │  │  Manager  │  │
│  └──────────┘  └──────────────┘  └───────────┘  │
│         ▲              ▲               ▲         │
│         │       IPC (invoke/send)      │         │
│         ▼              ▼               ▼         │
│  ┌──────────────────────────────────────────┐    │
│  │             Preload Script               │    │
│  │  contextBridge.exposeInMainWorld(...)     │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
         ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  Main Window     │      │  Focus Wall      │
│  (React SPA)     │      │  Windows         │
│  Vite dev server │      │  (secondary      │
│  or static build │      │   displays)      │
└──────────────────┘      └──────────────────┘
```

### Security Model

- `nodeIntegration: false`, `contextIsolation: true`
- All main process access via `contextBridge.exposeInMainWorld`
- Three API surfaces: `window.api` (database), `window.appApi` (app), `window.sessionApi` (sessions)

## Directory Structure

```
src/
├── main/
│   ├── index.ts                 # App entry, window creation, menu, IPC
│   ├── database/
│   │   ├── index.ts             # DB init, WAL, foreign keys
│   │   ├── schema.ts            # Initial table creation (v1)
│   │   ├── migrations.ts        # Versioned migrations (v2–v5)
│   │   ├── handlers.ts          # IPC: books, progress, sessions, highlights, notes, dashboard, recap, settings
│   │   └── seed.ts              # Dev seed data script
│   ├── categories/
│   │   └── handlers.ts          # IPC: categories, tracks, manual time, computeProgress
│   ├── session/
│   │   ├── StudySessionManager.ts  # Session state machine, AFK detection, pomodoro
│   │   └── handlers.ts          # IPC: session start/stop/activity/state
│   ├── focuswall/
│   │   ├── FocusWallManager.ts  # Secondary display fullscreen windows
│   │   └── handlers.ts          # IPC: focus wall settings
│   └── epub/
│       └── importer.ts          # EPUB parsing, import, file management
├── preload/
│   └── index.ts                 # contextBridge API definitions
└── renderer/
    ├── index.html               # Entry HTML
    └── src/
        ├── main.tsx             # React entry
        ├── App.tsx              # Root component
        └── index.css            # Tailwind directives
```

## Data Model

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐
│ categories  │       │ category_tracks  │
│─────────────│       │──────────────────│
│ id (PK)     │──1:1──│ id (PK)          │
│ name (UQ)   │       │ category_id (FK) │
│ color       │       │ target_hours_total│
│ icon        │       │ weekly_target_hrs │
│ created_at  │       │ target_deadline   │
└──────┬──────┘       │ manual_base_hours │
       │              │ notes             │
       │              │ source_label      │
       │              └──────────────────┘
       │
       │ 1:N                    1:N
       ▼                         │
┌─────────────────┐              │
│ books           │    ┌─────────────────────┐
│─────────────────│    │ manual_time_entries  │
│ id (PK)         │    │─────────────────────│
│ title           │    │ id (PK)             │
│ author          │    │ category_id (FK)    │
│ category_id(FK) │    │ delta_minutes       │
│ reading_mode    │    │ occurred_at         │
│ file_path       │    │ note                │
│ cover_path      │    │ created_at          │
│ ...             │    └─────────────────────┘
└───────┬─────────┘
        │
        │ 1:N              1:1
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌──────────────┐            ┌──────────────────┐
│ sessions     │            │ reading_progress │
│──────────────│            │──────────────────│
│ id (PK)      │            │ book_id (PK, FK) │
│ book_id (FK) │            │ cfi_position     │
│ start_time   │            │ percent_complete │
│ end_time     │            │ current_chapter  │
│ active_ms    │            └──────────────────┘
│ pages_viewed │
│ words_read   │
│ session_type │
│ pomodoro_*   │
│ afk_*        │
└──────────────┘
        │
        │
        ▼
┌──────────────┐      ┌──────────────┐
│ highlights   │      │ notes        │
│──────────────│      │──────────────│
│ id (PK)      │──1:N─│ id (PK)      │
│ book_id (FK) │      │ highlight_id │
│ cfi_range    │      │ book_id (FK) │
│ text         │      │ content      │
│ color        │      │ tags (JSON)  │
│ chapter      │      │ created_at   │
│ created_at   │      │ updated_at   │
└──────────────┘      └──────────────┘

┌──────────────┐
│ settings     │
│──────────────│
│ key (PK)     │
│ value        │
└──────────────┘
```

### Tables Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `books` | Imported EPUB metadata | title, author, category_id, reading_mode, file_path |
| `reading_progress` | Per-book read position | cfi_position, percent_complete |
| `sessions` | Reading session records | active_ms, pomodoro fields, AFK tracking |
| `highlights` | Text highlights in EPUBs | cfi_range, text, color, chapter |
| `notes` | Annotations (linked to highlights or standalone) | content, tags (JSON array) |
| `categories` | Organizational groups for books | name, color, icon |
| `category_tracks` | Learning goals per category | target_hours_total, weekly_target_hours, deadline |
| `manual_time_entries` | Time adjustments for offline reading | delta_minutes, occurred_at |
| `settings` | Key-value app config | key, value |
| `schema_migrations` | Migration version tracking | version, applied_at |

### Migration History

| Version | Description |
|---------|-------------|
| 1 | Initial schema: books, reading_progress, sessions, highlights, notes, settings |
| 2 | Add original_path, description, language to books |
| 3 | Add chapter column to highlights |
| 4 | Add Pomodoro and study session fields to sessions |
| 5 | Add Categories, Learning Tracks, Manual Time Entries |

## Categories & Tracks Feature

### How It Works

Books are organized into **categories** (e.g., "English", "AI/Machine Learning"). Each category can have a **learning track** with a target number of hours.

**Progress calculation** is on-demand via SQL JOINs (not cached):

```
Total time = Active session time + Manual entries + Manual base hours

Active session time = SUM(sessions.active_ms) for books in that category
Manual entries      = SUM(manual_time_entries.delta_minutes) for category
Manual base hours   = category_tracks.manual_base_hours (one-time offset)

Percent complete    = (Total hours / target_hours_total) × 100
```

### Category Change Behavior

When a book's `category_id` changes, all its session time automatically moves to the new category's track. This works because progress is computed on-demand via JOINs (`sessions → books → categories`), not cached.

### Manual Time Entries

Users can add manual time entries for reading done outside the app (e.g., physical books). Each entry records delta minutes, a date, and an optional note.

## IPC Handler Reference

### Database API (`window.api`)

| Channel | Method | Description |
|---------|--------|-------------|
| `db:books:getAll` | invoke | List all books |
| `db:books:getById` | invoke | Get book by ID |
| `db:books:create` | invoke | Create book record |
| `db:books:update` | invoke | Update book fields |
| `db:books:delete` | invoke | Delete book record |
| `db:progress:get` | invoke | Get reading progress |
| `db:progress:upsert` | invoke | Update reading progress |
| `db:sessions:getByBook` | invoke | Get sessions for book |
| `db:sessions:create` | invoke | Create session |
| `db:sessions:update` | invoke | Update session |
| `db:sessions:delete` | invoke | Delete session |
| `db:highlights:getAll` | invoke | List all highlights |
| `db:highlights:getByBook` | invoke | Get highlights for book |
| `db:highlights:create` | invoke | Create highlight |
| `db:highlights:update` | invoke | Update highlight |
| `db:highlights:delete` | invoke | Delete highlight |
| `db:notes:getAll` | invoke | List all notes |
| `db:notes:getByBook` | invoke | Get notes for book |
| `db:notes:getByHighlight` | invoke | Get notes for highlight |
| `db:notes:create` | invoke | Create note |
| `db:notes:update` | invoke | Update note |
| `db:notes:delete` | invoke | Delete note |
| `db:dashboard:currentlyReading` | invoke | In-progress books with stats |
| `db:dashboard:recent` | invoke | 5 most recent books |
| `db:dashboard:metrics` | invoke | Aggregated reading stats |
| `db:recap:staleBooks` | invoke | Books not read in N days |
| `db:recap:getForBook` | invoke | Full recap for book |
| `db:settings:get` | invoke | Get setting |
| `db:settings:getAll` | invoke | List all settings |
| `db:settings:set` | invoke | Set setting |
| `db:settings:delete` | invoke | Delete setting |
| `db:categories:getAll` | invoke | List categories |
| `db:categories:getById` | invoke | Get category |
| `db:categories:create` | invoke | Create category |
| `db:categories:update` | invoke | Update category |
| `db:categories:delete` | invoke | Delete category |
| `db:tracks:getByCategory` | invoke | Get track for category |
| `db:tracks:upsert` | invoke | Create/update track |
| `db:tracks:delete` | invoke | Delete track |
| `db:tracks:computeProgress` | invoke | Compute track progress |
| `db:tracks:getTopForDashboard` | invoke | Top N tracks by completion |
| `db:tracks:getAll` | invoke | All tracks with progress |
| `db:manual-time:add` | invoke | Add manual time entry |
| `db:manual-time:getRecent` | invoke | Recent entries for category |

### Session API (`window.sessionApi`)

| Channel | Method | Description |
|---------|--------|-------------|
| `session:start` | invoke | Start study session |
| `session:stop` | invoke | Stop session, persist stats |
| `session:activity` | send | Report user activity (AFK) |
| `session:confirm-presence` | invoke | Confirm after AFK modal |
| `session:afk-timeout` | invoke | AFK timeout expired |
| `session:skip-break` | invoke | Skip pomodoro break |
| `session:get-state` | invoke | Get current session snapshot |
| `session:get-wrapup` | invoke | Get wrap-up stats |
| `session:increment-highlight` | send | Track highlight during session |
| `session:increment-note` | send | Track note during session |
| `session:state-update` | on | Session state broadcast |

### App API (`window.appApi`)

| Channel | Method | Description |
|---------|--------|-------------|
| `dialog:openEpub` | invoke | Open file dialog for EPUB |
| `epub:parse` | invoke | Parse EPUB metadata |
| `epub:parseDialog` | invoke | Dialog + parse |
| `epub:import` | invoke | Import EPUB with options |
| `epub:importDialog` | invoke | Dialog + import |
| `epub:delete` | invoke | Delete book + files |
| `export:markdown` | invoke | Export highlights/notes to MD |
| `window:toggleFullscreen` | invoke | Toggle fullscreen |
| `window:isFullscreen` | invoke | Check fullscreen state |
| `focuswall:get-settings` | invoke | Get focus wall settings |
| `focuswall:update-settings` | invoke | Update focus wall settings |

### Dev-only

| Channel | Method | Description |
|---------|--------|-------------|
| `db:seed:run` | invoke | Seed sample data (dev only) |

## Study Session State Machine

```
                   start()
                     │
                     ▼
              ┌─────────────┐
              │   running    │ ◄── confirmPresence()
              │             │ ◄── break timer complete
              └──────┬──────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
    idle timeout   pomodoro    stop()
          │        complete      │
          ▼          │          ▼
   ┌────────────┐    │    ┌───────────┐
   │ paused_afk │    │    │ completed │
   └────────────┘    │    └───────────┘
          │          ▼
          │    ┌──────────┐
          │    │  break   │──── skipBreak()
          │    └──────────┘         │
          │                         │
          └─── dismissAfkTimeout() ─┘──→ completed
```

## Database Storage

- **Database file**: `{userData}/flareread.db`
- **Book files**: `{userData}/books/{bookId}.epub`
- **Cover images**: `{userData}/covers/{bookId}.{ext}`
