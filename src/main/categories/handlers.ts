import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDatabase } from '../database'

export function registerCategoryHandlers(): void {
  // ─── Categories ─────────────────────────────────────

  ipcMain.handle('db:categories:getAll', () => {
    return getDatabase().prepare('SELECT * FROM categories ORDER BY name ASC').all()
  })

  ipcMain.handle('db:categories:getById', (_e, id: string) => {
    return getDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(id)
  })

  ipcMain.handle(
    'db:categories:create',
    (_e, data: { name: string; color?: string; icon?: string }) => {
      const id = randomUUID()
      const now = new Date().toISOString()
      getDatabase()
        .prepare(
          `INSERT INTO categories (id, name, color, icon, created_at)
         VALUES (?, ?, ?, ?, ?)`
        )
        .run(id, data.name, data.color ?? null, data.icon ?? null, now)
      return getDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'db:categories:update',
    (_e, id: string, data: Partial<{ name: string; color: string; icon: string }>) => {
      const fields: string[] = []
      const values: unknown[] = []
      for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
      if (fields.length === 0) {
        return getDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(id)
      }
      values.push(id)
      getDatabase()
        .prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values)
      return getDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('db:categories:delete', (_e, id: string) => {
    const db = getDatabase()
    // Set books.category_id to NULL for books in this category
    db.prepare('UPDATE books SET category_id = NULL WHERE category_id = ?').run(id)
    // category_tracks and manual_time_entries cascade via ON DELETE CASCADE
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return { success: true }
  })

  // ─── Learning Tracks ────────────────────────────────

  ipcMain.handle('db:tracks:getByCategory', (_e, categoryId: string) => {
    return getDatabase()
      .prepare('SELECT * FROM category_tracks WHERE category_id = ?')
      .get(categoryId)
  })

  ipcMain.handle(
    'db:tracks:upsert',
    (
      _e,
      data: {
        categoryId: string
        targetHoursTotal?: number
        weeklyTargetHours?: number
        targetDeadline?: string
        manualBaseHours?: number
        notes?: string
        sourceLabel?: string
      }
    ) => {
      const db = getDatabase()
      const existing = db
        .prepare('SELECT id FROM category_tracks WHERE category_id = ?')
        .get(data.categoryId) as { id: string } | undefined

      if (existing) {
        const now = new Date().toISOString()
        db.prepare(
          `UPDATE category_tracks SET
            target_hours_total = ?,
            weekly_target_hours = ?,
            target_deadline = ?,
            manual_base_hours = ?,
            notes = ?,
            source_label = ?,
            updated_at = ?
          WHERE category_id = ?`
        ).run(
          data.targetHoursTotal ?? null,
          data.weeklyTargetHours ?? null,
          data.targetDeadline ?? null,
          data.manualBaseHours ?? 0,
          data.notes ?? null,
          data.sourceLabel ?? null,
          now,
          data.categoryId
        )
        return db.prepare('SELECT * FROM category_tracks WHERE category_id = ?').get(data.categoryId)
      } else {
        const id = randomUUID()
        const now = new Date().toISOString()
        db.prepare(
          `INSERT INTO category_tracks (id, category_id, target_hours_total, weekly_target_hours, target_deadline, manual_base_hours, notes, source_label, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          data.categoryId,
          data.targetHoursTotal ?? null,
          data.weeklyTargetHours ?? null,
          data.targetDeadline ?? null,
          data.manualBaseHours ?? 0,
          data.notes ?? null,
          data.sourceLabel ?? null,
          now,
          now
        )
        return db.prepare('SELECT * FROM category_tracks WHERE id = ?').get(id)
      }
    }
  )

  ipcMain.handle('db:tracks:delete', (_e, categoryId: string) => {
    return getDatabase()
      .prepare('DELETE FROM category_tracks WHERE category_id = ?')
      .run(categoryId)
  })

  ipcMain.handle('db:tracks:computeProgress', (_e, categoryId: string) => {
    return computeTrackProgress(categoryId)
  })

  ipcMain.handle('db:tracks:getTopForDashboard', (_e, limit?: number) => {
    const db = getDatabase()
    const effectiveLimit = limit ?? 3
    const tracks = db
      .prepare('SELECT * FROM category_tracks ORDER BY created_at ASC')
      .all() as Array<{
      id: string
      category_id: string
      target_hours_total: number | null
      weekly_target_hours: number | null
      target_deadline: string | null
      manual_base_hours: number | null
      notes: string | null
      source_label: string | null
      created_at: string
      updated_at: string
    }>

    const results: Array<Record<string, unknown>> = []
    for (const track of tracks) {
      const progress = computeTrackProgress(track.category_id)
      const category = db
        .prepare('SELECT * FROM categories WHERE id = ?')
        .get(track.category_id)
      results.push({
        ...track,
        category,
        progress
      })
    }

    // Sort by percentComplete descending
    results.sort((a, b) => {
      const aP = (a.progress as { percentComplete: number }).percentComplete
      const bP = (b.progress as { percentComplete: number }).percentComplete
      return bP - aP
    })

    return results.slice(0, effectiveLimit)
  })

  ipcMain.handle('db:tracks:getAll', () => {
    const db = getDatabase()
    const tracks = db
      .prepare('SELECT * FROM category_tracks ORDER BY created_at ASC')
      .all() as Array<{
      id: string
      category_id: string
      target_hours_total: number | null
      weekly_target_hours: number | null
      target_deadline: string | null
      manual_base_hours: number | null
      notes: string | null
      source_label: string | null
      created_at: string
      updated_at: string
    }>

    return tracks.map((track) => {
      const category = db
        .prepare('SELECT * FROM categories WHERE id = ?')
        .get(track.category_id)
      const progress = computeTrackProgress(track.category_id)
      return {
        ...track,
        category,
        progress
      }
    })
  })

  // ─── Manual Time Entries ────────────────────────────

  ipcMain.handle(
    'db:manual-time:add',
    (
      _e,
      data: {
        categoryId: string
        deltaMinutes: number
        occurredAt: string
        note?: string
      }
    ) => {
      const id = randomUUID()
      const now = new Date().toISOString()
      getDatabase()
        .prepare(
          `INSERT INTO manual_time_entries (id, category_id, delta_minutes, occurred_at, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(id, data.categoryId, data.deltaMinutes, data.occurredAt, data.note ?? null, now)
      return getDatabase().prepare('SELECT * FROM manual_time_entries WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'db:manual-time:getRecent',
    (_e, categoryId: string, limit?: number) => {
      const effectiveLimit = limit ?? 10
      return getDatabase()
        .prepare(
          `SELECT * FROM manual_time_entries WHERE category_id = ? ORDER BY occurred_at DESC LIMIT ?`
        )
        .all(categoryId, effectiveLimit)
    }
  )
}

// ─── Helper ─────────────────────────────────────────

function computeTrackProgress(categoryId: string): {
  activeMinutes: number
  manualMinutes: number
  manualBaseMinutes: number
  totalMinutes: number
  totalHours: number
  percentComplete: number
} {
  const db = getDatabase()

  // activeMinutes = SUM(sessions.active_ms) / 60000 WHERE book.category_id = categoryId
  const activeRow = db
    .prepare(
      `SELECT COALESCE(SUM(s.active_ms), 0) as total
       FROM sessions s
       INNER JOIN books b ON s.book_id = b.id
       WHERE b.category_id = ?`
    )
    .get(categoryId) as { total: number }
  const activeMinutes = activeRow.total / 60000

  // manualMinutes = SUM(manual_time_entries.delta_minutes) WHERE category_id = categoryId
  const manualRow = db
    .prepare(
      `SELECT COALESCE(SUM(delta_minutes), 0) as total
       FROM manual_time_entries
       WHERE category_id = ?`
    )
    .get(categoryId) as { total: number }
  const manualMinutes = manualRow.total

  // manualBaseMinutes = track.manual_base_hours * 60
  const track = db
    .prepare('SELECT manual_base_hours FROM category_tracks WHERE category_id = ?')
    .get(categoryId) as { manual_base_hours: number | null } | undefined
  const manualBaseMinutes = (track?.manual_base_hours ?? 0) * 60

  const totalMinutes = activeMinutes + manualMinutes + manualBaseMinutes
  const totalHours = totalMinutes / 60

  // percentComplete based on target_hours_total
  const trackFull = db
    .prepare('SELECT target_hours_total FROM category_tracks WHERE category_id = ?')
    .get(categoryId) as { target_hours_total: number | null } | undefined
  const targetHours = trackFull?.target_hours_total ?? 0
  const percentComplete = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0

  return {
    activeMinutes: Math.round(activeMinutes * 100) / 100,
    manualMinutes,
    manualBaseMinutes,
    totalMinutes: Math.round(totalMinutes * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    percentComplete: Math.round(percentComplete * 100) / 100
  }
}
