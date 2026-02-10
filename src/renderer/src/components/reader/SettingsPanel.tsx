import { ReadingSettings, FONT_FAMILIES } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: ReadingSettings
  onUpdate: (patch: Partial<ReadingSettings>) => void
}

export function SettingsPanel({ isOpen, onClose, settings, onUpdate }: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="absolute right-4 top-1 z-40 bg-card/95 backdrop-blur-xl rounded-lg shadow-xl border border-border w-72 p-4 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display italic text-foreground text-sm">Reading Settings</h3>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                aria-label="Close settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Reading Mode */}
            <div>
              <label className="text-ui-sm font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Reading Mode
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => onUpdate({ scrollMode: false })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                    !settings.scrollMode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Paginated
                </button>
                <button
                  onClick={() => onUpdate({ scrollMode: true })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                    settings.scrollMode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
                  </svg>
                  Scroll
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-ui-sm font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Font Size
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdate({ fontSize: Math.max(12, settings.fontSize - 2) })}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-sm font-medium"
                >
                  A
                </button>
                <span className="text-sm text-foreground font-medium flex-1 text-center tabular-nums">
                  {settings.fontSize}px
                </span>
                <button
                  onClick={() => onUpdate({ fontSize: Math.min(32, settings.fontSize + 2) })}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-lg font-medium"
                >
                  A
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="text-ui-sm font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Font
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Height */}
            <div>
              <label className="text-ui-sm font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Line Height — <span className="text-foreground">{settings.lineHeight.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Content Width */}
            <div>
              <label className="text-ui-sm font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Content Width — <span className="text-foreground">{settings.contentWidth}%</span>
              </label>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={settings.contentWidth}
                onChange={(e) => onUpdate({ contentWidth: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Margins */}
            <div>
              <label className="text-ui-sm font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Margins — <span className="text-foreground">{settings.margin}px</span>
              </label>
              <input
                type="range"
                min="20"
                max="120"
                step="10"
                value={settings.margin}
                onChange={(e) => onUpdate({ margin: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
