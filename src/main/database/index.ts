import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { createTables } from './schema'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'justread.db')
  console.log('Database path:', dbPath)

  db = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create initial schema
  createTables(db)

  // Run any pending migrations
  runMigrations(db)

  console.log('Database initialized successfully')
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database closed')
  }
}
