import { useState, useCallback } from 'react'
import {
  BookOpen,
  Sun,
  Moon,
  Monitor,
  Timer,
  Volume2,
  Coffee,
  Eye,
  ArrowRight,
  ArrowLeft,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeMode } from '@/components/ThemeProvider'
import { type AppSettings, DEFAULT_APP_SETTINGS } from '@/hooks/useSettings'

// ─── Types ──────────────────────────────────────────

interface FirstRunWizardProps {
  onComplete: (choices: Partial<AppSettings>) => void
  onSkip: () => void
}

interface WizardChoices {
  theme: ThemeMode
  focusMode: 'pomodoro' | 'free'
  autoFullscreen: boolean
  enableSoundscapes: boolean
  defaultSound: string
  enableMicrobreaks: boolean
  microbreakInterval: number
  afkDetection: boolean
  afkTimeoutMinutes: number
}

const DEFAULT_CHOICES: WizardChoices = {
  theme: 'system',
  focusMode: 'pomodoro',
  autoFullscreen: false,
  enableSoundscapes: false,
  defaultSound: 'none',
  enableMicrobreaks: false,
  microbreakInterval: 15,
  afkDetection: true,
  afkTimeoutMinutes: 5
}

// ─── Component ──────────────────────────────────────

export function FirstRunWizard({ onComplete, onSkip }: FirstRunWizardProps): JSX.Element {
  const [step, setStep] = useState(0)
  const [choices, setChoices] = useState<WizardChoices>(DEFAULT_CHOICES)
  const { setTheme: applyTheme } = useTheme()

  const TOTAL_STEPS = 4 // welcome, focus, soundscapes, AFK

  const updateChoice = useCallback(<K extends keyof WizardChoices>(key: K, value: WizardChoices[K]) => {
    setChoices((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleComplete = useCallback(() => {
    const patch: Partial<AppSettings> = {
      'appearance:theme': choices.theme,
      'reading:defaultFocusMode': choices.focusMode,
      'reading:autoFullscreen': choices.autoFullscreen,
      'soundscape:defaultSound': choices.enableSoundscapes ? choices.defaultSound : 'none',
      'soundscape:autoPauseOnAfk': true,
      'session:microbreakInterval': choices.enableMicrobreaks ? choices.microbreakInterval : 0,
      'session:afkTimeoutMinutes': choices.afkDetection ? choices.afkTimeoutMinutes : 0,
      'wizard:completed': true
    }
    applyTheme(choices.theme)
    onComplete(patch)
  }, [choices, onComplete, applyTheme])

  const handleSkip = useCallback(() => {
    // Apply defaults and mark wizard complete
    applyTheme(DEFAULT_APP_SETTINGS['appearance:theme'])
    onSkip()
  }, [onSkip, applyTheme])

  const next = (): void => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  const prev = (): void => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="w-full max-w-lg mx-4">
        {/* Skip button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground gap-1">
            <X className="h-4 w-4" />
            Skip setup
          </Button>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Progress */}
          <div className="flex gap-1 px-6 pt-5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  i <= step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-6 py-6 min-h-[320px] flex flex-col">
            {step === 0 && <WelcomeStep choices={choices} updateChoice={updateChoice} applyTheme={applyTheme} />}
            {step === 1 && <FocusBehaviorStep choices={choices} updateChoice={updateChoice} />}
            {step === 2 && <SoundscapeStep choices={choices} updateChoice={updateChoice} />}
            {step === 3 && <AfkStep choices={choices} updateChoice={updateChoice} />}
          </div>

          <Separator />

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-muted-foreground">
                {step + 1} of {TOTAL_STEPS}
              </span>
              {step < TOTAL_STEPS - 1 ? (
                <Button size="sm" onClick={next} className="gap-1">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleComplete} className="gap-1">
                  <Check className="h-4 w-4" />
                  Get started
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-ui-xs text-muted-foreground mt-4">
          All choices can be changed later in Settings (Ctrl+,)
        </p>
      </div>
    </div>
  )
}

// ─── Shared ─────────────────────────────────────────

function OptionCard({ selected, onClick, icon: Icon, title, description }: {
  selected: boolean
  onClick: () => void
  icon: typeof Timer
  title: string
  description: string
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors w-full',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-primary/40 bg-background'
      )}
    >
      <div className={cn(
        'mt-0.5 h-8 w-8 rounded-md flex items-center justify-center shrink-0',
        selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-ui-sm font-medium text-foreground">{title}</p>
        <p className="text-ui-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {selected && (
        <div className="ml-auto shrink-0 mt-1">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </button>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center justify-between gap-4 p-3 rounded-lg border w-full text-left transition-colors',
        checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
      )}
    >
      <div className="min-w-0">
        <p className="text-ui-sm font-medium text-foreground">{label}</p>
        <p className="text-ui-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-input'
      )}>
        <span className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
        )} />
      </div>
    </button>
  )
}

// ─── Steps ──────────────────────────────────────────

function WelcomeStep({ choices, updateChoice, applyTheme }: {
  choices: WizardChoices
  updateChoice: <K extends keyof WizardChoices>(key: K, value: WizardChoices[K]) => void
  applyTheme: (mode: ThemeMode) => void
}): JSX.Element {
  const handleTheme = (mode: ThemeMode): void => {
    updateChoice('theme', mode)
    applyTheme(mode)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Welcome to JustRead</h2>
          <p className="text-ui-sm text-muted-foreground">Let's set up your reading environment</p>
        </div>
      </div>

      <Separator className="my-4" />

      <p className="text-ui-sm text-muted-foreground mb-3">Choose your preferred theme:</p>

      <div className="grid grid-cols-3 gap-2">
        {([
          { mode: 'light' as ThemeMode, icon: Sun, label: 'Light' },
          { mode: 'dark' as ThemeMode, icon: Moon, label: 'Dark' },
          { mode: 'system' as ThemeMode, icon: Monitor, label: 'System' }
        ]).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleTheme(mode)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
              choices.theme === mode
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-primary/40'
            )}
          >
            <Icon className={cn('h-6 w-6', choices.theme === mode ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-ui-sm font-medium', choices.theme === mode ? 'text-primary' : 'text-foreground')}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <p className="text-ui-xs text-muted-foreground text-center mt-4">
        Tip: You can import your first book from the Library after setup
      </p>
    </div>
  )
}

function FocusBehaviorStep({ choices, updateChoice }: {
  choices: WizardChoices
  updateChoice: <K extends keyof WizardChoices>(key: K, value: WizardChoices[K]) => void
}): JSX.Element {
  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-1">Focus behavior</h2>
      <p className="text-ui-sm text-muted-foreground mb-4">How do you prefer to read?</p>

      <div className="space-y-2">
        <OptionCard
          selected={choices.focusMode === 'pomodoro'}
          onClick={() => updateChoice('focusMode', 'pomodoro')}
          icon={Timer}
          title="Pomodoro sessions"
          description="Timed work/break cycles (25 min focus, 5 min break by default)"
        />
        <OptionCard
          selected={choices.focusMode === 'free'}
          onClick={() => updateChoice('focusMode', 'free')}
          icon={BookOpen}
          title="Free reading"
          description="Read at your own pace without time constraints"
        />
      </div>

      <Separator className="my-4" />

      <ToggleRow
        label="Auto-fullscreen on session"
        description="Automatically enter fullscreen when you start a reading session"
        checked={choices.autoFullscreen}
        onChange={(v) => updateChoice('autoFullscreen', v)}
      />
    </div>
  )
}

function SoundscapeStep({ choices, updateChoice }: {
  choices: WizardChoices
  updateChoice: <K extends keyof WizardChoices>(key: K, value: WizardChoices[K]) => void
}): JSX.Element {
  const soundOptions = [
    { value: 'rain', label: 'Rain' },
    { value: 'fireplace', label: 'Fireplace' },
    { value: 'coffeeshop', label: 'Coffee Shop' },
    { value: 'forest', label: 'Forest' },
    { value: 'whitenoise', label: 'White Noise' }
  ]

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-1">Soundscapes</h2>
      <p className="text-ui-sm text-muted-foreground mb-4">Ambient sounds can help you focus while reading</p>

      <ToggleRow
        label="Enable soundscapes"
        description="Play ambient sounds during reading sessions"
        checked={choices.enableSoundscapes}
        onChange={(v) => {
          updateChoice('enableSoundscapes', v)
          if (v && choices.defaultSound === 'none') {
            updateChoice('defaultSound', 'rain')
          }
        }}
      />

      {choices.enableSoundscapes && (
        <div className="mt-3 space-y-2">
          <p className="text-ui-sm text-muted-foreground">Choose a default sound:</p>
          <div className="grid grid-cols-2 gap-2">
            {soundOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateChoice('defaultSound', opt.value)}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors',
                  choices.defaultSound === opt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <Volume2 className={cn(
                  'h-4 w-4',
                  choices.defaultSound === opt.value ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className="text-ui-sm text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AfkStep({ choices, updateChoice }: {
  choices: WizardChoices
  updateChoice: <K extends keyof WizardChoices>(key: K, value: WizardChoices[K]) => void
}): JSX.Element {
  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-1">Breaks & AFK detection</h2>
      <p className="text-ui-sm text-muted-foreground mb-4">Stay healthy and track active reading time</p>

      <div className="space-y-2">
        <ToggleRow
          label="Enable microbreaks"
          description="Get reminded to take short breaks during long sessions"
          checked={choices.enableMicrobreaks}
          onChange={(v) => updateChoice('enableMicrobreaks', v)}
        />

        {choices.enableMicrobreaks && (
          <div className="pl-4 flex items-center gap-2 py-1">
            <span className="text-ui-sm text-muted-foreground">Every</span>
            <select
              value={choices.microbreakInterval}
              onChange={(e) => updateChoice('microbreakInterval', Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-ui-sm text-foreground"
            >
              {[10, 15, 20, 25, 30].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <span className="text-ui-sm text-muted-foreground">minutes</span>
          </div>
        )}

        <Separator className="my-1" />

        <ToggleRow
          label="AFK detection"
          description="Pause tracking when you step away from your computer"
          checked={choices.afkDetection}
          onChange={(v) => updateChoice('afkDetection', v)}
        />

        {choices.afkDetection && (
          <div className="pl-4 flex items-center gap-2 py-1">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-ui-sm text-muted-foreground">Detect after</span>
            <select
              value={choices.afkTimeoutMinutes}
              onChange={(e) => updateChoice('afkTimeoutMinutes', Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-ui-sm text-foreground"
            >
              {[2, 3, 5, 10].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <span className="text-ui-sm text-muted-foreground">minutes</span>
          </div>
        )}
      </div>
    </div>
  )
}
