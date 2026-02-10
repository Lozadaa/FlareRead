import Database from 'better-sqlite3'

export interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
}

const migrations: Migration[] = [
  {
    version: 2,
    description: 'Add original_path, description, language to books',
    up: (db) => {
      db.exec(`
        ALTER TABLE books ADD COLUMN original_path TEXT;
        ALTER TABLE books ADD COLUMN description TEXT;
        ALTER TABLE books ADD COLUMN language TEXT;
      `)
    }
  },
  {
    version: 3,
    description: 'Add chapter column to highlights',
    up: (db) => {
      db.exec(`ALTER TABLE highlights ADD COLUMN chapter TEXT;`)
    }
  },
  {
    version: 4,
    description: 'Add Pomodoro and study session fields to sessions table',
    up: (db) => {
      db.exec(`
        ALTER TABLE sessions ADD COLUMN pomodoro_work_min INTEGER DEFAULT 25;
        ALTER TABLE sessions ADD COLUMN pomodoro_break_min INTEGER DEFAULT 5;
        ALTER TABLE sessions ADD COLUMN pomodoro_enabled INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN completed_pomodoros INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN afk_timeout_min INTEGER DEFAULT 5;
        ALTER TABLE sessions ADD COLUMN total_afk_ms INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN total_break_ms INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN highlights_during INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN notes_during INTEGER DEFAULT 0;
      `)
    }
  },
  {
    version: 5,
    description: 'Add Categories, Learning Tracks, and Manual Time Entries',
    up: (db) => {
      db.exec(`
        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT,
          icon TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Category learning tracks
        CREATE TABLE IF NOT EXISTS category_tracks (
          id TEXT PRIMARY KEY,
          category_id TEXT UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
          target_hours_total REAL,
          weekly_target_hours REAL,
          target_deadline TEXT,
          manual_base_hours REAL DEFAULT 0,
          notes TEXT,
          source_label TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Manual time entries
        CREATE TABLE IF NOT EXISTS manual_time_entries (
          id TEXT PRIMARY KEY,
          category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
          delta_minutes INTEGER NOT NULL,
          occurred_at TEXT NOT NULL,
          note TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        -- Alter books table
        ALTER TABLE books ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL;
        ALTER TABLE books ADD COLUMN reading_mode TEXT DEFAULT NULL CHECK(reading_mode IN ('study','leisure'));

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
        CREATE INDEX IF NOT EXISTS idx_manual_time_entries_category_id ON manual_time_entries(category_id);
        CREATE INDEX IF NOT EXISTS idx_manual_time_entries_occurred_at ON manual_time_entries(occurred_at);

        -- Default 'Uncategorized' category
        INSERT INTO categories (id, name, color, icon) VALUES ('uncategorized', 'Uncategorized', '#6b7280', NULL);
      `)
    }
  }
]

export function initMigrationTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

export function getCurrentVersion(db: Database.Database): number {
  const row = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as
    | { version: number | null }
    | undefined
  return row?.version ?? 1
}

export function runMigrations(db: Database.Database): void {
  initMigrationTable(db)

  // Version 1 is the initial schema (created by schema.ts)
  // Check if version 1 is recorded, if not, record it
  const hasInitial = db
    .prepare('SELECT version FROM schema_migrations WHERE version = 1')
    .get() as { version: number } | undefined
  if (!hasInitial) {
    db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(
      1,
      'Initial schema'
    )
  }

  const currentVersion = getCurrentVersion(db)

  const pendingMigrations = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version)

  for (const migration of pendingMigrations) {
    db.transaction(() => {
      migration.up(db)
      db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description
      )
    })()
    console.log(`Migration ${migration.version} applied: ${migration.description}`)
  }
}
