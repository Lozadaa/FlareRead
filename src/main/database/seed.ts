import { randomUUID } from 'crypto'
import { getDatabase } from './index'

/**
 * Seeds the database with sample categories, tracks, and manual time entries.
 * Assigns existing books to categories if any exist.
 * This is intended for development/testing only.
 */
export function seedSampleData(): { success: boolean; summary: string } {
  const db = getDatabase()

  // Check if seed data already exists (by checking for our known category names)
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM categories WHERE name IN ('English', 'AI/Machine Learning', 'Philosophy')")
    .get() as { count: number }
  if (existing.count > 0) {
    return { success: false, summary: 'Seed data already exists. Delete existing categories first.' }
  }

  const now = new Date().toISOString()

  // ─── Categories ────────────────────────────────────
  const categories = [
    { id: randomUUID(), name: 'English', color: '#3b82f6', icon: '📘' },
    { id: randomUUID(), name: 'AI/Machine Learning', color: '#8b5cf6', icon: '🤖' },
    { id: randomUUID(), name: 'Philosophy', color: '#f59e0b', icon: '🏛️' }
  ]

  const insertCategory = db.prepare(
    'INSERT INTO categories (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)'
  )

  // ─── Tracks (one per category) ─────────────────────
  const tracks = [
    {
      id: randomUUID(),
      categoryId: categories[0].id, // English
      targetHoursTotal: 3000,
      weeklyTargetHours: 10,
      manualBaseHours: 120, // 120h already done outside the app
      notes: 'Long-term English reading mastery goal',
      sourceLabel: 'Self-study'
    },
    {
      id: randomUUID(),
      categoryId: categories[1].id, // AI/ML
      targetHoursTotal: 500,
      weeklyTargetHours: 8,
      manualBaseHours: 45,
      notes: 'Technical reading for AI and ML fundamentals',
      sourceLabel: 'Course material'
    },
    {
      id: randomUUID(),
      categoryId: categories[2].id, // Philosophy
      targetHoursTotal: 200,
      weeklyTargetHours: 3,
      manualBaseHours: 15,
      notes: 'Exploring Western and Eastern philosophy',
      sourceLabel: 'Personal interest'
    }
  ]

  const insertTrack = db.prepare(
    `INSERT INTO category_tracks (id, category_id, target_hours_total, weekly_target_hours, manual_base_hours, notes, source_label, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  // ─── Manual Time Entries (historical hours) ────────
  const manualEntries: Array<{
    id: string
    categoryId: string
    deltaMinutes: number
    occurredAt: string
    note: string
  }> = []

  // English: 30h spread over 3 entries
  manualEntries.push(
    { id: randomUUID(), categoryId: categories[0].id, deltaMinutes: 600, occurredAt: '2025-01-15T10:00:00.000Z', note: 'Read "Elements of Style" (offline)' },
    { id: randomUUID(), categoryId: categories[0].id, deltaMinutes: 900, occurredAt: '2025-02-10T14:00:00.000Z', note: 'Grammar workbook sessions' },
    { id: randomUUID(), categoryId: categories[0].id, deltaMinutes: 300, occurredAt: '2025-03-05T09:00:00.000Z', note: 'Vocabulary building exercises' }
  )

  // AI/ML: 15h spread over 2 entries
  manualEntries.push(
    { id: randomUUID(), categoryId: categories[1].id, deltaMinutes: 480, occurredAt: '2025-01-20T08:00:00.000Z', note: 'Read "Deep Learning" Ch.1-4 (physical book)' },
    { id: randomUUID(), categoryId: categories[1].id, deltaMinutes: 420, occurredAt: '2025-02-28T11:00:00.000Z', note: 'ML course reading materials' }
  )

  // Philosophy: 5h in 1 entry
  manualEntries.push(
    { id: randomUUID(), categoryId: categories[2].id, deltaMinutes: 300, occurredAt: '2025-03-01T16:00:00.000Z', note: 'Read "Meditations" introduction (borrowed copy)' }
  )

  const insertManualEntry = db.prepare(
    `INSERT INTO manual_time_entries (id, category_id, delta_minutes, occurred_at, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  // ─── Execute in transaction ────────────────────────
  const seed = db.transaction(() => {
    // Insert categories
    for (const cat of categories) {
      insertCategory.run(cat.id, cat.name, cat.color, cat.icon, now)
    }

    // Insert tracks
    for (const track of tracks) {
      insertTrack.run(
        track.id,
        track.categoryId,
        track.targetHoursTotal,
        track.weeklyTargetHours,
        track.manualBaseHours,
        track.notes,
        track.sourceLabel,
        now,
        now
      )
    }

    // Insert manual time entries
    for (const entry of manualEntries) {
      insertManualEntry.run(entry.id, entry.categoryId, entry.deltaMinutes, entry.occurredAt, entry.note, now)
    }

    // Assign existing books to categories (round-robin)
    const books = db.prepare('SELECT id FROM books WHERE category_id IS NULL').all() as Array<{ id: string }>
    if (books.length > 0) {
      const updateBook = db.prepare('UPDATE books SET category_id = ? WHERE id = ?')
      for (let i = 0; i < books.length; i++) {
        const cat = categories[i % categories.length]
        updateBook.run(cat.id, books[i].id)
      }
    }

    return books.length
  })

  const assignedBooks = seed()

  const summary = [
    `Created 3 categories: English, AI/Machine Learning, Philosophy`,
    `Created 3 tracks with targets: 3000h, 500h, 200h`,
    `Created ${manualEntries.length} manual time entries`,
    assignedBooks > 0 ? `Assigned ${assignedBooks} existing books to categories` : 'No existing books to assign'
  ].join('. ')

  return { success: true, summary }
}
