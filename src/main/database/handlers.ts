import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDatabase } from './index'

export function registerDatabaseHandlers(): void {
  // ─── Books ───────────────────────────────────────────
  ipcMain.handle('db:books:getAll', () => {
    return getDatabase().prepare('SELECT * FROM books ORDER BY updated_at DESC').all()
  })

  ipcMain.handle('db:books:getById', (_e, id: string) => {
    return getDatabase().prepare('SELECT * FROM books WHERE id = ?').get(id)
  })

  ipcMain.handle(
    'db:books:create',
    (
      _e,
      data: {
        title: string
        author?: string
        cover_path?: string
        file_path: string
        total_words_estimate?: number
        original_path?: string
        description?: string
        language?: string
      }
    ) => {
      const id = randomUUID()
      const now = new Date().toISOString()
      getDatabase()
        .prepare(
          `INSERT INTO books (id, title, author, cover_path, file_path, original_path, description, language, total_words_estimate, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.title,
          data.author ?? null,
          data.cover_path ?? null,
          data.file_path,
          data.original_path ?? null,
          data.description ?? null,
          data.language ?? null,
          data.total_words_estimate ?? null,
          now,
          now
        )
      return getDatabase().prepare('SELECT * FROM books WHERE id = ?').get(id)
    }
  )

  // NOTE: When category_id changes, all the book's session time automatically moves
  // to the new category's track. This is because track progress is computed on-demand
  // via JOIN (sessions → books → categories), not cached. No extra work is needed.
  ipcMain.handle(
    'db:books:update',
    (_e, id: string, data: Partial<{ title: string; author: string; cover_path: string; file_path: string; total_words_estimate: number; category_id: string | null; reading_mode: string | null }>) => {
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
      fields.push("updated_at = datetime('now')")
      values.push(id)
      getDatabase()
        .prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values)
      return getDatabase().prepare('SELECT * FROM books WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:books:delete', (_e, id: string) => {
    return getDatabase().prepare('DELETE FROM books WHERE id = ?').run(id)
  })

  // ─── Reading Progress ────────────────────────────────
  ipcMain.handle('db:progress:get', (_e, bookId: string) => {
    return getDatabase().prepare('SELECT * FROM reading_progress WHERE book_id = ?').get(bookId)
  })

  ipcMain.handle(
    'db:progress:upsert',
    (
      _e,
      data: {
        book_id: string
        cfi_position?: string
        percent_complete?: number
        current_chapter?: string
      }
    ) => {
      getDatabase()
        .prepare(
          `INSERT INTO reading_progress (book_id, cfi_position, percent_complete, current_chapter)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(book_id) DO UPDATE SET
           cfi_position = COALESCE(excluded.cfi_position, cfi_position),
           percent_complete = COALESCE(excluded.percent_complete, percent_complete),
           current_chapter = COALESCE(excluded.current_chapter, current_chapter)`
        )
        .run(
          data.book_id,
          data.cfi_position ?? null,
          data.percent_complete ?? null,
          data.current_chapter ?? null
        )
      return getDatabase()
        .prepare('SELECT * FROM reading_progress WHERE book_id = ?')
        .get(data.book_id)
    }
  )

  // ─── Sessions ────────────────────────────────────────
  ipcMain.handle('db:sessions:getByBook', (_e, bookId: string) => {
    return getDatabase()
      .prepare('SELECT * FROM sessions WHERE book_id = ? ORDER BY start_time DESC')
      .all(bookId)
  })

  ipcMain.handle(
    'db:sessions:create',
    (
      _e,
      data: {
        book_id: string
        session_type?: string
      }
    ) => {
      const id = randomUUID()
      const now = new Date().toISOString()
      getDatabase()
        .prepare(
          `INSERT INTO sessions (id, book_id, start_time, session_type, status)
         VALUES (?, ?, ?, ?, 'active')`
        )
        .run(id, data.book_id, now, data.session_type ?? 'reading')
      return getDatabase().prepare('SELECT * FROM sessions WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'db:sessions:update',
    (
      _e,
      id: string,
      data: Partial<{
        end_time: string
        active_ms: number
        pages_viewed: number
        words_read_estimate: number
        status: string
      }>
    ) => {
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
      values.push(id)
      getDatabase()
        .prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values)
      return getDatabase().prepare('SELECT * FROM sessions WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:sessions:delete', (_e, id: string) => {
    return getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(id)
  })

  // ─── Highlights ──────────────────────────────────────
  ipcMain.handle('db:highlights:getByBook', (_e, bookId: string) => {
    return getDatabase()
      .prepare('SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at DESC')
      .all(bookId)
  })

  ipcMain.handle(
    'db:highlights:create',
    (
      _e,
      data: {
        book_id: string
        cfi_range: string
        text: string
        color?: string
        chapter?: string
      }
    ) => {
      const id = randomUUID()
      const now = new Date().toISOString()
      getDatabase()
        .prepare(
          `INSERT INTO highlights (id, book_id, cfi_range, text, color, chapter, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, data.book_id, data.cfi_range, data.text, data.color ?? '#fef08a', data.chapter ?? null, now)
      return getDatabase().prepare('SELECT * FROM highlights WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'db:highlights:update',
    (_e, id: string, data: Partial<{ cfi_range: string; text: string; color: string }>) => {
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
      values.push(id)
      getDatabase()
        .prepare(`UPDATE highlights SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values)
      return getDatabase().prepare('SELECT * FROM highlights WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:highlights:delete', (_e, id: string) => {
    return getDatabase().prepare('DELETE FROM highlights WHERE id = ?').run(id)
  })

  // ─── Notes ───────────────────────────────────────────
  ipcMain.handle('db:notes:getByBook', (_e, bookId: string) => {
    return getDatabase()
      .prepare('SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC')
      .all(bookId)
  })

  ipcMain.handle('db:notes:getByHighlight', (_e, highlightId: string) => {
    return getDatabase()
      .prepare('SELECT * FROM notes WHERE highlight_id = ? ORDER BY created_at DESC')
      .all(highlightId)
  })

  ipcMain.handle(
    'db:notes:create',
    (
      _e,
      data: {
        book_id: string
        highlight_id?: string
        content: string
        tags?: string
      }
    ) => {
      const id = randomUUID()
      const now = new Date().toISOString()
      getDatabase()
        .prepare(
          `INSERT INTO notes (id, highlight_id, book_id, content, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.highlight_id ?? null,
          data.book_id,
          data.content,
          data.tags ?? '[]',
          now,
          now
        )
      return getDatabase().prepare('SELECT * FROM notes WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'db:notes:update',
    (_e, id: string, data: Partial<{ content: string; tags: string; highlight_id: string }>) => {
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
      fields.push("updated_at = datetime('now')")
      values.push(id)
      getDatabase()
        .prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values)
      return getDatabase().prepare('SELECT * FROM notes WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:notes:delete', (_e, id: string) => {
    return getDatabase().prepare('DELETE FROM notes WHERE id = ?').run(id)
  })

  // ─── Cross-book queries ─────────────────────────────
  ipcMain.handle('db:notes:getAll', () => {
    return getDatabase()
      .prepare(
        `SELECT n.*, h.text as highlight_text, h.color as highlight_color, h.cfi_range as highlight_cfi,
                b.title as book_title, b.author as book_author
         FROM notes n
         LEFT JOIN highlights h ON n.highlight_id = h.id
         LEFT JOIN books b ON n.book_id = b.id
         ORDER BY n.updated_at DESC`
      )
      .all()
  })

  ipcMain.handle('db:highlights:getAll', () => {
    return getDatabase()
      .prepare(
        `SELECT h.*, b.title as book_title, b.author as book_author
         FROM highlights h
         LEFT JOIN books b ON h.book_id = b.id
         ORDER BY h.created_at DESC`
      )
      .all()
  })

  // ─── Dashboard ───────────────────────────────────────
  ipcMain.handle('db:dashboard:currentlyReading', () => {
    return getDatabase()
      .prepare(
        `SELECT b.*, rp.percent_complete, rp.current_chapter,
          (SELECT SUM(s.active_ms) FROM sessions s WHERE s.book_id = b.id) as total_time_ms,
          (SELECT MAX(s.start_time) FROM sessions s WHERE s.book_id = b.id) as last_session_date
        FROM books b
        LEFT JOIN reading_progress rp ON rp.book_id = b.id
        WHERE rp.percent_complete IS NOT NULL AND rp.percent_complete > 0 AND rp.percent_complete < 100
        ORDER BY b.updated_at DESC`
      )
      .all()
  })

  ipcMain.handle('db:dashboard:recent', () => {
    return getDatabase()
      .prepare(
        `SELECT b.*, rp.percent_complete, rp.current_chapter
        FROM books b
        LEFT JOIN reading_progress rp ON rp.book_id = b.id
        ORDER BY b.updated_at DESC
        LIMIT 5`
      )
      .all()
  })

  ipcMain.handle('db:dashboard:metrics', () => {
    const db = getDatabase()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    ).toISOString()

    const minutesToday =
      (
        db
          .prepare(
            `SELECT COALESCE(SUM(active_ms), 0) as total FROM sessions WHERE start_time >= ?`
          )
          .get(todayStart) as { total: number }
      )?.total ?? 0

    const minutesThisWeek =
      (
        db
          .prepare(
            `SELECT COALESCE(SUM(active_ms), 0) as total FROM sessions WHERE start_time >= ?`
          )
          .get(weekStart) as { total: number }
      )?.total ?? 0

    const totalSessions =
      (
        db.prepare(`SELECT COUNT(*) as count FROM sessions`).get() as { count: number }
      )?.count ?? 0

    const totalWordsRead =
      (
        db
          .prepare(`SELECT COALESCE(SUM(words_read_estimate), 0) as total FROM sessions`)
          .get() as { total: number }
      )?.total ?? 0

    const totalActiveMs =
      (
        db
          .prepare(`SELECT COALESCE(SUM(active_ms), 0) as total FROM sessions`)
          .get() as { total: number }
      )?.total ?? 0

    // Calculate streak: consecutive days with sessions
    const dailySessions = db
      .prepare(
        `SELECT DISTINCT DATE(start_time) as day FROM sessions ORDER BY day DESC`
      )
      .all() as { day: string }[]

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < dailySessions.length; i++) {
      const sessionDate = new Date(dailySessions[i].day + 'T00:00:00')
      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() - i)
      expectedDate.setHours(0, 0, 0, 0)

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++
      } else if (i === 0) {
        // Allow the streak to start from yesterday
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        if (sessionDate.getTime() === yesterday.getTime()) {
          streak++
          // Re-adjust the loop offset
          today.setDate(today.getDate() - 1)
        } else {
          break
        }
      } else {
        break
      }
    }

    // Average WPM: total words / total minutes
    const totalMinutes = totalActiveMs / 60000
    const avgWpm = totalMinutes > 0 ? Math.round(totalWordsRead / totalMinutes) : 0

    return {
      minutesToday: Math.round(minutesToday / 60000),
      minutesThisWeek: Math.round(minutesThisWeek / 60000),
      streak,
      avgWpm,
      totalSessions,
      pagesPerHour:
        totalActiveMs > 0
          ? Math.round(
              ((totalWordsRead / 250) / (totalActiveMs / 3600000)) // 250 words per page
            )
          : 0
    }
  })

  // ─── Recap (Re-entry) ───────────────────────────────

  // Get books not read in N days (stale books) with recap info
  ipcMain.handle('db:recap:staleBooks', (_e, inactivityDays: number) => {
    const db = getDatabase()
    const cutoff = new Date(Date.now() - inactivityDays * 86400000).toISOString()

    return db
      .prepare(
        `SELECT b.*, rp.percent_complete, rp.current_chapter, rp.cfi_position,
          (SELECT SUM(s.active_ms) FROM sessions s WHERE s.book_id = b.id) as total_time_ms,
          (SELECT COUNT(*) FROM sessions s WHERE s.book_id = b.id) as total_sessions,
          (SELECT MAX(s.start_time) FROM sessions s WHERE s.book_id = b.id) as last_session_date
        FROM books b
        LEFT JOIN reading_progress rp ON rp.book_id = b.id
        WHERE rp.percent_complete IS NOT NULL AND rp.percent_complete > 0 AND rp.percent_complete < 100
          AND (
            (SELECT MAX(s.start_time) FROM sessions s WHERE s.book_id = b.id) IS NOT NULL
            AND (SELECT MAX(s.start_time) FROM sessions s WHERE s.book_id = b.id) < ?
          )
        ORDER BY b.updated_at DESC`
      )
      .all(cutoff)
  })

  // Get full recap data for a specific book
  ipcMain.handle('db:recap:getForBook', (_e, bookId: string) => {
    const db = getDatabase()

    const progress = db
      .prepare('SELECT * FROM reading_progress WHERE book_id = ?')
      .get(bookId) as { cfi_position: string | null; percent_complete: number; current_chapter: string | null } | undefined

    const highlights = db
      .prepare('SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at DESC LIMIT 3')
      .all(bookId)

    const notes = db
      .prepare(
        `SELECT n.*, h.text as highlight_text
         FROM notes n
         LEFT JOIN highlights h ON n.highlight_id = h.id
         WHERE n.book_id = ?
         ORDER BY n.created_at DESC LIMIT 3`
      )
      .all(bookId)

    const stats = db
      .prepare(
        `SELECT
          COALESCE(SUM(active_ms), 0) as total_time_ms,
          COUNT(*) as total_sessions,
          MAX(start_time) as last_session_date
        FROM sessions WHERE book_id = ?`
      )
      .get(bookId) as { total_time_ms: number; total_sessions: number; last_session_date: string | null }

    return {
      progress: progress ?? null,
      highlights,
      notes,
      stats
    }
  })

  // ─── Settings ────────────────────────────────────────
  ipcMain.handle('db:settings:get', (_e, key: string) => {
    const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  })

  ipcMain.handle('db:settings:getAll', () => {
    return getDatabase().prepare('SELECT * FROM settings').all()
  })

  ipcMain.handle('db:settings:set', (_e, key: string, value: string) => {
    getDatabase()
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(key, value)
    return { key, value }
  })

  ipcMain.handle('db:settings:delete', (_e, key: string) => {
    return getDatabase().prepare('DELETE FROM settings WHERE key = ?').run(key)
  })
}
