import Database from 'better-sqlite3'

export function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      cover_path TEXT,
      file_path TEXT NOT NULL,
      total_words_estimate INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      book_id TEXT PRIMARY KEY,
      cfi_position TEXT,
      percent_complete REAL DEFAULT 0,
      current_chapter TEXT,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      active_ms INTEGER DEFAULT 0,
      pages_viewed INTEGER DEFAULT 0,
      words_read_estimate INTEGER DEFAULT 0,
      session_type TEXT DEFAULT 'reading',
      status TEXT DEFAULT 'active',
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      cfi_range TEXT NOT NULL,
      text TEXT NOT NULL,
      color TEXT DEFAULT '#ffeb3b',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      highlight_id TEXT,
      book_id TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (highlight_id) REFERENCES highlights(id) ON DELETE SET NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_book_id ON sessions(book_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON highlights(book_id);
    CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
    CREATE INDEX IF NOT EXISTS idx_notes_highlight_id ON notes(highlight_id);
  `)
}
