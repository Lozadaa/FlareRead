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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-card border border-border rounded-2xl shadow-[0_24px_80px_-12px_hsla(var(--primary),0.15)] p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsla(var(--primary), 0.1) 0%, hsla(var(--gold), 0.08) 100%)' }}
          >
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg italic text-foreground">Start Study Session</h2>
            <p className="text-ui-xs text-muted-foreground">Configure your focus session</p>
          </div>
        </div>

        {/* Pomodoro toggle */}
        <div className="space-y-4 mb-6">
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-ui-sm text-foreground">Pomodoro Mode</span>
            </div>
            <button
              onClick={() => setPomodoroEnabled(!pomodoroEnabled)}
              className={`relative w-10 h-[22px] rounded-full transition-all duration-300 ${
                pomodoroEnabled
                  ? 'bg-primary shadow-[0_0_8px_hsla(var(--primary),0.3)]'
                  : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  pomodoroEnabled ? 'translate-x-[18px]' : ''
                }`}
              />
            </button>
          </label>

          {pomodoroEnabled && (
            <>
              <SliderField
                label="Work interval"
                min={10}
                max={60}
                step={5}
                value={workMinutes}
                onChange={setWorkMinutes}
                unit="min"
                accentClass="accent-primary"
              />
              <SliderField
                label="Break interval"
                min={1}
                max={15}
                step={1}
                value={breakMinutes}
                onChange={setBreakMinutes}
                unit="min"
                accentClass="accent-gold"
              />
            </>
          )}

          <div>
            <label className="text-ui-sm text-muted-foreground mb-1 flex items-center gap-1">
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
                className="flex-1 h-1.5 rounded-full appearance-none bg-border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_6px_hsla(38,80%,55%,0.3)] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-ui-sm font-mono font-medium text-foreground w-12 text-right tabular-nums">
                {afkTimeoutMinutes}min
              </span>
            </div>
          </div>
        </div>

        {/* Focus Wall Settings */}
        <div className="border-t border-border pt-4 mb-6">
          <button
            onClick={() => setFwExpanded(!fwExpanded)}
            className="flex items-center justify-between w-full text-left group"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
              <span className="text-ui-sm text-foreground">Focus Wall</span>
              <span className="text-ui-xs text-muted-foreground">
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
                <span className="text-ui-sm text-muted-foreground">Enable Focus Wall</span>
                <button
                  onClick={() => updateFw({ enabled: !fwSettings.enabled })}
                  className={`relative w-10 h-[22px] rounded-full transition-all duration-300 ${
                    fwSettings.enabled
                      ? 'bg-primary shadow-[0_0_8px_hsla(var(--primary),0.3)]'
                      : 'bg-border'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      fwSettings.enabled ? 'translate-x-[18px]' : ''
                    }`}
                  />
                </button>
              </label>

              {fwSettings.enabled && (
                <>
                  {/* Preset selector */}
                  <div>
                    <label className="text-ui-sm text-muted-foreground mb-1.5 block">Preset</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(PRESET_LABELS) as FocusWallSettings['preset'][]).map((p) => (
                        <button
                          key={p}
                          onClick={() => updateFw({ preset: p })}
                          className={`text-ui-xs py-1.5 px-2 rounded-lg border transition-all duration-200 btn-press ${
                            fwSettings.preset === p
                              ? 'border-primary/40 bg-primary/[0.06] text-primary font-medium shadow-[0_0_8px_hsla(var(--primary),0.1)]'
                              : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
                          }`}
                        >
                          {PRESET_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle elements */}
                  <div className="space-y-2">
                    <label className="text-ui-sm text-muted-foreground block">Show on wall</label>
                    {([
                      ['showTitle', 'Book Title'],
                      ['showTimer', 'Timer'],
                      ['showProgress', 'Progress'],
                      ['showMetric', 'Metric']
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-ui-sm text-foreground cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${
                          fwSettings[key]
                            ? 'bg-primary border-primary'
                            : 'border-border group-hover:border-primary/40'
                        }`}>
                          {fwSettings[key] && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={fwSettings[key]}
                          onChange={(e) => updateFw({ [key]: e.target.checked })}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Metric selector */}
                  {fwSettings.showMetric && (
                    <div>
                      <label className="text-ui-sm text-muted-foreground mb-1.5 block">Metric</label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateFw({ metric: 'wpm' })}
                          className={`text-ui-xs py-1 px-3 rounded-lg border transition-all duration-200 btn-press ${
                            fwSettings.metric === 'wpm'
                              ? 'border-primary/40 bg-primary/[0.06] text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/20'
                          }`}
                        >
                          WPM
                        </button>
                        <button
                          onClick={() => updateFw({ metric: 'pagesPerHour' })}
                          className={`text-ui-xs py-1 px-3 rounded-lg border transition-all duration-200 btn-press ${
                            fwSettings.metric === 'pagesPerHour'
                              ? 'border-primary/40 bg-primary/[0.06] text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/20'
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
          <Button variant="outline" onClick={onCancel} className="flex-1 btn-press">
            Cancel
          </Button>
          <Button onClick={handleStart} className="flex-1 gap-2 btn-press">
            <Play className="w-4 h-4" />
            Start
          </Button>
        </div>
      </div>
    </div>
  )
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
  accentClass: _accentClass
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  unit: string
  accentClass: string
}) {
  return (
    <div>
      <label className="text-ui-sm text-muted-foreground mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none bg-border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_6px_hsla(var(--primary),0.3)] [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-ui-sm font-mono font-medium text-foreground w-12 text-right tabular-nums">
          {value}{unit}
        </span>
      </div>
    </div>
  )
}
