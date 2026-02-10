import { useState, useEffect } from 'react'
import { Timer, Clock, Play, Monitor, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionStartConfig } from '@/types'

interface FocusWallSettings {
  enabled: boolean
  preset: 'minimal' | 'gradient' | 'monochrome' | 'illustration'
  showTitle: boolean
  showTimer: boolean
  showProgress: boolean
  showMetric: boolean
  metric: 'wpm' | 'pagesPerHour'
}

const PRESET_LABELS: Record<FocusWallSettings['preset'], string> = {
  minimal: 'Minimal',
  gradient: 'Gradient',
  monochrome: 'Monochrome',
  illustration: 'Illustration'
}

interface StartSessionDialogProps {
  bookId: string
  visible: boolean
  onStart: (config: SessionStartConfig) => void
  onCancel: () => void
}

export function StartSessionDialog({ bookId, visible, onStart, onCancel }: StartSessionDialogProps) {
  const [pomodoroEnabled, setPomodoroEnabled] = useState(true)
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [afkTimeoutMinutes, setAfkTimeoutMinutes] = useState(5)
  const [microbreakIntervalMinutes, setMicrobreakIntervalMinutes] = useState(20)
  const [fwExpanded, setFwExpanded] = useState(false)
  const [fwSettings, setFwSettings] = useState<FocusWallSettings>({
    enabled: true,
    preset: 'minimal',
    showTitle: true,
    showTimer: true,
    showProgress: true,
    showMetric: true,
    metric: 'wpm'
  })

  // Load focus wall settings and microbreak interval on mount
  useEffect(() => {
    if (visible) {
      if (window.appApi.getFocusWallSettings) {
        window.appApi.getFocusWallSettings().then((s) => {
          if (s) setFwSettings(s as FocusWallSettings)
        })
      }
      window.api.settings.get('session:microbreakInterval').then((val) => {
        if (val !== null) {
          const n = Number(val)
          if (!isNaN(n)) setMicrobreakIntervalMinutes(n)
        }
      })
    }
  }, [visible])

  if (!visible) return null

  const handleStart = () => {
    // Save focus wall settings before starting
    if (window.appApi.updateFocusWallSettings) {
      window.appApi.updateFocusWallSettings(fwSettings)
    }
    onStart({
      bookId,
      pomodoroEnabled,
      workMinutes,
      breakMinutes,
      afkTimeoutMinutes,
      microbreakIntervalMinutes
    })
  }

  const updateFw = (patch: Partial<FocusWallSettings>) => {
    setFwSettings((prev) => ({ ...prev, ...patch }))
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Timer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Start Study Session</h2>
            <p className="text-xs text-muted-foreground">Configure your focus session</p>
          </div>
        </div>

        {/* Pomodoro toggle */}
        <div className="space-y-4 mb-6">
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Pomodoro Mode</span>
            </div>
            <button
              onClick={() => setPomodoroEnabled(!pomodoroEnabled)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                pomodoroEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  pomodoroEnabled ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </label>

          {pomodoroEnabled && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Work interval
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={5}
                    value={workMinutes}
                    onChange={(e) => setWorkMinutes(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-sm font-medium text-foreground w-12 text-right tabular-nums">
                    {workMinutes}min
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Break interval
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-sm font-medium text-foreground w-12 text-right tabular-nums">
                    {breakMinutes}min
                  </span>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              AFK timeout
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={2}
                max={15}
                step={1}
                value={afkTimeoutMinutes}
                onChange={(e) => setAfkTimeoutMinutes(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-sm font-medium text-foreground w-12 text-right tabular-nums">
                {afkTimeoutMinutes}min
              </span>
            </div>
          </div>
        </div>

        {/* Focus Wall Settings */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
          <button
            onClick={() => setFwExpanded(!fwExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Focus Wall</span>
              <span className="text-xs text-muted-foreground">
                (secondary monitors)
              </span>
            </div>
            {fwExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {fwExpanded && (
            <div className="mt-3 space-y-3">
              {/* Enable toggle */}
              <label className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Enable Focus Wall</span>
                <button
                  onClick={() => updateFw({ enabled: !fwSettings.enabled })}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    fwSettings.enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      fwSettings.enabled ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </label>

              {fwSettings.enabled && (
                <>
                  {/* Preset selector */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Preset</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(PRESET_LABELS) as FocusWallSettings['preset'][]).map((p) => (
                        <button
                          key={p}
                          onClick={() => updateFw({ preset: p })}
                          className={`text-xs py-1.5 px-2 rounded-md border transition-colors ${
                            fwSettings.preset === p
                              ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-gray-400'
                          }`}
                        >
                          {PRESET_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle elements */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground block">Show on wall</label>
                    {([
                      ['showTitle', 'Book Title'],
                      ['showTimer', 'Timer'],
                      ['showProgress', 'Progress'],
                      ['showMetric', 'Metric']
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={fwSettings[key]}
                          onChange={(e) => updateFw({ [key]: e.target.checked })}
                          className="accent-violet-500 rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Metric selector */}
                  {fwSettings.showMetric && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Metric</label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateFw({ metric: 'wpm' })}
                          className={`text-xs py-1 px-3 rounded-md border transition-colors ${
                            fwSettings.metric === 'wpm'
                              ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-gray-400'
                          }`}
                        >
                          WPM
                        </button>
                        <button
                          onClick={() => updateFw({ metric: 'pagesPerHour' })}
                          className={`text-xs py-1 px-3 rounded-md border transition-colors ${
                            fwSettings.metric === 'pagesPerHour'
                              ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-gray-400'
                          }`}
                        >
                          Pages/hr
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleStart} className="flex-1 gap-2">
            <Play className="w-4 h-4" />
            Start
          </Button>
        </div>
      </div>
    </div>
  )
}
