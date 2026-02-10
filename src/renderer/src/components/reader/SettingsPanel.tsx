import { ReadingSettings, FONT_FAMILIES } from '@/types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: ReadingSettings
  onUpdate: (patch: Partial<ReadingSettings>) => void
}

export function SettingsPanel({ isOpen, onClose, settings, onUpdate }: SettingsPanelProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-4 top-12 z-40 bg-white rounded-lg shadow-xl border border-gray-200 w-72 p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Reading Settings</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Font Size */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            Font Size
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdate({ fontSize: Math.max(12, settings.fontSize - 2) })}
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              A
            </button>
            <span className="text-sm text-gray-700 font-medium flex-1 text-center">
              {settings.fontSize}px
            </span>
            <button
              onClick={() => onUpdate({ fontSize: Math.min(32, settings.fontSize + 2) })}
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium"
            >
              A
            </button>
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            Font
          </label>
          <select
            value={settings.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            Line Height — {settings.lineHeight.toFixed(1)}
          </label>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={settings.lineHeight}
            onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>

        {/* Margins */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
            Margins — {settings.margin}px
          </label>
          <input
            type="range"
            min="20"
            max="120"
            step="10"
            value={settings.margin}
            onChange={(e) => onUpdate({ margin: parseInt(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
      </div>
    </>
  )
}
