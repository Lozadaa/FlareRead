// ─── Shared types mirroring the desktop app data model ───
// Adapted for Firestore (Timestamps, cloud storage paths, no local file_path)

import { Timestamp } from 'firebase/firestore'

export type ReadingMode = 'study' | 'leisure' | null

// ─── Firestore Document Types ────────────────────────
// These represent the shape of documents stored in Firestore.
// Dates use Firestore Timestamp for proper querying/ordering.

export interface BookDoc {
  id: string
  title: string
  author: string | null
  coverStoragePath: string | null // Firebase Storage path for cover image
  epubStoragePath: string // Firebase Storage path for the EPUB file
  description: string | null
  language: string | null
  totalWordsEstimate: number | null
  categoryId: string | null
  readingMode: ReadingMode
  fileHash: string | null // SHA-256 hash for duplicate detection
  fileName: string | null // Original file name for duplicate detection
  // Reading progress stored directly on book document
  percentComplete: number
  cfiPosition: string | null
  currentChapter: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SessionDoc {
  id: string
  bookId: string
  startTime: Timestamp
  endTime: Timestamp | null
  activeMs: number
  pagesViewed: number
  wordsReadEstimate: number
  sessionType: string
  status: 'active' | 'completed' | 'abandoned'
  pomodoroWorkMin: number
  pomodoroBreakMin: number
  pomodoroEnabled: boolean
  completedPomodoros: number
  afkTimeoutMin: number
  totalAfkMs: number
  totalBreakMs: number
  highlightsDuring: number
  notesDuring: number
  createdAt: Timestamp
}

export interface HighlightDoc {
  id: string
  bookId: string
  cfiRange: string
  text: string
  color: string
  chapter: string | null
  createdAt: Timestamp
}

export interface NoteDoc {
  id: string
  highlightId: string | null
  bookId: string
  content: string
  tags: string[] // Array instead of JSON string for Firestore
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CategoryDoc {
  id: string
  name: string
  color: string | null
  icon: string | null
  createdAt: Timestamp
}

export interface CategoryTrackDoc {
  id: string
  categoryId: string
  targetHoursTotal: number | null
  weeklyTargetHours: number | null
  targetDeadline: Timestamp | null
  manualBaseHours: number | null
  notes: string | null
  sourceLabel: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ManualTimeEntryDoc {
  id: string
  categoryId: string
  deltaMinutes: number
  occurredAt: Timestamp
  note: string | null
  createdAt: Timestamp
}

export interface UserSettingsDoc {
  // Appearance
  fontSize: number
  fontFamily: string
  lineHeight: number
  margin: number
  contentWidth: number
  theme: 'light' | 'dark' | 'system'
  // Reading
  defaultFocusMode: 'study' | 'leisure'
  // Session
  defaultSessionMode: 'pomodoro' | 'free'
  workMin: number
  breakMin: number
  afkTimeoutMin: number
  microbreakIntervalMin: number
  // Soundscape
  defaultSoundscape: string | null
  autoPauseOnAfk: boolean
  // Meta
  updatedAt: Timestamp
  onboardingComplete: boolean
}

// ─── Frontend Display Types ──────────────────────────
// Convenience types for UI components (dates as strings).

export type ReadingMode_Legacy = ReadingMode

export interface Book {
  id: string
  title: string
  author: string | null
  cover_path: string | null
  description: string | null
  language: string | null
  total_words_estimate: number | null
  category_id: string | null
  reading_mode: ReadingMode
  created_at: string
  updated_at: string
}

export interface BookWithProgress extends Book {
  percent_complete: number | null
  current_chapter: string | null
  total_time_ms: number | null
  last_session_date: string | null
}

export interface ReadingProgress {
  book_id: string
  percent_complete: number
  current_chapter: string | null
}

export interface ReadingSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
  margin: number
  contentWidth: number
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'Literata, Georgia, serif',
  lineHeight: 1.8,
  margin: 40,
  contentWidth: 65
}

export interface DashboardMetrics {
  minutesToday: number
  minutesThisWeek: number
  streak: number
  avgWpm: number
  totalSessions: number
  pagesPerHour: number
}

// ─── Highlights & Notes ─────────────────────────────

export interface Highlight {
  id: string
  book_id: string
  text: string
  color: string
  chapter: string | null
  created_at: string
}

export interface Note {
  id: string
  highlight_id: string | null
  book_id: string
  content: string
  tags: string
  created_at: string
  updated_at: string
}

export interface NoteWithContext extends Note {
  highlight_text: string | null
  highlight_color: string | null
  book_title: string | null
  book_author: string | null
}

export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' }
] as const

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]['value']

// ─── Categories & Learning Tracks ──────────────────

export interface Category {
  id: string
  name: string
  color: string | null
  icon: string | null
  created_at: string
}

export interface CategoryTrack {
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
}

export interface ManualTimeEntry {
  id: string
  category_id: string
  delta_minutes: number
  occurred_at: string
  note: string | null
  created_at: string
}

export interface TrackProgress {
  activeMinutes: number
  manualMinutes: number
  manualBaseMinutes: number
  totalMinutes: number
  totalHours: number
  percentComplete: number
}

export interface TrackWithProgress extends CategoryTrack {
  category: Category
  progress: TrackProgress
}

// ─── Constants ──────────────────────────────────────

export const FONT_FAMILIES = [
  { label: 'Literata', value: 'Literata, Georgia, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Lora', value: 'Lora, Georgia, serif' },
  { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", Georgia, serif' },
  { label: 'System Sans', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
]
