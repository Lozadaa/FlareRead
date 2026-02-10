export type ReadingMode = 'study' | 'leisure' | null

export interface Book {
  id: string
  title: string
  author: string | null
  cover_path: string | null
  file_path: string
  original_path: string | null
  description: string | null
  language: string | null
  total_words_estimate: number | null
  category_id: string | null
  reading_mode: ReadingMode
  created_at: string
  updated_at: string
}

export interface ImportResult {
  success: true
  book: Book
}

export interface ImportError {
  success: false
  error: string
  code: 'INVALID_EPUB' | 'DUPLICATE' | 'FILE_NOT_FOUND' | 'UNKNOWN'
}

export type ImportResponse = ImportResult | ImportError | null

export interface ParsedEpubMeta {
  filePath: string
  title: string
  author: string | null
  description: string | null
  language: string | null
  estimatedWordCount: number
  hasCover: boolean
}

export interface ReadingProgress {
  book_id: string
  cfi_position: string | null
  percent_complete: number
  current_chapter: string | null
}

export interface TocItem {
  id: string
  href: string
  label: string
  subitems?: TocItem[]
}

export interface ReadingSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
  margin: number
  scrollMode: boolean
  contentWidth: number
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'Literata, Georgia, serif',
  lineHeight: 1.8,
  margin: 40,
  scrollMode: false,
  contentWidth: 65
}

export interface BookWithProgress extends Book {
  percent_complete: number | null
  current_chapter: string | null
  total_time_ms: number | null
  last_session_date: string | null
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
  cfi_range: string
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
  tags: string // JSON array string e.g. '["tag1","tag2"]'
  created_at: string
  updated_at: string
}

export interface NoteWithContext extends Note {
  highlight_text: string | null
  highlight_color: string | null
  highlight_cfi: string | null
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

// ─── Study Session ──────────────────────────────────

export type SessionState = 'running' | 'paused_afk' | 'break' | 'completed'

export interface SessionSnapshot {
  sessionId: string
  bookId: string
  state: SessionState
  activeMs: number
  timerSeconds: number
  pomodoroRemainingSeconds: number
  pomodoroEnabled: boolean
  workMinutes: number
  breakMinutes: number
  completedPomodoros: number
  afkTimeoutMinutes: number
  totalAfkMs: number
  totalBreakMs: number
  highlightsDuring: number
  notesDuring: number
  startTime: string
  microbreakDue: boolean
  microbreakActive: boolean
  totalMicrobreakMs: number
  microbreakIntervalMinutes: number
}

export interface SessionWrapUpData {
  snapshot: SessionSnapshot
  topHighlights: Array<{ id: string; text: string; color: string; cfi_range: string }>
}

export interface SessionStartConfig {
  bookId: string
  pomodoroEnabled?: boolean
  workMinutes?: number
  breakMinutes?: number
  afkTimeoutMinutes?: number
  microbreakIntervalMinutes?: number
}

// ─── Re-entry Recap ─────────────────────────────────

export interface StaleBook extends BookWithProgress {
  cfi_position: string | null
  total_sessions: number
}

export interface RecapData {
  progress: {
    cfi_position: string | null
    percent_complete: number
    current_chapter: string | null
  } | null
  highlights: Highlight[]
  notes: Array<Note & { highlight_text: string | null }>
  stats: {
    total_time_ms: number
    total_sessions: number
    last_session_date: string | null
  }
}

export const DEFAULT_INACTIVITY_DAYS = 3

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

export interface ManualTimeEntry {
  id: string
  category_id: string
  delta_minutes: number
  occurred_at: string
  note: string | null
  created_at: string
}

export const FONT_FAMILIES = [
  { label: 'Literata', value: 'Literata, Georgia, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Lora', value: 'Lora, Georgia, serif' },
  { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", Georgia, serif' },
  { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'System Sans', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
]
