import { useEffect } from 'react'
import type { ReaderSettings } from '@/hooks/useReadingSettings'
import type { ViewMode } from '@/hooks/useReader'
import { FONT_FAMILIES } from '@/types'

interface ReadingSettingsPanelProps {
  settings: ReaderSettings
  onUpdate: (partial: Partial<ReaderSettings>) => void
  onClose: () => void
}

export function ReadingSettingsPanel({ settings, onUpdate, onClose }: ReadingSettingsPanelProps) {
  // Prevent body scroll when bottom sheet is open on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 640
    if (isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [])

  const settingsContent = (
    <div className="p-4 space-y-5">
      {/* Font Family */}
      <div>
        <label className="block text-ui-xs font-body text-muted-foreground mb-1.5">Font</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-full h-10 sm:h-8 px-2 text-ui-sm font-body bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-ui-xs font-body text-muted-foreground">Size</label>
          <span className="text-ui-xs font-body text-foreground tabular-nums">{settings.fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ fontSize: Math.max(12, settings.fontSize - 1) })}
            className="w-11 h-11 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-sm"
          >
            A
          </button>
          <input
            type="range"
            min={12}
            max={32}
            value={settings.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            className="flex-1 h-1.5 accent-primary"
          />
          <button
            onClick={() => onUpdate({ fontSize: Math.min(32, settings.fontSize + 1) })}
            className="w-11 h-11 sm:w-7 sm:h-7 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-ui-base font-bold"
          >
            A
          </button>
        </div>
      </div>

      {/* Line Height */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-ui-xs font-body text-muted-foreground">Line Height</label>
          <span className="text-ui-xs font-body text-foreground tabular-nums">{settings.lineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={1.0}
          max={3.0}
          step={0.1}
          value={settings.lineHeight}
          onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
          className="w-full h-1.5 accent-primary"
        />
      </div>

      {/* Margins */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-ui-xs font-body text-muted-foreground">Margins</label>
          <span className="text-ui-xs font-body text-foreground tabular-nums">{settings.margin}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={120}
          step={10}
          value={settings.margin}
          onChange={(e) => onUpdate({ margin: Number(e.target.value) })}
          className="w-full h-1.5 accent-primary"
        />
      </div>

      {/* Content Width */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-ui-xs font-body text-muted-foreground">Content Width</label>
          <span className="text-ui-xs font-body text-foreground tabular-nums">{settings.contentWidth}ch</span>
        </div>
        <input
          type="range"
          min={40}
          max={120}
          step={5}
          value={settings.contentWidth}
          onChange={(e) => onUpdate({ contentWidth: Number(e.target.value) })}
          className="w-full h-1.5 accent-primary"
        />
      </div>

      {/* View Mode */}
      <div>
        <label className="block text-ui-xs font-body text-muted-foreground mb-1.5">Reading Mode</label>
        <div className="flex gap-1 p-0.5 bg-muted rounded-md">
          <ViewModeButton
            active={settings.viewMode === 'paginated'}
            onClick={() => onUpdate({ viewMode: 'paginated' as ViewMode })}
            label="Paginated"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
          <ViewModeButton
            active={settings.viewMode === 'scrolled'}
            onClick={() => onUpdate({ viewMode: 'scrolled' as ViewMode })}
            label="Scroll"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile: full-width bottom sheet */}
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {/* Sheet */}
        <div className="relative bg-card rounded-t-2xl shadow-lg max-h-[85vh] flex flex-col animate-fade-in">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-11 border-b border-border">
            <h3 className="text-ui-sm font-body font-medium text-foreground">Reading Settings</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain">
            {settingsContent}
          </div>
          {/* Safe area padding for iOS */}
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* Desktop: dropdown panel */}
      <div className="hidden sm:block w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border">
          <h3 className="text-ui-sm font-body font-medium text-foreground">Reading Settings</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {settingsContent}
      </div>
    </>
  )
}

function ViewModeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-ui-xs font-body font-medium
        transition-all
        ${active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}
