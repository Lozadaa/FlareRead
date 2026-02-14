import { useState, useRef, useCallback, type DragEvent } from 'react'
import type { CategoryDoc, ReadingMode } from '@/types'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  categories: CategoryDoc[]
  uploading: boolean
  uploadProgress: string | null
  onImport: (file: File, categoryId: string | null, readingMode: ReadingMode) => Promise<void>
}

export function ImportDialog({
  open,
  onClose,
  categories,
  uploading,
  uploadProgress,
  onImport,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [readingMode, setReadingMode] = useState<ReadingMode>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setCategoryId(null)
    setReadingMode(null)
    setError(null)
    setDragOver(false)
  }, [])

  const handleClose = useCallback(() => {
    if (uploading) return
    reset()
    onClose()
  }, [uploading, reset, onClose])

  const validateFile = (f: File): boolean => {
    if (!f.name.toLowerCase().endsWith('.epub')) {
      setError('Only EPUB files are supported')
      return false
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('File size must be under 100MB')
      return false
    }
    setError(null)
    return true
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && validateFile(f)) {
      setFile(f)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const f = e.dataTransfer.files[0]
    if (f && validateFile(f)) {
      setFile(f)
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    try {
      setError(null)
      await onImport(file, categoryId, readingMode)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-lg shadow-xl border border-border animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h3 className="text-lg font-display font-semibold text-foreground">
            Import Book
          </h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Drop zone / File picker */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3 p-8
                border-2 border-dashed rounded-lg cursor-pointer transition-all
                ${dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border hover:border-muted-foreground/40 hover:bg-accent/50'
                }
              `}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-primary/10' : 'bg-muted'}`}>
                <svg className={`w-6 h-6 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-ui-sm font-body font-medium text-foreground">
                  Drop your EPUB here or <span className="text-primary">browse</span>
                </p>
                <p className="text-ui-xs text-muted-foreground mt-1">
                  EPUB files only, up to 100MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".epub"
                onChange={handleFilePick}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg border border-border">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ui-sm font-body font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-ui-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={() => setFile(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Category selection */}
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1.5">
              Category
            </label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              disabled={uploading}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-ui-sm font-body text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reading mode */}
          <div>
            <label className="block text-ui-sm font-body font-medium text-foreground mb-1.5">
              Reading mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([null, 'study', 'leisure'] as const).map((mode) => {
                const isSelected = readingMode === mode
                const labels: Record<string, string> = {
                  '': 'None',
                  study: 'Study',
                  leisure: 'Leisure',
                }
                const icons: Record<string, string> = {
                  '': 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z',
                  study: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
                  leisure: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
                }
                const key = mode ?? ''
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={uploading}
                    onClick={() => setReadingMode(mode)}
                    className={`
                      flex flex-col items-center gap-1.5 rounded-md border px-3 py-2.5
                      text-ui-sm font-body transition-all
                      ${isSelected
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-input text-muted-foreground hover:border-muted-foreground/40 hover:bg-accent/50'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icons[key]} />
                    </svg>
                    {labels[key]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-ui-sm font-body">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {error}
            </div>
          )}

          {/* Upload progress */}
          {uploading && uploadProgress && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 text-primary text-ui-sm font-body">
              <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {uploadProgress}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 rounded-md text-ui-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="px-4 py-2 rounded-md text-ui-sm font-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
